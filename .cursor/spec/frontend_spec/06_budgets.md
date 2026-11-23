# 06 — Budgets

Read `00_frontend_overview.md` and `frontend_design_theme.md` first. Follow the patterns of `02_expenses.md` to `05_savings.md`.

## 1. Goal and scope

Build the `/budgets` page: select a month, see per-category budgets against actual spending, create a budget, update its limit, delete it.

Rules:

- **One budget per category per month.** Enforced by a PostgreSQL UNIQUE constraint. Never rely on a frontend-only duplicate check.
- **Expense categories only** (`category_type === "Expense"`) in the create form.
- **No financial arithmetic in the browser.** Spending, remaining, percent and status all come from `GET /reports/budget-vs-actual`. Never compute or infer them in React.
- **Category and month are immutable.** PATCH only accepts `limit_amount`.
- **Zero limits are valid** (`limit_amount >= 0`). The report then returns `percent_used = null`: show `—`, never divide.
- Do not modify the backend, schema, expense logic, navigation, or the `expenses/`, `savings/`, `bills/` components.

Out of scope: annual/weekly/daily budgets, rollover, forecasts, templates, alerts, budget sharing, new tables, new endpoints, new charts or libraries.

Budget warnings on expense and bill-payment endpoints already exist. Do not duplicate or touch that logic.

## 2. Existing backend endpoints

| Method | Path                        | Returns               | Purpose                                   |
| ------ | --------------------------- | --------------------- | ----------------------------------------- |
| GET    | `/budgets`                  | `BudgetRead[]`        | All budget records                        |
| GET    | `/reports/budget-vs-actual` | `BudgetVsActualRow[]` | Limit, actual, remaining, percent, status |
| POST   | `/budgets`                  | 201 `BudgetRead`      | Create                                    |
| PATCH  | `/budgets/{budget_id}`      | `BudgetRead`          | Update `limit_amount` only                |
| DELETE | `/budgets/{budget_id}`      | 204                   | Delete                                    |
| GET    | `/categories`               | `CategoryRead[]`      | Filter to Expense on the client           |

Report query params: `start_month` and `end_month` (dates). For the selected month send its first day as both.
Example: `GET /reports/budget-vs-actual?start_month=2026-11-01&end_month=2026-11-01`.
Never send `YYYY-MM` to the API. Convert with the existing date utilities.

## 3. Types and API contracts

Use generated types from `src/types/api.d.ts`. Do not redefine API fields. Run `npm run gen:api` only if the backend schemas changed.

Aliases to export from `src/types/index.ts`:

| Alias               | Schema              |
| ------------------- | ------------------- |
| `Budget`            | `BudgetRead`        |
| `BudgetCreate`      | `BudgetCreate`      |
| `BudgetUpdate`      | `BudgetUpdate`      |
| `BudgetVsActualRow` | `BudgetVsActualRow` |
| `Category`          | `CategoryRead`      |

Frontend-only display type, exported from `hooks/use-budgets.ts`:
`BudgetWithActual = { budget: Budget; actual: BudgetVsActualRow }`

Key fields:

- `BudgetRead`: `budget_id`, `category_id`, `budget_month`, `limit_amount`
- `BudgetVsActualRow`: `budget_id`, `category_id`, `category_name`, `budget_month`, `limit_amount`, `actual_amount`, `remaining_amount`, `percent_used`, `status`

Money and percentages are decimal **strings**. Keep them as strings.
`status` is one of `OK`, `Near limit`, `Over budget`.

## 4. Files to create or modify

All paths are under `frontend/src/`. One component per file, kebab-case filenames, PascalCase exports.

| File                                        | Action | Responsibility                                    |
| ------------------------------------------- | ------ | ------------------------------------------------- |
| `hooks/query-keys.ts`                       | Change | Add budget keys                                   |
| `types/index.ts`                            | Change | Export budget aliases                             |
| `hooks/use-budgets.ts`                      | Add    | Queries, mutations, merge                         |
| `components/budgets/budgets-view.tsx`       | Add    | Client component: header, month, dialogs          |
| `components/budgets/budgets-table.tsx`      | Add    | Table rows and actions                            |
| `components/budgets/budget-form-dialog.tsx` | Add    | Create and update dialog                          |
| `components/budgets/budget-progress.tsx`    | Add    | Progress bar and status badge                     |
| `app/(dashboard)/budgets/page.tsx`          | Add    | Server component rendering only `<BudgetsView />` |

`PageHeader` lives inside `BudgetsView`. The sidebar already links to `/budgets`. Do not edit navigation or global design tokens.

## 5. UI requirements

**Header** (`PageHeader`)

- Title: `Budgets`
- Description: `Plan monthly spending and track your household expenses against your limits.`
- Primary action: `Add budget` with a Plus icon.

**Month selector**

- Existing `MonthInput`, default `currentMonthInput()`.
- Changing the month refetches the report for that month. No date ranges, no yearly view.

**Table** (shadcn `Table`, only the selected month's budgets)

| Column       | Content                                    | Align |
| ------------ | ------------------------------------------ | ----- |
| Category     | `category_name`                            | Left  |
| Budget limit | `Money` of `limit_amount`                  | Right |
| Actual       | `Money` of `actual_amount`                 | Right |
| Remaining    | `Money` of `remaining_amount`              | Right |
| Used         | `formatPercent(percent_used)` or `—`       | Right |
| Progress     | `Progress` with `toProgress(percent_used)` | Left  |
| Status       | Badge                                      | Left  |
| Actions      | Edit, Delete                               | Right |

- All money uses the shared `Money` component. Numeric columns use `tabular-nums`.
- `percent_used === null`: show `—` in both Used and Progress.
- Above 100%: the displayed percentage stays real (via `formatPercent`), the bar is capped at 100% (via `toProgress`).

**Status badge** (semantic tokens from `frontend_design_theme.md`; label always visible, never color alone)

| Backend status | Label         | Style         |
| -------------- | ------------- | ------------- |
| `OK`           | Within budget | Neutral       |
| `Near limit`   | Near limit    | Warning/amber |
| `Over budget`  | Over budget   | Destructive   |

**States** (shared `DataState`)

- Loading: `LoadingState` with table skeleton rows. Never a blank page.
- Error: `ErrorState` with Retry.
- Empty: title `No budgets for this month`, description `Create a monthly budget for an expense category to start tracking your spending.`, action `Add budget`.

**Delete:** existing `ConfirmDelete`, showing category name and month. On success close it and show a toast. On failure keep the row and show the server error. No bulk delete.

## 6. Forms and validation

File: `budget-form-dialog.tsx`. Use shadcn `Dialog`, `Input`, `Select`, `Label`, `react-hook-form` and `zod`, as in the expense and savings slices. Two modes:

**Create**

- Title `Add budget`, description `Set a monthly spending limit for an expense category.`

| Field          | Control      | Validation                               |
| -------------- | ------------ | ---------------------------------------- |
| `category_id`  | Select       | Required; Expense categories only        |
| `budget_month` | `MonthInput` | Required; defaults to the selected month |
| `limit_amount` | Text `Input` | Required; non-negative; max 2 decimals   |

- Submit `Create budget`, pending `Creating…`.
- Convert the month to `YYYY-MM-01` with the existing date utility.

**Update**

- Title `Update budget`, description `Change the spending limit for this category and month.`
- Category and month shown read-only. Only `limit_amount` is editable (same validation).
- Submit `Save changes`, pending `Saving…`.

**Amount input**

- `inputMode="decimal"`, regex `^\d{1,10}(\.\d{1,2})?$`. Zero allowed.
- Send as a string. No floating-point arithmetic.

**Behavior**

- Reset values each time the dialog opens.
- Keep the dialog open on server rejection. Close it and show a success toast only after the server confirms.
- Field errors via `ApiError.fieldErrors`; root errors via the shared `Alert`.

## 7. React Query hooks and mutations

In `hooks/use-budgets.ts`:

**Queries**

- `useBudgets()`: `GET /budgets`.
- `useBudgetVsActual(month)`: `GET /reports/budget-vs-actual` with the month's first day as `start_month` and `end_month`. Use its values directly.
- `useBudgetData(month)`: merges the two by `budget_id` into `BudgetWithActual[]`, filtered to the selected month. This is display mapping only, with no aggregation or arithmetic.

**Mutations:** `useCreateBudget()`, `useUpdateBudget()`, `useDeleteBudget()`. After each success, invalidate the budgets query and the budget-vs-actual query for the affected month. Never edit report totals by hand.

**Query keys** (add to `query-keys.ts`)

- `budgets: ["budgets"] as const`
- `budgetVsActual: ["budget-vs-actual"] as const`
- Include the selected month in the report key (follow the existing parameterized-key convention) so one month never serves another month's cache.

## 8. Error handling

Always show the server's `detail`. Never replace it with a hard-coded message.

| Operation       | Error                            | UI                                                             |
| --------------- | -------------------------------- | -------------------------------------------------------------- |
| Create          | 409 duplicate category and month | Show `detail` in the dialog; let the user change the selection |
| Create          | 404 category not found           | Show `detail` in the dialog                                    |
| Create / Update | 422 validation                   | Map to form fields via `ApiError.fieldErrors`                  |
| Update          | 404 budget not found             | Error toast                                                    |
| Delete          | 404 budget not found             | Error toast                                                    |
| Delete          | 409 referenced budget            | Show `detail`, keep the row                                    |
| Any GET         | Network error or 422             | `ErrorState` with Retry                                        |

## 9. Acceptance criteria

- [ ] `/budgets` loads with the current month selected; changing the month refetches the right report.
- [ ] Create works and the create form lists Expense categories only.
- [ ] Zero limits can be created.
- [ ] A duplicate category and month is rejected and shows the server error.
- [ ] Limits can be updated; category and month cannot be edited.
- [ ] Delete works after confirmation and shows server errors on failure.
- [ ] All three statuses render correctly; null percent shows `—`.
- [ ] Bars never exceed 100% visually; the percentage text stays real.
- [ ] All amounts use `Money`; there is no browser-side financial arithmetic.
- [ ] Loading, error and empty states work.
- [ ] Mutations update the page without a reload.
- [ ] No unrelated frontend or backend files changed.
- [ ] `npm run lint` and `npm run build` pass.

## 10. Coding agent instructions

Before coding:

1. Read `00_frontend_overview.md`, `frontend_design_theme.md` and this spec.
2. Inspect the completed expenses and savings slices, `src/types/api.d.ts`, `hooks/query-keys.ts` and the shared components.
3. Verify the real response fields against the generated types.
4. List the files you will create and change.

Implement only this slice. If a backend capability is genuinely missing, stop and report it. Do not add endpoints or change the backend.

After implementing, report: files created and changed, hooks and components built, endpoints integrated, validation and error behavior, lint and build results, and any unresolved issue. Do not claim completion unless the page was tested against the running backend.

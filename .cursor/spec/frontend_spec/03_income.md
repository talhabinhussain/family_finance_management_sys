# 03 — Income

Read `00_frontend_overview.md` and `frontend_design_theme.md` first. Where this file and `00` disagree, `00` wins except where this file explicitly overrides for slice 03. Slice 02 (`02_expenses.md`) is the reference implementation: copy its structure and conventions, and note the differences listed under Behaviour.

## Goal

Build the `/income` page: a filterable, newest-first income table fed by `GET /transactions/income`, and a dialog that records income through `POST /transactions/income`.

Income is the simpler sibling of expenses: it credits an account, has no budget, and the response carries no warning flags. It differs from expenses in two ways: every income row also has an **income source** (`income_source_id`, required), and the category must be an **Income** category.

## Route

- `app/(dashboard)/income/page.tsx` renders only `<IncomeView />`. It stays a server component (no `"use client"`).
- `<PageHeader>` lives **inside** `IncomeView`, because its "Add income" action controls the dialog state. This matches the real `expenses-view.tsx`, even though `02_expenses.md` says the page renders the header. Follow the code.
- `00` §4 shows `app/income/page.tsx`. That tree is stale: the repo uses the `(dashboard)` route group (see `01` and `02`). Use the path above.
- The sidebar already links to `/income` (slice 01). No nav changes. Do not import `DashboardShell`.

## Endpoints used

Copied from `backend/src/routers/transactions.py` and `routers/setup.py`. No other endpoints.

| Method | Path                   | Used for                                                                                                                                                 |
| ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/transactions/income` | List income. Optional query params (dropped when empty by `api.ts`): `member_id`, `category_id`, `from`, `to` (`YYYY-MM-DD`). Full array, no pagination. |
| `POST` | `/transactions/income` | Create. Body `IncomeCreate`. Returns `201` with `IncomeRead` (the created row). **No** `budget_warning` / `over_budget`.                                 |
| `GET`  | `/members`             | Member options and name lookup (`useMembers`).                                                                                                           |
| `GET`  | `/accounts`            | Account options and name lookup (`useAccounts`).                                                                                                         |
| `GET`  | `/categories`          | Category options, filtered to income categories (`useCategories().incomeCategories`).                                                                    |
| `GET`  | `/income-sources`      | Income source options and name lookup (`useIncomeSources`). First slice to use this hook for a form.                                                     |

Not used: `GET /transactions/income/{income_id}` (no detail view).

Expected errors this page must show (always display the server's `detail` as given; do not hard-code message text in the UI):

- `POST` 400 `"Member is inactive"`: the member list was stale. Dialog stays open, message in the form.
- `POST` 404 `"Member not found"`, `"Account not found"` or `"Category not found"`: stale lists. Same handling.
- `POST` 400 `"Income requires an Income category"`: defence in depth; the form only offers income categories.
- `POST` 409 with a generic conflict message: a foreign key or constraint failed while saving (for example the income source was deleted elsewhere). The exact wording depends on where the database rejected the row; show whatever `detail` says.
- `POST` 422 array `detail` on malformed input: `ApiError.fieldErrors` maps to fields.
- `GET` 422 `"from date must be before or equal to to date"` for an inverted range: shown through `ErrorState` with Retry.

There is no "Insufficient account balance" error here: income credits the account, so no balance check applies.

## Types

From `src/types/api.d.ts` (run `npm run gen:api` first if the backend changed).

| Alias                           | Source schema                               | Notes                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Income`                        | `IncomeRead`                                | Exists in `types/index.ts`. `amount` and `transaction_date` are strings; `description` may be `null`; `created_at` is not displayed. Fields: `income_id`, `member_id`, `account_id`, `category_id`, `income_source_id`. |
| `IncomeCreate`                  | `IncomeCreate`                              | **Add** to `types/index.ts` (`export type IncomeCreate = S["IncomeCreate"]`), matching the existing `ExpenseCreate` alias. Not there yet.                                                                               |
| `IncomeSource`                  | `IncomeSourceRead`                          | Exists. `income_source_id`, `source_name`.                                                                                                                                                                              |
| `Member`, `Account`, `Category` | `MemberRead`, `AccountRead`, `CategoryRead` | Select options and name lookup. IDs only appear on rows; resolve names with the `byId` maps.                                                                                                                            |

Do not hand-write a field name that is not in these schemas. Do not use `ExpenseResult` on this page.

## Setup

None. Slice 02 already installed `react-hook-form`, `zod`, `@hookform/resolvers`, the Toaster, and the shadcn components this page uses (`table dialog select label input button alert`). Do not add packages or components. If a `components/ui/` file is missing, stop and say which one.

## Files

Paths are under `frontend/src/`.

| File                                       | Action | Content                                                                                                      |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| `hooks/query-keys.ts`                      | Change | Add `income: ["income"] as const`. It does not prefix-match `incomeSources` (`["income-sources"]`).          |
| `types/index.ts`                           | Change | Add the `IncomeCreate` alias.                                                                                |
| `hooks/use-income.ts`                      | Add    | `IncomeFilterParams` type, `useIncome(params)` list query, `useCreateIncome()` mutation.                     |
| `components/income/income-view.tsx`        | Add    | `"use client"`. Owns filter state, dialog state, `PageHeader` with the "Add income" button, filters + table. |
| `components/income/income-filters.tsx`     | Add    | Member, category, date range, clear.                                                                         |
| `components/income/income-table.tsx`       | Add    | shadcn `Table` inside `DataState`.                                                                           |
| `components/income/income-form-dialog.tsx` | Add    | The react-hook-form dialog.                                                                                  |
| `app/(dashboard)/income/page.tsx`          | Add    | `export default function IncomePage() { return <IncomeView /> }`.                                            |

One component per file, kebab-case filename, PascalCase export. Nothing else changes. Do not edit any file under `components/expenses/`.

## UI

Page container `max-w-6xl` (inherited). Follow `frontend_design_theme.md` for all visual tokens.

**Header.** `PageHeader` title "Income", description "Record household income and see which account it landed in.", action = "Add income" `Button` with `PlusIcon data-icon="inline-start"` (same as expenses).

**Filters (`income-filters.tsx`).** One wrapping row, `text-sm`, same layout as `expense-filters.tsx`:

- Member `Select`: "All members" + active members.
- Category `Select`: "All categories" + `incomeCategories` only. Expense categories must never appear.
- From / To: native `<input type="date">` in shadcn `Input`, each with a `Label`.
- "Clear filters" ghost `Button`, visible only when a filter is set.

Use ids prefixed `income-` (`income-member-filter`, `income-category-filter`, `income-from-filter`, `income-to-filter`). Filters apply on change. An inverted range is left for the server to reject and rendered as an `ErrorState`.

**Table (`income-table.tsx`).** Rows come pre-sorted from the hook. Wrapper `overflow-hidden rounded-lg border border-border bg-card`; the shadcn `Table` container scrolls horizontally on small screens (seven columns).

| Column      | Content                                                                           | Alignment                         |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------- |
| Date        | `formatDate(row.transaction_date)`                                                | left                              |
| Member      | `members.byId.get(row.member_id)?.full_name ?? "—"`                               | left                              |
| Source      | `incomeSources.byId.get(row.income_source_id)?.source_name ?? "—"`                | left                              |
| Category    | `categories.byId.get(row.category_id)?.category_name ?? "—"`                      | left                              |
| Account     | `accounts.byId.get(row.account_id)?.account_name ?? "—"`                          | left                              |
| Description | `row.description` or a muted `—`; `max-w-[240px] truncate` with a `title` tooltip | left                              |
| Amount      | `<Money value={row.amount} className="text-income font-medium" />`                | right, `tabular-nums` via `Money` |

No total row, no sum, no "earned this month": totals come from report endpoints in slice 07 (rule 6.3). No pagination.

**States.** Wrap the table in `DataState` with `LoadingState rows={6}`:

- Error: `ErrorState` with Retry (handled by `DataState`).
- Empty, no filters: `EmptyState` title "No income yet", description "Record your first income to start tracking what the household earns.", action = the Add income button.
- Empty, filters active: one muted line, "No income matches these filters.", no action.

**Dialog (`income-form-dialog.tsx`).** Copy the structure and classes of `expense-form-dialog.tsx` (same `DialogContent` sizing, `grid sm:grid-cols-2 gap-4`, same footer, same root-error `Alert`). Title "Add Income", description "Record income received. This credits the selected account." Submit label "Add income", pending label "Recording…" with the spinner. Ids prefixed `income-`.

| Field         | Control                             | Rules (zod mirrors backend `IncomeCreate`)                                                                                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Member        | `Select`                            | required; active members only                                                                                                                    |
| Account       | `Select`                            | required; all accounts; same label rule as the expense dialog (append the account type in parentheses when the name does not already contain it) |
| Income source | `Select`                            | required (`income_source_id` is non-null in the API); label `source_name`                                                                        |
| Category      | `Select`                            | required; `incomeCategories` only                                                                                                                |
| Amount (PKR)  | text `Input`, `inputMode="decimal"` | required; `^\d{1,10}(\.\d{1,2})?$`; refine `> 0`; sent as a string; message "Enter a valid amount (up to 10 digits, 2 decimals)"                 |
| Date          | native `<input type="date">`        | required; default `todayISO()` from `lib/dates.ts`, set when the dialog opens. No future-date rule: the API has none, so do not invent one       |
| Description   | `Input`, full width                 | optional; `.max(500)`, which is the backend `Description` limit in `schemas.py`; send `null` when blank (trim first)                             |

Form field names must equal the `IncomeCreate` keys exactly (`member_id`, `account_id`, `category_id`, `income_source_id`, `amount`, `transaction_date`, `description`) so 422 `fieldErrors` map straight onto fields.

Layout order, two columns: Member / Account, Income source / Category, Amount / Date, Description (spans both).

Empty lookups: when the income sources (or income categories) query has loaded and returned no rows, show a `text-xs text-muted-foreground` hint under that select ("No income sources yet."). No link, no pointer to another page, and no inline "add" control: managing sources is slice 08 and that page does not exist yet. The zod "required" message handles the submit.

**Member choice.** The API accepts any active member for income (the service checks existence and `is_active`, not role). The proposal says income is recorded against the earning member, but `00` §2 forbids role-based rules in the UI while auth is deferred. List every active member. Do not filter by role.

## Behaviour

**List query (`useIncome`).** Declare the params as a `type` alias, not an `interface`: an interface has no implicit index signature, which is why `use-expenses.ts` needs an `as Record<…>` cast. Do not copy that cast. Name it `IncomeFilterParams` so it does not collide with the `IncomeFilters` component.

```ts
export type IncomeFilterParams = {
  member_id?: number;
  category_id?: number;
  from?: string;
  to?: string;
};

useQuery({
  queryKey: [...queryKeys.income, "list", params],
  queryFn: () => apiGet<Income[]>("/transactions/income", params),
  select: (rows) =>
    [...rows].sort(/* transaction_date desc, then income_id desc */),
});
```

ISO date strings compare lexicographically, so `localeCompare` on `transaction_date` is enough. No date parsing.

**Create mutation (`useCreateIncome`).**

- `mutationFn: (body: IncomeCreate) => apiPost<Income>("/transactions/income", body)`.
- `onSuccess`:
  1. `toast.success("Income added.")` (mirrors "Expense added."). There are no budget flags to read; never show a warning or error toast on success.
  2. `invalidateQueries({ queryKey: queryKeys.income })`.
  3. `invalidateQueries({ queryKey: queryKeys.accounts })`: the write credited the stored balance in SQL.
  4. Leave a one-line comment: slice 07 must add its monthly income-vs-expense, account-balances and dashboard keys here when those queries exist (rule 6.15). Budgets are not affected by income (budgets are expense-category only), so slice 06 adds nothing here.
- The dialog calls `mutateAsync`. On success it closes and resets, with the date back to today. On `ApiError` it stays open, shows `error.message` in the root `Alert`, and maps `fieldErrors` onto matching fields.

**Differences from expenses (do not copy these parts of slice 02):**

| Expenses                                           | Income                                      |
| -------------------------------------------------- | ------------------------------------------- |
| POST returns `ExpenseResult` with two flags        | POST returns `IncomeRead`; no flags         |
| Three-way toast (over budget / near / plain)       | One plain success toast                     |
| Debits the account; can fail on insufficient funds | Credits the account; cannot fail on balance |
| Expense categories                                 | Income categories                           |
| No source field                                    | Required `income_source_id`                 |

**Filters.** State lives in `income-view.tsx` as plain `useState`. No URL params.

**Lookup hooks in the dialog** may still be loading on first open. Render selects from `(query.data ?? [])` and do not block the dialog.

**Trace for the viva** (be able to walk it): `IncomeFormDialog.onSubmit` → `useCreateIncome` → `apiPost` → `POST /transactions/income` → router `_write` → `transactions.create_income` (checks member, account, income category; inserts the `income` row; credits the account via `update_balance`; flush) → one commit in the unit of work, or rollback on any error. The database enforces `CHECK (amount > 0)`, the foreign keys (`ON DELETE RESTRICT`) and `trg_income_category_type`.

## Backend gaps

None. The filtered list, create-with-balance-credit and all four lookup endpoints exist.

Limits, not gaps: the API has no server filter by `income_source_id` or `account_id`, so this page offers none. Do not filter client-side to fake it. If a source filter is wanted later, add the `income_source_id` query parameter to the backend first (repository, service, router and a test), then the UI filter is a one-line addition to `IncomeFilterParams` and `income-filters.tsx`.

## Out of scope

- Editing or deleting income (create + read only; no API, none to be added).
- Totals, sums, subtotals, "income this month": reports and dashboard (slice 07).
- Budget flags, warnings, or anything from `ExpenseResult`.
- Creating or editing income sources or income categories: Settings (slice 08). No inline "add source".
- Role-based member filtering, a "current user", login.
- Filters by source or account, sorting UI, pagination, CSV export, URL query-string sync, persisted filters.
- Future-date validation, recurring or scheduled income, salary slips (not in the proposal or the API).
- Extracting shared form pieces (member / account selects) out of the expense dialog. Revisit once slice 05 exists and four dialogs share them.
- New endpoints, new packages, new shadcn components, edits to `components/expenses/`.

## Done when

Verify against the running backend (`uv run fastapi dev main.py`) with the default seed (Employer / Client / Family Business sources; Salary / Freelancing / Business categories; Bilal and Sara as earners). Global checks from `00` §14 also apply.

- [ ] `npm run lint` and `npm run build` pass; no `any`, no `console.log`, no raw colour classes, no `fetch` outside `lib/api.ts`, no `as Record<…>` cast in `use-income.ts`.
- [ ] `/income` shows the header, filters and the three seeded rows, newest first. Dates read `21 Nov 2026`, amounts are right-aligned `Rs. 180,000.00` in `text-income`, and Source resolves to names (Employer, Client, Family Business). The Income sidebar item is highlighted.
- [ ] Stopping the backend shows `ErrorState` with the "Cannot reach the backend" message; Retry works after restart.
- [ ] Filters: member (Bilal → 2 rows, Sara → 1), category, and a date range each narrow the list; Clear filters restores it; an inverted range shows the server's 422 message with Retry. The category filter never offers Food, Utilities or any other expense category.
- [ ] With no rows, or all filtered out, the correct empty state appears and its action (when present) opens the dialog.
- [ ] Dialog validation fires client-side, with no request in the Network tab, for: empty member / account / source / category, amount `abc`, `0` and `10.999`, and a description over 500 characters.
- [ ] The dialog's Member select lists only active members, and its Category select lists only Salary, Freelancing and Business.
- [ ] A valid income: toast "Income added.", dialog closes, the row appears at the top without a reload, and `GET /accounts` in `/docs` shows the chosen account's `balance` raised by exactly the amount. No budget toast ever appears.
- [ ] `GET /reports/account-balances` still shows `is_reconciled: true` for that account after the write.
- [ ] Wrong category type: in `/docs`, `POST /transactions/income` with an Expense category id returns 400 "Income requires an Income category" (the service pre-check fires first). The `trg_income_category_type` trigger is the backstop and is demonstrated with raw SQL (test T4), not through the API.
- [ ] Stale-list rejection: open the dialog, then in `/docs` set the chosen member inactive (`PATCH /members/{id}` with `{"is_active": false}`), submit. The dialog stays open with "Member is inactive", nothing is inserted, and the account balance is unchanged. Re-activate the member afterwards.
- [ ] Submitting while the backend is stopped keeps the dialog open with the "Cannot reach the backend" message.
- [ ] After a success, navigating to `/expenses` and back shows fresh data, not a stale list.

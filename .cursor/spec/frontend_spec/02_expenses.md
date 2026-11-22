# 02 — Expenses

Read `00_frontend_overview.md` first. Where this file and `00` disagree, `00` wins except where this file explicitly overrides for slice 02.

## Goal

Build the `/expenses` page: a filterable, newest-first expense table fed by `GET /transactions/expense`, and a dialog that records an expense through `POST /transactions/expense` and surfaces the backend's budget flags (`budget_warning`, `over_budget`) as toasts.

This slice also introduces the **first form** of the app, so it establishes the pattern every later write slice reuses: react-hook-form + zod for early feedback, the API as the authority, TanStack Query invalidation + toast on success, server message kept in the dialog on failure.

## Route

- `app/(dashboard)/expenses/page.tsx` → renders `<PageHeader>` plus the feature component `<ExpensesView />`. `page.tsx` stays tiny and server-only (no `"use client"`).
- Sidebar already links to `/expenses` (slice 01). No nav changes.
- Do not import `DashboardShell` here; the route-group layout provides it.

## Endpoints used

Copied from `backend/src/routers/transactions.py` and `routers/categories.py`. No other endpoints.

| Method | Path                    | Used for                                                                                                                                                        |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/transactions/expense` | List expenses. Query params (all optional, dropped when empty by `api.ts`): `member_id`, `category_id`, `from`, `to` (`YYYY-MM-DD`). Full array, no pagination. |
| `POST` | `/transactions/expense` | Create. Body: `ExpenseCreate`. Returns `201` with `ExpenseResult` (`expense_id`, `budget_warning`, `over_budget`).                                              |
| `GET`  | `/members`              | Member select options (existing `useMembers` hook).                                                                                                             |
| `GET`  | `/accounts`             | Account select options (existing `useAccounts` hook).                                                                                                           |
| `GET`  | `/categories`           | Category select options, filtered client-side to expense categories (existing `useCategories` hook).                                                            |

Expected errors this page must handle visibly:

- `POST` 400 `"Insufficient account balance"` — dialog stays open, message shown in the form.
- `POST` 400 category-type mismatch (defence in depth; the form only offers expense categories).
- `GET` 422 `"from date must be before or equal to to date"` when the user picks an inverted range — show via `ErrorState` with Retry.
- 422 array `detail` on malformed input → `ApiError.fieldErrors` maps to fields.

## Types

From `src/types/api.d.ts` (already generated; run `npm run gen:api` first if the backend changed). Aliases already exist in `src/types/index.ts`.

| Alias                           | Source schema                               | Notes                                                                                                                                            |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Expense`                       | `ExpenseRead`                               | `amount` and `transaction_date` serialise as strings (`"25000.00"`, `"2026-11-21"`); `description` may be `null`; `created_at` is not displayed. |
| `ExpenseResult`                 | `ExpenseResult`                             | Response of the POST. Only the two boolean flags are used; never show `expense_id`.                                                              |
| `Member`, `Account`, `Category` | `MemberRead`, `AccountRead`, `CategoryRead` | For select options and name lookup. Resolve names with `useMembers().byId` etc. — IDs only appear on rows.                                       |

Do not hand-write any field name that is not in these schemas.

## Setup (once, before writing components)

1. Install form stack (first use in the app):

```bash
   npm install react-hook-form zod @hookform/resolvers
```

2. Add shadcn components (Base UI style — the CLI generates them, do not hand-write in `components/ui/`):

```bash
   npx shadcn@latest add table dialog select label badge sonner
```

`sonner` gives the toaster. All other slices reuse these; later slices add only what they still lack.

3. In `src/app/providers.tsx` add `<Toaster richColors />` inside the providers tree (import from `@/components/ui/sonner`).

## Files

Paths are under `frontend/src/`.

| File                                          | Action | Content                                                                                                       |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `hooks/query-keys.ts`                         | Change | Add `expenses: ["expenses"] as const`. Later slices add their own keys; never inline a query key.             |
| `hooks/use-expenses.ts`                       | Add    | `useExpenses(params)` list query + `useCreateExpense()` mutation (see Behaviour).                             |
| `components/expenses/expenses-view.tsx`       | Add    | Owns filter state, the "Add expense" button, dialog open state, and composes filters + table. `"use client"`. |
| `components/expenses/expense-filters.tsx`     | Add    | Member/category/date-range controls.                                                                          |
| `components/expenses/expense-table.tsx`       | Add    | shadcn `Table` wrapper that also renders `DataState` empty/loading/error.                                     |
| `components/expenses/expense-form-dialog.tsx` | Add    | The react-hook-form dialog.                                                                                   |
| `app/(dashboard)/expenses/page.tsx`           | Add    | `PageHeader` + `<ExpensesView />`.                                                                            |

One component per file, kebab-case filename, PascalCase export. Nothing outside this list changes except `providers.tsx` (Toaster) and `query-keys.ts`.

## UI

Page container `max-w-6xl` (inherited). Layout: `PageHeader` with `action` = "Add expense" `Button` opening the dialog.

**Filters (`expense-filters.tsx`).** A single row, wrapping on small screens, `text-sm` controls:

- Member `Select`: "All members" + active members from `useMembers()`.
- Category `Select`: "All categories" + `useCategories().expenseCategories` only.
- From / To: two native `<input type="date">` inside shadcn `Input`, each with a `Label`.
- "Clear filters" ghost `Button`, visible only when at least one filter is set.

Filters apply on change (no Apply button); each change refetches with the new params (React Query caches per-param keys). Inverted `from > to` is left for the server to reject and rendered as an `ErrorState` above the table.

**Table (`expense-table.tsx`).** shadcn `Table`. Client-side sort: `transaction_date` descending, ties broken by `expense_id` descending. ISO strings compare lexicographically — a plain `sort` is fine, no date parsing.

| Column      | Content                                                           | Alignment                              |
| ----------- | ----------------------------------------------------------------- | -------------------------------------- |
| Date        | `formatDate(row.transaction_date)` → `21 Nov 2026`                | left                                   |
| Member      | `useMembers().byId.get(row.member_id)?.full_name ?? "—"`          | left                                   |
| Category    | `useCategories().byId.get(row.category_id)?.category_name ?? "—"` | left                                   |
| Account     | `useAccounts().byId.get(row.account_id)?.account_name ?? "—"`     | left                                   |
| Description | `row.description ?? "—"`, `text-muted-foreground` when null       | left, truncate with `max-w-… truncate` |
| Amount      | `<Money value={row.amount} className="text-expense" />`           | right, `tabular-nums` via `Money`      |

No total row, no sum, no average: totals come from report endpoints in later slices, never from adding rows in the browser (rule 6.3). No pagination.

**Standard states.** Wrap the table region in `DataState` from `components/shared/data-state.tsx`:

- Loading → `<LoadingState rows={6} />`.
- Error → `<ErrorState>` with Retry (`refetch`).
- Empty with no filters → `EmptyState` "No expenses yet" + description "Add your first expense to start tracking spending." + action = the Add expense button again.
- Empty with filters active → plain one-line empty state ("No expenses match these filters.") without the add action.

**Dialog (`expense-form-dialog.tsx`).** shadcn `Dialog` opened from the page header and the empty state. Width `sm:max-w-lg`. One `grid gap-4` of fields, every input with a `<Label htmlFor>`:

| Field       | Control                                 | Rules (zod mirrors backend `ExpenseCreate`)                                                                                                        |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member      | `Select`                                | required; values from `useMembers()`                                                                                                               |
| Account     | `Select`                                | required; values from `useAccounts()`; show `account_name` (append account type in parentheses if the type is not obvious from the name)           |
| Category    | `Select`                                | required; `expenseCategories` only — income categories must not be selectable                                                                      |
| Amount      | text `Input`, `inputMode="decimal"`     | required; matches `^\d{1,10}(\.\d{1,2})?$` (matches `NUMERIC(12,2)`); sent as string; message "Enter a valid amount (up to 10 digits, 2 decimals)" |
| Date        | native `<input type="date">` in `Input` | required; default `todayISO()` from `lib/dates.ts`                                                                                                 |
| Description | `Input`                                 | optional; `.max()` must mirror the `Description` length in `backend/src/models/schemas.py` — read it and use the backend value, do not invent one  |

Submit row: Cancel `Button variant="outline"` (closes, resets) + Submit `Button` with a spinner while `isPending`, disabled while pending. Server error surface: a form-level error (shadcn `Alert variant="destructive"`) fed from `ApiError.message` via `setError("root", …)`; 422 `fieldErrors` additionally map onto their fields with `setError(field, …)` when `loc` names a form field.

Accessibility: every control labelled; dialog closes on Esc and overlay click (shadcn default); icon-only buttons, if any, get `aria-label`.

## Behaviour

**List query (`useExpenses`).**

```ts
useQuery({
  queryKey: [...queryKeys.expenses, "list", params],
  queryFn: () => apiGet<Expense[]>("/transactions/expense", params),
  select: (rows) =>
    [...rows].sort(/* transaction_date desc, expense_id desc */),
});
```

`params` holds only set filters (`member_id`, `category_id`, `from`, `to`); empty strings are dropped by `api.ts`.

**Create mutation (`useCreateExpense`).**

- `mutationFn: (body: ExpenseCreate) => apiPost<ExpenseResult>("/transactions/expense", body)`.
- `onSuccess(result)`:

1. Toast by the flags (rule 6.16 — never recompute them):
   - `result.over_budget` → `toast.error("Expense added, but this category is now over budget.")`
   - else `result.budget_warning` → `toast.warning("Expense added — you are near this category's budget limit.")`
   - else → `toast.success("Expense added.")`

2. `queryClient.invalidateQueries({ queryKey: queryKeys.expenses })` (prefix-matches every filtered list).
3. `queryClient.invalidateQueries({ queryKey: queryKeys.accounts })` — the write debits the stored balance in SQL.
4. Close the dialog and reset the form. Defaults are re-applied (date = today).

- `onError`: keep the dialog open, surface `getErrorMessage(error)` in the form-level alert, map `fieldErrors` onto fields.
- Leave a one-line comment at the invalidation block: slices 06/07 must add their budget/report/dashboard keys here when those queries exist (rule 6.15).

**Filters.** State lives in `expenses-view.tsx` as plain `useState` (no URL search params — out of scope). Changing any control updates state → new query key → fetch. "Clear filters" returns to the unfiltered list.

**Lookup hooks in the dialog** may be loading on first open: render the selects' contents from `(query.data ?? [])` and rely on React Query having pre-fetched them from the table's name lookups (same keys). Do not block the dialog on them.

## Backend gaps

None. Everything this page needs exists in the backend: filtered list, create with atomic balance update, budget flags in the create response, and lookup endpoints from slice 01.

## Out of scope

- Editing or deleting expenses (transactions are create + read only; no API exists and none should be added).
- Any totals, sums, category subtotals or "spent this month" figures on this page — that is the reports/dashboard slices' job.
- Pagination, sorting UI (the sort order is fixed: newest first), CSV export, receipt attachments.
- URL query-string sync for filters; persisting filters across navigation.
- Bill payments — `/transactions/bill-payment` belongs to slice 04 even though it shares internals with expenses.
- New endpoints, new shadcn components beyond the Setup list, new npm packages beyond react-hook-form/zod/@hookform/resolvers.
- Toasts anywhere other than this page's create flow (the toaster itself is shared and lives in `providers.tsx`).

## Done when

Verify against the running backend (`uv run fastapi dev main.py`) with seeded Neon data. Global checks from `00` section 14 apply too.

- [ ] `npm run lint` and `npm run build` pass; no `any`, no `console.log`, no raw colour classes, no `fetch` outside `lib/api.ts`.
- [ ] `/expenses` renders the header, filters and a table of seeded expenses; dates show as `21 Nov 2026`, amounts as right-aligned `Rs. 25,000.00` in `text-expense`; rows are newest first.
- [ ] Stopping the backend shows the `ErrorState` with the "Cannot reach the backend" message; Retry works after restarting it.
- [ ] Filtering by member, by category, and by a date range each narrows the list; "Clear filters" restores it; an inverted range shows the server's 422 message with Retry.
- [ ] With no rows (or all filtered out), the correct empty state appears, and its action opens the dialog.
- [ ] Dialog validation: empty member/account/category, an amount like `abc` or `10.999`, and an over-long description each fail client-side with a field message before any request is sent.
- [ ] A valid expense: toast appears, dialog closes, the row shows at the top without a page reload, and the account's `balance` changed (check `GET /accounts` in `/docs` — the frontend recomputes nothing).
- [ ] Budget flags: with a seeded budget on the chosen category for the current month, one expense inside the near-limit band gives the amber toast and one that exceeds the limit gives the destructive toast; an unrelated category gives the plain success toast.
- [ ] An expense larger than the account balance returns 400; the dialog stays open showing "Insufficient account balance" and nothing was inserted.
- [ ] After success, navigating away and back shows fresh data from the cache invalidation, not a stale list.s

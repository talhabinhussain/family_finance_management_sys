# 04 — Bills

Read `00_frontend_overview.md` and `frontend_design_theme.md` first. Where this file and `00` disagree, `00` wins except where this file explicitly overrides for slice 04. Slices 02 (`02_expenses.md`) and 03 (`03_income.md`) are the reference implementations: copy their structure, hooks and dialog conventions. Bill payments reuse the **expense** write path, so the budget-flag toast from slice 02 applies here.

## Goal

Build the `/bills` page: a bill schedule (overdue and upcoming unpaid periods) with a "Record payment" action on each row, a payment history, and a list of registered bills with an "Add bill" dialog and activate/deactivate.

This is the page that shows the database rules most clearly in a demo: one payment per bill per period (`UNIQUE`), a payment that is an expense plus a balance debit in **one transaction**, and a status that comes from a SQL view, not from the browser.

## Decisions (read first)

- **Add bill and activate/deactivate are in this slice.** `00` §2 lists slice 04 as "Bill schedule, record payment", and slice 08 (Settings) covers members, accounts, categories and income sources only. Without them no bill can be registered from the UI, but the proposal (step 5) says bills are registered. If time is short, drop the "Add bill" dialog and the registered-bills section and seed bills instead.
- **A payment can only be recorded from a schedule row.** The API accepts only `period_month` values that exist in `v_bill_schedule`. The row supplies `bill_id`, `category_id` and `period_month`, so the user never types them and cannot send an invalid period. No top-level "Record payment" button.
- **No tabs.** `tabs` is not installed and this slice adds no components. Sections are stacked.
- **Status is never computed in the browser.** Overdue rows come from `GET /reports/overdue-bills`, upcoming rows from `GET /reports/upcoming-bills`, paid periods from the payments list. Do not compare `due_date` with today's date.

## Route

- `app/(dashboard)/bills/page.tsx` renders only `<BillsView />`. Server component (no `"use client"`).
- `<PageHeader>` lives **inside** `BillsView` (its "Add bill" action controls dialog state), same as `expenses-view.tsx` and `income-view.tsx`.
- The `00` §4 tree shows `app/bills/page.tsx`. It is stale: the repo uses the `(dashboard)` route group. Use the path above.
- The sidebar already links to `/bills`. No nav changes. Do not import `DashboardShell`.

## Endpoints used

Copied from `routers/setup.py`, `routers/transactions.py` and `routers/reports.py`. No other endpoints.

| Method  | Path                                   | Used for                                                                                                                                                    |
| ------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/reports/overdue-bills`               | Unpaid periods with `due_date` before today. No params sent (the server defaults `as_of` to today). Returns `BillDueRow[]` ordered by due date.             |
| `GET`   | `/reports/upcoming-bills`              | Unpaid periods due from today onward. Query `days_ahead` (30, 60 or 90). Returns `BillDueRow[]` ordered by due date.                                        |
| `POST`  | `/transactions/bill-payment`           | Record a payment. Body `BillPaymentCreate`. `201` with `ExpenseResult` (`expense_id`, `budget_warning`, `over_budget`). It does **not** return the payment. |
| `GET`   | `/transactions/bill-payments`          | Payment history. No params sent. Returns `BillPaymentRead[]` (`bill_payment_id`, `bill_id`, `expense_id`, `period_month`, `paid_at`).                       |
| `GET`   | `/transactions/expense`                | Amount, date, account and member for each payment, matched by `expense_id` (`useExpenses()` with no params).                                                |
| `GET`   | `/bills`                               | All bills, **including inactive**. Registered-bills table and bill name lookup.                                                                             |
| `POST`  | `/bills`                               | Create. Body `BillCreate`. `201` with `BillRead`.                                                                                                           |
| `PATCH` | `/bills/{bill_id}`                     | Body `{ "is_active": boolean }` only. Bills have no DELETE.                                                                                                 |
| `GET`   | `/members`, `/accounts`, `/categories` | Existing hooks: options and name lookup.                                                                                                                    |

Not used: `GET /transactions/bill-payments/{payment_id}`, `GET /bills/{bill_id}`.

Errors to show (always display the server's `detail` as given; never hard-code message text):

- `POST /transactions/bill-payment`
  - 400 `"Insufficient account balance"`: the atomic debit matched no row. Nothing is inserted. Dialog stays open.
  - 400 `"Member is inactive"`, 404 `"Member not found"`, `"Account not found"`, `"Bill not found"`, `"Category not found"`: stale lists.
  - 400 `"Bill is not active"`, `"period_month is not a scheduled due period for this bill"`, `"Bill payment category must match the bill category"`: defence in depth, the form cannot normally trigger them.
  - 409 `"This bill has already been paid for that month"`: the `UNIQUE (bill_id, period_month)` constraint fired. The service has already debited the account in the same session, and `_write` rolls the whole transaction back, so no expense and no balance change survive. Open the page in two tabs to demo it.
  - 422 array `detail`: `ApiError.fieldErrors` maps onto fields; keys with no matching form field (`bill_id`, `category_id`, `period_month`) go to the root `Alert`.
- `POST /bills`: 404 `"Category not found"`, 400 `"Bills require an Expense category"`, 409 with a generic conflict message (most likely a duplicate `bill_name`; show whatever `detail` says), 422 field errors.
- `PATCH /bills/{id}`: 404 `"Bill not found"`, shown as an error toast.
- `GET` 422 or network failure: `ErrorState` with Retry, through `DataState`.

## Types

From `src/types/api.d.ts` (run `npm run gen:api` first if the backend changed).

| Alias               | Source schema       | Notes                                                                                                                                                                                      |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Bill`              | `BillRead`          | Exists. `bill_id`, `bill_name`, `amount_due`, `due_date`, `recurrence`, `category_id`, `is_active`. `due_date` is the **first (anchor) due date**, not the next one.                       |
| `BillDueRow`        | `BillDueRow`        | Exists. Schedule row: `bill_id`, `bill_name`, `amount_due`, `recurrence`, `category_id`, `due_date`, `period_month`, and `days_overdue` / `days_until_due`, either of which may be `null`. |
| `BillPayment`       | `BillPaymentRead`   | Exists. Has no amount, member or account.                                                                                                                                                  |
| `Expense`           | `ExpenseRead`       | Exists. Joined to a payment by `expense_id`.                                                                                                                                               |
| `ExpenseResult`     | `ExpenseResult`     | Exists. Return type of the payment POST.                                                                                                                                                   |
| `BillCreate`        | `BillCreate`        | **Add** to `types/index.ts`.                                                                                                                                                               |
| `BillUpdate`        | `BillUpdate`        | **Add**.                                                                                                                                                                                   |
| `BillPaymentCreate` | `BillPaymentCreate` | **Add**.                                                                                                                                                                                   |
| `Recurrence`        | `Recurrence`        | **Add**. Union `"One-time" \| "Monthly" \| "Quarterly" \| "Yearly"`. A `const` array typed `Recurrence[]` for the select is fine: a typo fails to compile.                                 |

Do not hand-write a field name that is not in these schemas.

## Setup

None. All needed packages and components exist (`table dialog select label input button alert badge`, `react-hook-form`, `zod`, Toaster). Do not add packages or components. If a `components/ui/` file is missing, stop and say which one.

## Files

Paths are under `frontend/src/`.

| File                                          | Action | Content                                                                                                        |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `hooks/query-keys.ts`                         | Change | Add `bills: ["bills"]`, `billSchedule: ["bill-schedule"]`, `billPayments: ["bill-payments"]` (all `as const`). |
| `types/index.ts`                              | Change | Add the four aliases above.                                                                                    |
| `hooks/use-bills.ts`                          | Add    | `useBills()` (with `byId`), `useCreateBill()`, `useSetBillActive()`, `useBillSchedule(daysAhead)`.             |
| `hooks/use-bill-payments.ts`                  | Add    | `useBillPayments()`, `useCreateBillPayment()`.                                                                 |
| `components/bills/bills-view.tsx`             | Add    | `"use client"`. Owns `daysAhead`, `payingRow`, add-bill dialog state; header, three sections, both dialogs.    |
| `components/bills/bill-schedule-table.tsx`    | Add    | Overdue + upcoming rows in one table inside `DataState`.                                                       |
| `components/bills/bill-payment-dialog.tsx`    | Add    | react-hook-form dialog opened from a schedule row.                                                             |
| `components/bills/bill-payment-history.tsx`   | Add    | Payment history table.                                                                                         |
| `components/bills/registered-bills-table.tsx` | Add    | All bills with activate/deactivate.                                                                            |
| `components/bills/bill-form-dialog.tsx`       | Add    | "Add bill" dialog.                                                                                             |
| `app/(dashboard)/bills/page.tsx`              | Add    | `export default function BillsPage() { return <BillsView /> }`.                                                |

One component per file, kebab-case filename, PascalCase export. Do not edit `components/expenses/`, `components/income/` or `use-expenses.ts`.

## UI

Page container `max-w-6xl` (inherited). Visual tokens from `frontend_design_theme.md`. Section titles `text-lg font-medium`, sections separated by `gap-8`. Ids prefixed `bills-`, `bill-payment-` and `bill-form-`.

**Header.** `PageHeader` title "Bills", description "Track what is due, record payments and keep the bill list up to date.", action = "Add bill" `Button` with `PlusIcon data-icon="inline-start"`.

**Section 1: Schedule (`bill-schedule-table.tsx`).** Title "Schedule". Beside the title a `Select` "Upcoming window" (`bills-window`) with "Next 30 days" (default), "Next 60 days", "Next 90 days". Overdue rows are always all shown. Rows: all overdue first, then upcoming, each group in the order the API returns. Table wrapper as in income; seven columns:

| Column   | Content                                                                                                                                                                                                                                                  | Alignment |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Status   | Overdue: `Badge variant="destructive"` text `{days_overdue} days overdue` (`1 day overdue`; plain `Overdue` if null). Upcoming: `Badge variant="outline"` text `Due today` / `In {n} days` (`In 1 day`) from `days_until_due`; plain `Upcoming` if null. | left      |
| Bill     | `bill_name`                                                                                                                                                                                                                                              | left      |
| Due date | `formatDate(due_date)`                                                                                                                                                                                                                                   | left      |
| Period   | `formatMonth(period_month)`                                                                                                                                                                                                                              | left      |
| Category | `categories.byId.get(category_id)?.category_name ?? "—"`                                                                                                                                                                                                 | left      |
| Amount   | `<Money value={amount_due} />` (neutral colour: it is an amount due, not yet an expense)                                                                                                                                                                 | right     |
| Action   | `Button variant="outline" size="sm"` "Record payment", `aria-label="Record payment for {bill_name}, {period}"`                                                                                                                                           | right     |

Row key `${bill_id}-${period_month}`. The badge text is mandatory (never colour alone). Do not invent a "due soon" threshold. No totals.

States: `DataState` with `LoadingState rows={4}`; `isEmpty` = both lists empty → `EmptyState` title "No bills due", description "Nothing is overdue or due in this window." (no action).

**Section 2: Payment history (`bill-payment-history.tsx`).** Title "Payment history". Rows sorted by `period_month` desc, then `bill_payment_id` desc, computed in the hook's `select`. The amount, date, account and member come from the expenses list matched by `expense_id` (display mapping, not arithmetic).

| Column  | Content                                                                                        | Alignment |
| ------- | ---------------------------------------------------------------------------------------------- | --------- |
| Status  | `Badge variant="outline"` text "Paid", `className="border-income/30 bg-income/10 text-income"` | left      |
| Bill    | `bills.byId.get(bill_id)?.bill_name ?? "—"`                                                    | left      |
| Period  | `formatMonth(period_month)`                                                                    | left      |
| Paid on | `formatDate(expense.transaction_date)` or `—` if the expense is not in the list                | left      |
| Paid by | member `full_name` from the expense, or `—`                                                    | left      |
| Account | `account_name` from the expense, or `—`                                                        | left      |
| Amount  | `<Money value={expense.amount} className="text-expense font-medium" />`, or a muted `—`        | right     |

Do not show `paid_at` (a timestamp; the date-only formatter would shift timezones). Empty: `EmptyState` "No payments yet", "Payments you record against a bill appear here." (no action). Loading and error: both the payments query and the expenses query must be ready; use the payments query for `DataState` and render `—` for missing expense fields while the expenses query loads.

**Section 3: Registered bills (`registered-bills-table.tsx`).** Title "Registered bills". Sorted by `bill_name` in the hook's `select`.

| Column         | Content                                                                                                                                 | Alignment |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Bill           | `bill_name`                                                                                                                             | left      |
| Category       | category name                                                                                                                           | left      |
| Amount         | `<Money value={amount_due} />`                                                                                                          | right     |
| Recurrence     | `recurrence`                                                                                                                            | left      |
| First due date | `formatDate(due_date)`                                                                                                                  | left      |
| Status         | `Badge variant="secondary"` "Active" or `variant="outline"` "Inactive"                                                                  | left      |
| Action         | `Button variant="outline" size="sm"`: "Deactivate" when active, "Activate" when inactive; disabled while that row's mutation is pending | right     |

Empty: `EmptyState` "No bills yet", "Add a bill to start tracking due dates.", action = Add bill button. No confirm dialog: the change is reversible.

**Payment dialog (`bill-payment-dialog.tsx`).** Props `{ row: BillDueRow | null; onOpenChange }`; open when `row !== null`. Same `DialogContent` sizing, `grid sm:grid-cols-2 gap-4`, footer and root-error `Alert` as `expense-form-dialog.tsx`. Title "Record payment". Description `Paying {bill_name} for {formatMonth(period_month)} (due {formatDate(due_date)}). This debits the selected account.` Submit "Record payment", pending "Recording…" with the spinner. Reset to the row's defaults every time the dialog opens for a row.

| Field        | Control                                                | Rules                                                                                                                                       |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Member       | `Select`                                               | required; active members only                                                                                                               |
| Account      | `Select`                                               | required; all accounts; same label rule as the expense dialog (append the type in parentheses when the name does not already contain it)    |
| Amount (PKR) | text `Input`, `inputMode="decimal"`                    | required; `^\d{1,10}(\.\d{1,2})?$`; refine `> 0`; **default `row.amount_due`**, editable; hint `Bill amount: {formatMoney(row.amount_due)}` |
| Date         | native `<input type="date">`                           | required; default `todayISO()` set on open; no future-date rule (the API has none)                                                          |
| Category     | disabled `Input` showing the category name, full width | not a form field; `category_id` comes from the row (`00` §7: prefill and lock)                                                              |
| Description  | `Input`, full width                                    | optional; `.max(500)`; send `null` when blank (trim first)                                                                                  |

Form fields: `member_id`, `account_id`, `amount`, `transaction_date`, `description`. On submit build the `BillPaymentCreate` body by adding `bill_id`, `category_id` and `period_month` straight from `row`. Never let the user edit those three. Layout: Member / Account, Amount / Date, Category, Description.

**Add bill dialog (`bill-form-dialog.tsx`).** Title "Add bill", description "Register a bill and its first due date.", submit "Add bill", pending "Adding…".

| Field         | Control               | Rules                                                                                                                                                                                   |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bill_name`   | `Input`               | required after trim; max 100 (backend `Name100`)                                                                                                                                        |
| `amount_due`  | text `Input`, decimal | same regex and `> 0` rule as amounts elsewhere                                                                                                                                          |
| `due_date`    | native date           | required; label "First due date"; helper `text-xs text-muted-foreground`: "Every later period is generated from this date. A past date creates overdue entries for each missed period." |
| `recurrence`  | `Select`              | required; options from a `Recurrence[]` const (`One-time`, `Monthly`, `Quarterly`, `Yearly`)                                                                                            |
| `category_id` | `Select`              | required; `expenseCategories` only (`00` §7)                                                                                                                                            |

Field names equal the `BillCreate` keys exactly. Layout: `bill_name` full width, then two columns: amount / first due date, recurrence / category.

## Behaviour

**Schedule query (`useBillSchedule(daysAhead)`).** One query so `DataState` keeps a single loading/error/retry path:

```ts
useQuery({
  queryKey: [...queryKeys.billSchedule, daysAhead],
  queryFn: async () => {
    const [overdue, upcoming] = await Promise.all([
      apiGet<BillDueRow[]>("/reports/overdue-bills"),
      apiGet<BillDueRow[]>("/reports/upcoming-bills", {
        days_ahead: daysAhead,
      }),
    ]);
    return { overdue, upcoming };
  },
});
```

No client sorting: both endpoints already order by due date and bill name. Declare any params as a `type` alias, not an `interface`, and add no `as Record<…>` cast.

**Payment mutation (`useCreateBillPayment`).**

- `mutationFn: (body: BillPaymentCreate) => apiPost<ExpenseResult>("/transactions/bill-payment", body)`.
- `onSuccess(result)`, flags read from the response, never recomputed (`00` §6.16):
  - `over_budget` → `toast.error("Bill paid, but this category is now over budget.")`
  - else `budget_warning` → `toast.warning("Bill paid — you are near this category's budget limit.")`
  - else `toast.success("Bill payment recorded.")`
- Then invalidate `billSchedule`, `billPayments`, `expenses` (the payment created an expense row, so `/expenses` must not show a stale list) and `accounts` (the balance was debited in SQL). Leave a one-line comment: slices 06/07 must add their budget, report and dashboard keys here (`00` §6.15).
- `onError`: when the error is an `ApiError` with status 409, invalidate `billSchedule` and `billPayments` (the row was already paid elsewhere, so it should disappear). The dialog still shows the server message.
- The dialog calls `mutateAsync`. On success it closes and resets. On `ApiError` it stays open, shows `error.message` in the root `Alert` and maps `fieldErrors`.

**Bill mutations.** `useCreateBill`: `apiPost<Bill>("/bills", body)`; success toast "Bill added."; invalidate `bills` and `billSchedule`. `useSetBillActive`: `apiPatch<Bill>(`/bills/${billId}`, { is_active })` typed as `BillUpdate`; success toast "Bill activated." or "Bill deactivated. It no longer appears in the schedule."; invalidate `bills` and `billSchedule`; on error `toast.error(getErrorMessage(error))`.

**Why deactivating hides schedule rows:** `v_bill_schedule` filters `WHERE b.is_active`. Paid history is unaffected because it reads `bill_payment`.

**Lookups.** Selects render from `(query.data ?? [])`; the dialogs do not block while lookups load. Active members are filtered with `is_active`, as in the other dialogs.

**Trace for the viva:** `BillPaymentDialog.onSubmit` → `useCreateBillPayment` → `apiPost` → `POST /transactions/bill-payment` → router `_write` → `transactions.create_bill_payment` (checks `period_month` is the 1st, the bill exists and is active, the period exists in `v_bill_schedule`, the category matches; then `_expense` inserts the expense and runs `UPDATE account SET balance = balance - :amount WHERE … AND balance >= :amount`; then inserts the `bill_payment` row; flush) → one commit, or rollback on any error. The database enforces `UNIQUE (bill_id, period_month)`, `UNIQUE (expense_id)`, the first-of-month `CHECK` on `period_month`, `CHECK (amount > 0)`, `trg_bill_payment_category` and `trg_bill_category_type`.

## Backend gaps

None blocking. Limits, not gaps (do not work around them with client logic):

- No endpoint returns the schedule with paid and unpaid rows together. The page composes overdue + upcoming + payments.
- `BillPaymentRead` has no amount, date, member or account. The history joins to the expenses list by `expense_id`. If that becomes awkward, the fix is a backend change (extend the response, add a test), then drop the join.
- `GET /bills` carries no status. Status exists only in the two report endpoints (`00` §7).
- The overdue list goes back to each bill's first due date, so an old unpaid monthly bill yields many rows. That is correct behaviour, with no pagination.

## Out of scope

- Editing a bill's name, amount, due date or recurrence. Changing `due_date` or `recurrence` re-derives every period in the view, including already-paid ones. Only `is_active` is patchable here.
- Deleting bills or payments (no endpoint), undoing a payment, partial payments, payment ordering rules.
- Totals, "total due", counts or any money arithmetic. Reports and dashboard are slice 07.
- A free-form "pay any month" picker, a period or `bill_id` the user can type, a calendar view, reminders, notifications.
- Filters, sorting UI, pagination, export, URL query sync on this page.
- Budget editing or budget display (slice 06). The budget toast only reads the flags in the response.
- Role-based rules, a "current user", login.
- New endpoints, packages or shadcn components; edits to other slices' files.

## Done when

Verify against the running backend (`uv run fastapi dev main.py`) with the default seed (Electricity monthly, Internet monthly, School Fee quarterly; three seeded payments). Which periods are overdue or upcoming depends on the date you seeded, so compare against `GET /reports/overdue-bills` and `/reports/upcoming-bills` in `/docs`. Global checks from `00` §14 also apply.

- [ ] `npm run lint` and `npm run build` pass; no `any`, no `console.log`, no raw colour classes, no `fetch` outside `lib/api.ts`, no `as Record<…>` cast, no money arithmetic and no date comparison for status.
- [ ] `/bills` shows the header and three sections. Schedule rows match the two report endpoints exactly (overdue first); statuses read as text badges; dates read `15 Nov 2026`, periods `Nov 2026`, amounts `Rs. 12,000.00` right-aligned. The Bills sidebar item is highlighted.
- [ ] Changing the window to 60 or 90 days changes only the upcoming rows, and each change matches `GET /reports/upcoming-bills?days_ahead=…`.
- [ ] Payment history shows the three seeded payments with bill, period, date, member, account and amount filled in (no `—` while data exists). Registered bills lists all three bills as Active.
- [ ] Stopping the backend shows `ErrorState` with the "Cannot reach the backend" message in each section; Retry works after restart.
- [ ] "Record payment" opens a dialog titled with the bill and period; Amount is prefilled with the bill's amount; the Category field is disabled and shows the bill's category; Member lists only active members.
- [ ] Dialog validation fires client-side, with no request in the Network tab, for: empty member or account, amount `abc`, `0` and `10.999`, and a description over 500 characters.
- [ ] A valid payment: success toast, dialog closes, the row leaves the schedule and a "Paid" row appears at the top of the history without a reload. `GET /accounts` shows the chosen account's `balance` reduced by exactly the amount, and the new expense appears on `/expenses` without a manual refresh. `GET /reports/account-balances` still shows `is_reconciled: true`.
- [ ] A payment that pushes its category past its monthly budget shows the destructive "over budget" toast, and one at 80% or more shows the amber warning toast (check `budget_warning` / `over_budget` in the Network response).
- [ ] Insufficient balance: pay a bill from Cash Wallet with an amount above its balance. The dialog stays open with "Insufficient account balance", no expense is created and the balance is unchanged.
- [ ] Duplicate payment (the rollback demo): open `/bills` in two tabs, pay the same row in tab 1, then submit in tab 2. Tab 2 stays open with "This bill has already been paid for that month", the account balance was debited **once**, and no second expense exists. After closing the dialog the stale row is gone from tab 2.
- [ ] Stale-member rejection: open the dialog, set the chosen member inactive in `/docs` (`PATCH /members/{id}` with `{"is_active": false}`), submit. The dialog stays open with "Member is inactive" and nothing is inserted. Re-activate the member afterwards.
- [ ] "Add bill": a valid monthly bill with a future first due date appears in Registered bills and, when inside the window, in the schedule. A duplicate name shows the server's 409 message in the dialog. The category select offers expense categories only (never Salary, Freelancing or Business). A past first due date shows overdue rows for each missed period.
- [ ] "Deactivate" removes that bill's rows from the schedule while its payment history stays. "Activate" brings the unpaid rows back.

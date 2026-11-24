07b — Dashboard
Read 00_frontend_overview.md and frontend_design_theme.md first. 07a_reports.md must be implemented first. This slice is composition: it reuses the hooks, chart components and DataCard from 07a and the earlier slices. It adds layout and a few small cards, and no new endpoints.

The supplied UI screenshots are the visual reference:

- The Budgets page is the reference for the shared application shell, sidebar, top bar, page heading, divider, month-filter row, content width, typography, spacing and neutral page background.
- The Dashboard screenshot currently shows a placeholder. Replace that placeholder with the dashboard described below.
- The sidebar appears expanded in the Budgets screenshot and collapsed in the Dashboard screenshot. This is a user-controlled navigation state, not a reason to create a different dashboard layout. Keep the existing shared sidebar behavior; do not hide, duplicate or redesign it for this slice.

1. Goal and scope
   Replace the placeholder at / with a one-screen household overview for a selected month: income, expenses, net and savings, a six-month trend, budget alerts, top spending categories, bills needing attention, account balances and savings progress.

Rules:

- No financial arithmetic in the browser. No sums, differences, percentages or totals. Show what the API returns. Counting rows (array.length) and slice are allowed for display. Money is never added up.
- Months go to the API as YYYY-MM-01. Use monthInputToApi.
- Statuses come from the API. Budget status, bill days_overdue and days_until_due decide what is shown. Never compare due_date with today.
- Each card loads independently through DataCard. One failed report must not blank the dashboard.
- Month-dependent: summary cards, trend (ends at the selected month), top categories, budget alerts. Not month-dependent: bills, accounts, savings. Say so in those cards' descriptions.
- No quick-add dialogs, no write actions, no login or role logic.
- Do not modify the backend, schema, navigation, design tokens, or any page other than /.
- Preserve the existing shared dashboard layout and navigation shell. Do not create a second sidebar or page-specific shell.
- Follow the existing Budgets page's visual language. Do not introduce a new theme, new colors, gradients, shadows or decorative visual system.
  Out of scope: total balance or net worth card, customizable widgets, drag and drop, export, date ranges, new charts beyond the two from 07a, animations, new endpoints.

2. Existing backend endpoints (all already used by earlier slices)
   Method Path Params Used for
   GET /reports/monthly-income-vs-expense start_month, end_month Summary cards and trend
   GET /reports/category-spending start_month, end_month Top categories
   GET /reports/budget-vs-actual start_month, end_month Budget alerts
   GET /reports/overdue-bills, /reports/upcoming-bills days_ahead (30) Bills card
   GET /accounts none Account balances
   GET /reports/savings-progress none Savings card

Facts to respect:

- The monthly report only returns months with activity. For a month with no row, show Rs. 0.00 using the constant string "0.00". That is a display fallback, not arithmetic.
- net_amount is income minus expenses and excludes savings contributions. Label it Net (income − expenses) and add the helper text Savings contributions are not deducted.
- Category spending includes categories with expense_count 0. Filter with expense_count > 0 before taking the first five. This is a count comparison, not money arithmetic.
- percent_used can be null: show —.
- AccountRead.balance is the stored running balance. Reconciliation lives on /reports.
- Use the exact response property names from src/types/index.ts and src/types/api.d.ts. Do not invent aliases or calculate missing values in the frontend.

3. Types and hooks
   No new API types and no new report hooks. Reuse:
   Hook From
   useMonthlyIncomeExpense(range) hooks/use-reports.ts
   useCategorySpending(range) hooks/use-reports.ts
   useSavingsProgress() hooks/use-reports.ts
   useBudgetVsActual(month) hooks/use-budgets.ts
   useBillSchedule(30) hooks/use-bills.ts
   useAccounts() hooks/use-accounts.ts

Ranges:

- Summary and categories use { start: month, end: month }.
- Trend uses { start: shiftMonth(month, -5), end: month }.
  shiftMonth is pure string and integer math on YYYY-MM (for example shiftMonth("2026-11", -5) returns "2026-06"). Do not use new Date with date strings.
  Month initialization and query behavior
  The Budgets page already establishes the expected month-input visual pattern. The Dashboard month selector must use the same MonthInput component and the same currentMonthInput() helper.

Avoid initializing the selected month with different server and browser values. Do not read the current date during the initial render in a way that can produce different server-rendered and client-rendered markup.

Use this behavior:

1. Initialize month state to an empty string.
2. After the component mounts, set it to currentMonthInput() in useEffect.
3. While month is empty, disable all month-dependent queries using the query hooks' enabled option or the existing supported hook pattern. Do not send empty or malformed month parameters.
4. Once the month is initialized, enable the month-dependent queries.
5. If the user clears the month input, restore the current month. The dashboard always represents one selected month; it does not have an all-time mode.
6. Changing the month must not cause bills, accounts or savings queries to refetch.
   Do not change shared hook behavior globally just to implement this page. If an existing hook does not expose a safe enabled option, inspect its implementation and make the smallest compatible change within the files allowed by this spec. Do not add duplicate hooks.
7. Files to create or modify
   All paths are under frontend/src/. One component per file, kebab-case filenames, PascalCase exports.
   File Action Responsibility
   lib/dates.ts Change Add shiftMonth(monthInput: string, delta: number): string
   app/(dashboard)/page.tsx Change Server component rendering only <DashboardView />
   components/dashboard/dashboard-view.tsx Add Client component: header, month selector, grid layout
   components/dashboard/summary-cards.tsx Add Four summary cards
   components/dashboard/trend-card.tsx Add Six-month chart using IncomeExpenseChart
   components/dashboard/budget-alerts-card.tsx Add Budgets with status other than OK
   components/dashboard/category-snapshot-card.tsx Add Top five categories using CategorySpendingChart
   components/dashboard/bills-snapshot-card.tsx Add Overdue and upcoming bills
   components/dashboard/accounts-card.tsx Add Account balances list
   components/dashboard/savings-snapshot-card.tsx Add Goal progress list

Do not modify the shared layout, sidebar, top navigation, design tokens, reports page or budget page. Do not add files outside this table unless an existing project convention makes a required import impossible; if so, stop and report the blocker instead of expanding scope. 5. Visual design and layout requirements
The supplied Budgets screenshot is the visual reference. The dashboard must look like another page in the same application, not a separate template.
Shared application shell

- Render inside the existing (dashboard) route layout.
- Preserve the shared sidebar, its collapse/expand control, and the top application bar.
- Keep the same page background, content container width, horizontal alignment and responsive padding as the Budgets page.
- Do not add another sidebar, top bar, logo or navigation menu.
- Do not change the navigation active-state implementation. The existing Dashboard navigation item should be active on /.
  Page heading and month filter
  Use PageHeader:
- Title: Dashboard
- Description: A quick view of your household finances.
  Do not put the month selector inside the PageHeader action slot. The Budgets screenshot places its month filter on a separate row below the page heading and divider. Follow that pattern:
- Render a divider after the page heading, using the same existing page structure as Budgets.
- Below it, render a compact filter row with Label Month and MonthInput.
- Keep the filter aligned with the main content's left edge.
- Use the existing MonthInput component, not a native date input or a new custom picker.
- On narrow screens, allow the filter row to wrap without horizontal overflow.
  Dashboard grid
  Use the existing page container and spacing conventions. The dashboard should be information-dense but readable, with consistent card gaps and no unnecessary blank vertical area.

1. Summary cards: grid gap-4 sm:grid-cols-2 lg:grid-cols-4
2. Trend (lg:col-span-2) and Budget alerts (one column): grid gap-4 lg:grid-cols-3
3. Top categories and Bills: grid gap-4 lg:grid-cols-2
4. Accounts and Savings: grid gap-4 lg:grid-cols-2
   Everything stacks to one column on mobile. Each card is a DataCard, and each section has an aria-labelledby heading.

Use the existing shared DataCard styling from 07a. Cards should use the same white surface, subtle border, corner radius and typography already used by the Budgets page and other existing pages. Do not hardcode colors or introduce new CSS tokens.
Card hierarchy and spacing

- The four summary cards should be visually compact and aligned to equal heights.
- Use a small muted label and a prominent Money value. Do not add decorative icons unless the existing design system already uses them consistently for comparable summary cards.
- Other cards should use the shared DataCard title and description. Avoid nested cards inside a DataCard unless the existing component requires them.
- Tables and lists should use existing shared table/list patterns where available.
- Keep numeric values right-aligned and use tabular-nums.
- Do not make every value bold. Use typography hierarchy: card title, primary value, supporting label.
- Use the existing spacing scale and responsive breakpoints. Avoid fixed widths that cause overflow.
- Long category, account, bill or goal names must wrap or truncate according to existing component conventions without pushing numeric values off-screen.

6. Card requirements
   Summary cards (shadcn Card, one small label and one large Money value):
   Card Value Style
   Income total_income text-income
   Expenses total_expense text-expense
   Net (income − expenses) net_amount Neutral text; helper text under it
   Savings contributed total_savings Neutral text (teal chart token allowed)

A negative net is shown by formatMoney with a leading minus. Do not add arrows or percentages.

Use the monthly report row matching the selected month. If no row exists for that month, display Rs. 0.00 for all four cards using the constant string "0.00". Do not create a synthetic report row or perform calculations. Add helper text under Net: Savings contributions are not deducted.

Trend card: title Last six months, description Income and expenses by month. Months with no activity are not shown. Chart only, no table. Reuse IncomeExpenseChart from 07a. Empty title No activity yet, description Record income or expenses to see your trend. The trend range ends at the selected month and starts five months earlier. It may show fewer than six bars because the API omits months without activity.

Budget alerts: title Budget alerts, description Categories near or over their limit this month. Rows from useBudgetVsActual(month) where status !== "OK", Over budget first, then Near limit (stable sort by a fixed rank map). Each row: category name, Badge (Over budget destructive, Near limit amber/outline, as in BudgetProgress), formatPercent(percent_used), and Actual of Limit using Money. If percent_used is null, show —. Footer link View budgets to /budgets. Two empty cases:

- No budget rows at all: No budgets for this month, description Set monthly limits to get alerts., link to /budgets.
- Rows exist but none flagged: All budgets are within limits, description No category is near or over its limit this month.
  Top categories: title Top spending categories, description Highest spending this month. CategorySpendingChart with the first five rows (after the expense_count > 0 filter). Footer link Full report to /reports. Empty title No spending this month, description Expenses you record will appear here.

Bills: title Bills needing attention, description Overdue bills and bills due in the next 30 days. Not affected by the month. Show overdue first, then upcoming, at most five rows in total. Each row: bill name, formatDate(due_date), Money of amount_due, and a badge: {days_overdue} days overdue (destructive) or Due in {days_until_due} days (neutral). Use the server-provided day values. Never calculate days in the browser. Always include text, never color alone. Footer link Go to Bills to /bills. Empty title No bills due, description Nothing is overdue or due in the next 30 days.

Accounts: title Accounts, description Current balance of each account. Not affected by the month. One row per account: name, type, Money of balance. No total row. Footer link Reconciliation report to /reports. Empty title No accounts yet, description Add accounts in Settings to see balances.

Savings: title Savings goals, description Progress toward each goal. Not affected by the month. Up to four goals as listed by the API: name, Progress with toProgress(completion_percent), formatPercent text, and Money for contributed and target. A goal with toProgress(...) === 100 gets the same green Completed badge as savings-goal-card.tsx. Footer link View savings to /savings. Empty title No savings goals yet, description Create a goal on the Savings page.

Footer links use the shadcn Button with the render prop and next/link (Base UI, not Radix asChild). Read an existing usage first. 7. States and behavior

- Every card: skeleton while loading, ErrorState with Retry, empty states as above.
- Use the shared DataState behavior through DataCard. Do not implement a second loading/error framework.
- A failed query must affect only its own card. Do not conditionally hide the entire dashboard because one endpoint failed.
- Changing the month refetches the month-dependent cards only: summary, trend, categories and budget alerts. Bills, accounts and savings keep their cache.
- After any write elsewhere (expense, income, bill payment, contribution, savings goal, budget), the dashboard is current because 07a added invalidateReports to those mutations and the existing accounts, billSchedule and budgetVsActual invalidations remain. Verify this in the browser, do not assume.
- Do not show a stale selected month in the UI while requests are being made for a different month. React Query should use the selected month as part of each relevant query key.

8. Error handling
   Always show the server's detail.
   Case UI
   Any GET network error That card's ErrorState with Retry; other cards still work
   422 or 5xx on a report That card's ErrorState with the server message

Do not swallow API errors, replace server messages with generic text, or add browser-side fallback calculations. 9. Backend gaps
None required. A total balance across accounts card is intentionally not built because it needs summing, and the browser must not do arithmetic. If you want it later, add one SQL report in backend/sql/reports/, expose it as a new GET /reports/... route and test it. Do that as a separate backend change, not in this slice. 10. Acceptance criteria

- [ ] / shows the dashboard with the current month selected; the placeholder text is gone.
- [ ] Dashboard uses the same shared sidebar, top bar, page background, content width and heading style as Budgets. Sidebar collapse/expand continues to work.
- [ ] Month selector appears in a separate filter row below the heading divider, consistent with Budgets.
- [ ] The four summary cards match the /reports income vs expenses table row for the same month.
- [ ] A month with no activity shows Rs. 0.00 in all four cards.
- [ ] Changing the month updates summary, trend end, categories and budget alerts only.
- [ ] Trend shows at most six months ending at the selected month.
- [ ] Budget alerts list only Near limit and Over budget rows, with both empty variants working.
- [ ] Bills card shows at most five rows, overdue first, with text badges from days_overdue and days_until_due.
- [ ] Accounts show stored balances and no total.
- [ ] Savings show up to four goals and use the existing progress and completed-badge patterns.
- [ ] Add an expense on /expenses, open /: income, expense, account balance and (if a budget exists) budget alert are updated.
- [ ] Stopping the backend shows card-level error states with Retry.
- [ ] Layout works at mobile, tablet and desktop widths without horizontal overflow.
- [ ] No money arithmetic, no raw colors, no fetch outside lib/api.ts, no new endpoints.
- [ ] Only the files in section 4 changed.
- [ ] npm run lint and npm run build pass.

11. Coding agent instructions
    Before coding:
1. Read 00_frontend_overview.md, frontend_design_theme.md, 07a_reports.md and this spec.
1. Inspect the 07a hooks and components (use-reports.ts, income-expense-chart.tsx, category-spending-chart.tsx, data-card.tsx), the existing hooks listed in section 3, savings-goal-card.tsx and budget-progress.tsx.
1. Inspect app/(dashboard)/layout.tsx (or the actual shared route layout) and components/layout/\* to confirm how the sidebar and top bar are shared. Do not modify them.
1. Inspect the Budgets page and its view to reuse the exact page-header, divider, month-filter and container patterns. Do not copy the entire Budgets page or duplicate its layout.
1. Verify the real field names against src/types/api.d.ts, including the return shape of useBillSchedule ({ overdue, upcoming }).
1. Verify how existing query hooks support enabled before implementing month initialization. Do not trigger requests with an empty month.
1. List the files you will create and change.
   Implement only this slice. If something is genuinely missing, stop and report it. After implementing, report: files created and changed, components built, hooks reused, lint and build results, and any unresolved issue. Do not claim completion unless the page was tested against the running backend.

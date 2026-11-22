# 01 — Shell and API Client

Read `00_frontend_overview.md` first. Where this file and `00` disagree, this file wins for slice 01 only (the "Edits to other docs" list at the end says what to fix in `00` afterwards).

## Goal

Finish the app shell (layout, sidebar, header), the API client, formatters, shared loading/error/empty states and the four lookup hooks, so every later slice (`02`–`08`) only adds a page.

**Starting point.** A first pass of this slice is already in the repo. Inspect it, keep what is correct, and change only what is listed here. Do not rewrite files that are marked Keep.

| File (under `frontend/src/`)        | Status | What to do                                                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `app/layout.tsx`, `app/globals.css` | Keep   | Font, title and tokens are correct. Only remove the duplicate `--sidebar*` lines (see UI 5) |
| `app/providers.tsx`                 | Change | Do not retry 4xx errors (Behaviour 2)                                                       |
| `app/page.tsx`                      | Move   | Move to `app/(dashboard)/page.tsx`, remove the `<DashboardShell>` wrapper (UI 1)            |
| `components/layout/dashboard-shell` | Change | Used by the new route-group layout, not by pages                                            |
| `components/layout/app-sidebar.tsx` | Change | Active-route rule, close the mobile sheet on navigation (UI 2)                              |
| `components/layout/app-header.tsx`  | Keep   |                                                                                             |
| `components/shared/page-header.tsx` | Keep   |                                                                                             |
| `components/shared/data-state.tsx`  | Change | Accessibility fixes and a new `DataState` wrapper (UI 4)                                    |
| `components/shared/money.tsx`       | Change | Use `cn`, handle invalid values (UI 4)                                                      |
| `components/shared/month-input.tsx` | Keep   |                                                                                             |
| `lib/api.ts`                        | Change | Error normalisation fixes, `getErrorMessage` (Behaviour 1)                                  |
| `lib/formatters.ts`                 | Change | Deterministic dates, string percent, `toProgress` (Behaviour 3)                             |
| `lib/dates.ts`                      | Add    | Local-time date helpers (Behaviour 4)                                                       |
| `types/index.ts`                    | Change | Complete the alias list (Types)                                                             |
| `hooks/query-keys.ts`               | Add    | Central query keys (Behaviour 5)                                                            |
| `hooks/use-members.ts` + 3 more     | Add    | Lookup hooks (Behaviour 6)                                                                  |

# Route

No page of its own. This slice owns the shell that wraps every page.

- Root `app/layout.tsx` keeps `<html>`, fonts and `<Providers>` only.
- A route group `app/(dashboard)/` holds `layout.tsx` (renders `<DashboardShell>{children}</DashboardShell>`) and `page.tsx` (the `/` placeholder). Route groups do not change URLs, so the dashboard stays at `/`.
- Slices `02`–`08` add `app/(dashboard)/expenses/page.tsx` etc. They never import `DashboardShell`.
- `/` keeps the existing "Dashboard coming next" `EmptyState` until slice `07`.

Why a layout and not a wrapper in each page: a layout stays mounted while the user navigates, so the sidebar does not remount, flicker or lose its open/closed state.

Next.js 16 note: before writing the layout, read the layout and route-group guides in `frontend/node_modules/next/dist/docs/` (see `frontend/AGENTS.md`). The root layout already uses the generated `LayoutProps<"/">` helper; a nested layout uses `LayoutProps<"/">` the same way.

# Endpoints used

Lookup hooks only. All are `GET`, no query params, full array response (no pagination):

| Hook               | Endpoint          |
| ------------------ | ----------------- |
| `useMembers`       | `/members`        |
| `useAccounts`      | `/accounts`       |
| `useCategories`    | `/categories`     |
| `useIncomeSources` | `/income-sources` |

Paths have no trailing slash. Base URL is `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). Do not call `/health` from the UI.

# Types

Source of truth is `src/types/api.d.ts`. Regenerate with `npm run gen:api` (backend running) and commit it. Never hand-edit it.

`src/types/index.ts` must export these aliases (all names exist in the generated schemas today):

```ts
import type { components } from "./api";
type S = components["schemas"];

export type Member = S["MemberRead"];
export type Account = S["AccountRead"];
export type Category = S["CategoryRead"];
export type IncomeSource = S["IncomeSourceRead"];
export type Income = S["IncomeRead"];
export type Expense = S["ExpenseRead"];
export type ExpenseResult = S["ExpenseResult"];
export type Bill = S["BillRead"];
export type BillPayment = S["BillPaymentRead"];
export type Budget = S["BudgetRead"];
export type SavingsGoal = S["SavingsGoalRead"];
export type SavingsContribution = S["SavingsContributionRead"];

export type AccountBalanceRow = S["AccountBalanceRow"];
export type BillDueRow = S["BillDueRow"];
export type BudgetVsActualRow = S["BudgetVsActualRow"];
export type CategorySpendingRow = S["CategorySpendingRow"];
export type MemberSpendingRow = S["MemberSpendingRow"];
export type MonthlyIncomeExpenseRow = S["MonthlyIncomeExpenseRow"];
export type SavingsProgressRow = S["SavingsProgressRow"];

export type AccountType = S["AccountType"];
export type CategoryType = S["CategoryType"];
export type MemberRole = S["MemberRole"];
```

Generated-type facts every slice must respect:

- Money fields (`amount`, `balance`, `limit_amount`, `actual_amount`...) are `string`.
- `percent_used` (budget report) is `string | null` and `completion_percent` (savings report) is `string`. They are decimal strings, not numbers.
- `AccountRead.account_type`, `CategoryRead.category_type` and `MemberRead.role` are typed as plain `string` in the Read schemas, while the Create schemas use the enums. Compare against the enum aliases above (`const EXPENSE: CategoryType = "Expense"`), never a loose string literal in a component.
- `Expense.created_at` and similar are date-times; `transaction_date` and `budget_month` are plain dates.

# UI

## 1. Shell structure

```
RootLayout  →  Providers  →  (dashboard)/layout.tsx  →  DashboardShell
DashboardShell = SidebarProvider > AppSidebar + SidebarInset > AppHeader + <main> > page content
```

- `<main>` keeps `bg-muted/30`; page content sits in a `max-w-6xl` centred container with `gap-6 p-4 md:p-6` (already implemented).
- `DashboardShell` stays a client component. The route-group `layout.tsx` stays a server component.

## 2. Sidebar

Keep the existing `navigation` array (order: Dashboard, Expenses, Income, Bills, Savings, Budgets, Reports, Settings; icons from `lucide-react`) and the Base UI `render={<Link … />}` composition. Changes:

- **Active rule:** `href === "/" ? pathname === "/" : pathname.startsWith(href)`. An exact match breaks as soon as a page has a sub-route.
- **Mobile close:** the sidebar is now persistent, so the mobile sheet no longer closes by remounting. Read `setOpenMobile` from `useSidebar()` and call `setOpenMobile(false)` in each link's `onClick`. Do not use an effect that sets state on route change.
- Navigation is plain links. No role-based hiding, no user menu, no logout (out of scope in `00`).
- Desktop: fixed sidebar. Below 768px it becomes the shadcn `Sheet` opened by the header trigger (already how `collapsible="offcanvas"` behaves).

## 3. Header

Keep `AppHeader` as is: `SidebarTrigger` (with `aria-label`), a divider and the app name. No page title here; each page renders its own `PageHeader`.

## 4. Shared components (`components/shared/`)

**`data-state.tsx`** keeps `LoadingState`, `ErrorState` and `EmptyState`, with these changes:

- `LoadingState`: put `role="status"` and `aria-busy="true"` on the wrapper and add `<span className="sr-only">Loading</span>`. An `aria-label` on a plain `div` is not announced.
- `ErrorState`: take its message from `getErrorMessage(error)` (Behaviour 1). Keep the title "Unable to load data" and the **Retry** button.
- `EmptyState`: unchanged (title, description, optional `action`).
- **New `DataState<T>`**, so pages do not repeat the loading/error/empty ladder:

```tsx
type DataStateProps<T> = {
  query: Pick<UseQueryResult<T>, "data" | "error" | "isPending" | "refetch">;
  empty: React.ReactNode; // usually an <EmptyState …/>
  isEmpty?: (data: T) => boolean; // default: Array.isArray(data) && data.length === 0
  loading?: React.ReactNode; // default: <LoadingState />
  children: (data: T) => React.ReactNode;
};
```

Render order: `isPending` → loading; `data === undefined && error` → `ErrorState` with `onRetry={() => query.refetch()}`; empty → `empty`; otherwise `children(data)`. If a background refetch fails but data is already cached, keep showing the data (do not replace the table with an error).

**`money.tsx`**: `Money({ value, className })` renders `<span className={cn("tabular-nums", className)}>{formatMoney(value)}</span>`. Use `cn` from `@/lib/utils` instead of string concatenation. No colour logic inside; callers pass `text-income` / `text-expense`.

**`month-input.tsx`**, **`page-header.tsx`**: unchanged.

## 5. Tokens

`globals.css` `:root` currently declares `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground` and `--sidebar-border` twice (the shadcn defaults, then the navy values). The later ones win, so nothing is visibly wrong. Delete the first (light) set so each token is declared once. Do not touch the `.dark` block.

# Behaviour

## 1. `lib/api.ts`

Public surface stays exactly as in `00` section 10: `apiGet<T>(path, params?)`, `apiPost<T>(path, body)`, `apiPatch<T>(path, body)`, `apiDelete(path)`, `class ApiError`. Add one export: `getErrorMessage(error: unknown): string` (returns `error.message` for an `ApiError`, otherwise `"Something went wrong."`). Toasts and `ErrorState` both use it.

Changes to the existing implementation:

- Base URL: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"` (use `||`, so an empty variable also falls back).
- Params: still drop `undefined`, `null` and `""`. Booleans and numbers become strings.
- Network failure (fetch throws): `ApiError(status 0, "Cannot reach the backend. Check that it is running (a sleeping Neon database can take a few seconds to wake) and try again.")`.
- Error body, in this order:
  1. `detail` is a string → `ApiError(detail, status)`.
  2. `detail` is an array (`422`) → build `fieldErrors` from each item's last `loc` element when it is a string (first message wins per field). If `fieldErrors` is non-empty, the message is "Please correct the highlighted fields."; otherwise the message is the first item's `msg` (body-level errors have no field).
  3. Body is not JSON, or has no usable `detail` → `ApiError("Request failed (<status>).", status)`.
- `204` returns `undefined`. Success bodies are returned as parsed JSON, untouched: money stays a string.
- `fetch` appears only in this file. No retries inside the client.

## 2. `app/providers.tsx`

Keep `QueryClientProvider` with `staleTime: 30_000`. Change `retry` to a function that returns `false` for an `ApiError` with status 400–499 and otherwise allows one retry. A rejected request (404, 409, 422) will not improve on retry, and it would delay the error state. Mutations are not retried (the TanStack default).

The sonner `<Toaster />` is added to this file in slice `02`, when `sonner` is installed. Do not install it here.

## 3. `lib/formatters.ts`

Pure display functions. `Number()` is allowed in `formatMoney`, `formatPercent` and `toProgress`, nowhere else in the app except the chart adapter.

| Function                                                      | Input → output                                                                                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatMoney(value: string)`                                  | `"25000.00"` → `Rs. 25,000.00`; `"-500"` → `-Rs. 500.00`; not a finite number (`""`, `"abc"`) → `—`                                                   |
| `formatDate(value: string)`                                   | `"2026-11-21"` → `21 Nov 2026`; `"2026-09-05"` → `5 Sep 2026`. Uses the first 10 characters, so a date-time string also works                         |
| `formatMonth(value: string)`                                  | `"2026-11-01"` → `Nov 2026`                                                                                                                           |
| `formatPercent(value: string \| number \| null \| undefined)` | `"80.50"` → `80.5%`; `null` / `undefined` / non-numeric → `—`                                                                                         |
| `toProgress(value: string \| null \| undefined)`              | Decimal string → number clamped to 0–100 for a `Progress` bar width; `null` → `0`. This clamps for display only. It does not change the shown percent |

Implementation notes:

- `formatDate` and `formatMonth` use a constant `MONTHS = ["Jan", …, "Dec"]` array and string splitting. Do **not** use `Intl.DateTimeFormat("en-GB")`: it returns `Sept` for September (verified on Node 22), which breaks the `21 Nov 2026` format, and its output can differ between server and browser (hydration warnings).
- Never call `new Date("YYYY-MM-DD")` on a date string (parses as UTC and can shift the day).
- `formatMoney` keeps `en-US` grouping, two decimals and the minus sign in front of `Rs.`.

## 4. `lib/dates.ts` (new)

Small helpers for form defaults and the month input, all in **local** time:

```ts
todayISO(): string                       // "2026-11-22", built from getFullYear/getMonth/getDate
currentMonthInput(): string              // "2026-11" (value for <input type="month">)
monthInputToApi(value: string): string   // "2026-11" → "2026-11-01"
apiToMonthInput(value: string): string   // "2026-11-01" → "2026-11"
```

Why: `new Date().toISOString().slice(0, 10)` is UTC. In Pakistan (UTC+5) it returns yesterday's date between 00:00 and 05:00, so a form's default "today" would be wrong. Slices `02`, `03`, `04` and `06` import these instead of writing their own.

## 5. Query keys (`hooks/query-keys.ts`)

One object, so a write in one slice can invalidate a query owned by another:

```ts
export const queryKeys = {
  members: ["members"] as const,
  accounts: ["accounts"] as const,
  categories: ["categories"] as const,
  incomeSources: ["income-sources"] as const,
};
```

Convention for later slices: add `["<resource>", params]` entries here (for example `expenses: (filters) => ["expenses", filters] as const`). Never write an inline key array in a hook or in an `invalidateQueries` call.

## 6. Lookup hooks (`hooks/use-*.ts`)

Four hooks, same pattern, so a row's `member_id`, `account_id`, `category_id` or `income_source_id` can be shown as a name (`00` rule 8):

```ts
// hooks/use-members.ts
export function useMembers() {
  const query = useQuery({
    queryKey: queryKeys.members,
    queryFn: () => apiGet<Member[]>("/members"),
  });
  const byId = useMemo(
    () => new Map((query.data ?? []).map((m) => [m.member_id, m])),
    [query.data],
  );
  return { ...query, byId };
}
```

Usage in a table: `byId.get(row.member_id)?.full_name ?? "—"`.

Per hook:

| Hook               | Id field           | Extra                                                                                                                   |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `useMembers`       | `member_id`        | Returns all members including inactive ones, so old rows still show a name. Forms offer only `is_active` members        |
| `useAccounts`      | `account_id`       | Balances change on every write: every money mutation must invalidate `queryKeys.accounts`                               |
| `useCategories`    | `category_id`      | Also returns `incomeCategories` and `expenseCategories` (filtered by the `CategoryType` values). `byId` covers all rows |
| `useIncomeSources` | `income_source_id` |                                                                                                                         |

These hooks contain no JSX and no money maths. Forms must use `expenseCategories` for expense, bill and budget forms and `incomeCategories` for income forms, because a database trigger rejects the wrong type.

## 7. Edits to other docs (do after the code is done)

1. `00_frontend_overview.md`: section 6 rule 3 and section 10 say `Number()` is allowed only in `formatMoney` and the chart adapter. Add `formatPercent` and `toProgress`. In section 4, add `lib/dates.ts` and `hooks/query-keys.ts`.
2. Root `AGENTS.md` and `frontend/AGENTS.md` say `src/app/page.tsx` redirects to `/dashboard` and show a `/dashboard` route. `00` and the sidebar use `/`. Change both AGENTS files to: dashboard is `src/app/(dashboard)/page.tsx` at `/`, no redirect.
3. Both AGENTS files point to `frontend_spec/` at the repo root, but the specs live in `.cursor/spec/frontend_spec/`. Either move the folder to the repo root or update the paths. Pick one and keep `00` section 4 consistent.

# Backend gaps

None. All four lookup endpoints exist and return full arrays.

# Out of scope

- Any page content: expenses, income, bills, savings, budgets, reports, dashboard data, settings. `/` stays the placeholder.
- Login, role switching, user menu, route guards.
- Installing `react-hook-form`, `zod`, `sonner`, `recharts`, or adding shadcn `card`, `table`, `dialog`, `select`, `badge`, `progress`, `alert-dialog`. Each slice adds what it needs.
- `confirm-delete.tsx` and a status badge component (added by the slices that first use them: `04`, `06`, `08`).
- Dark-mode toggle, animations, i18n, UI test runner.

# Done when

- [ ] `npm run lint` and `npm run build` pass with no errors or warnings about this slice.
- [ ] `frontend/.env.local` exists with `NEXT_PUBLIC_API_URL=http://localhost:8000` and is not tracked by git (`git status` does not list it).
- [ ] `npm run gen:api` runs with the backend up and `src/types/api.d.ts` has no diff afterwards.
- [ ] `/` shows the navy sidebar, header and the placeholder. No `DashboardShell` import remains in any `page.tsx`.
- [ ] Clicking a sidebar link on a phone-width window navigates **and** closes the sheet. On desktop the sidebar does not remount between pages.
- [ ] The active item is highlighted for `/` and for a nested path such as `/expenses/anything`.
- [ ] A temporary line in the placeholder page calls `formatDate("2026-09-05")`, `formatMoney("-500")`, `formatMoney("abc")`, `formatPercent("80.50")` and shows `5 Sep 2026`, `-Rs. 500.00`, `—`, `80.5%`. Remove the line afterwards.
- [ ] A temporary page using `useMembers()` with `DataState` shows: skeleton while loading, the member names with the backend up, the error state with **Retry** when the backend is stopped (hard reload), and the empty state against an empty list. Retry recovers once the backend is back. Remove the page afterwards.
- [ ] `getErrorMessage` shows the backend `detail` for a 409 or 422 (try `POST /members` with a duplicate email from `/docs` and call `apiPost` from the temporary page).
- [ ] `grep -rn "fetch(" src` finds only `lib/api.ts`. No `any`, no `console.log`, no raw colour classes in the files touched.
- [ ] The three doc edits in Behaviour 7 are made.

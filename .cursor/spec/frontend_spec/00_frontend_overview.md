# 00 — Frontend Overview

**Read this before every slice spec (`01`–`08`).** It holds the rules that apply to every page. Each slice spec adds only what is specific to its page, and where the two disagree, this file wins.

|                 |                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Project         | Family Finance Management System (Database Systems project, BS AI Batch 25, DUET)                                 |
| Frontend        | `/frontend`: Next.js, TypeScript, Tailwind, shadcn/ui                                                             |
| Backend         | `/backend`: FastAPI + SQLModel on PostgreSQL (Neon). Finished. The UI adapts to the API, never the reverse        |
| Written against | repo commit `ab4b287` (backend routers and `schemas.py`). The frontend has since been moved under `frontend/src/` |

---

## 1. Goal

Build a thin web UI over the finished backend, so a household can record income and expenses, watch budgets, pay bills, track savings goals and read reports in one place.

The UI is a **presentation layer**. Every amount, balance, total, percentage, status and warning comes from the API, which gets it from PostgreSQL constraints, transactions, views and report SQL. The frontend displays data, collects input and calls endpoints. It does not decide anything about money.

The course grades the database, so the UI exists to make database behaviour visible in the demo: an expense that changes an account balance, a budget warning, a duplicate bill payment rejected, a failed transaction shown as an error, and the reports.

## 2. Scope

### Pages

| Route              | Spec                         | Purpose                                                              |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| (shell)            | `01_shell_and_api_client.md` | Sidebar, header, API client, formatters, shared states, lookup hooks |
| `/expenses`        | `02_expenses.md`             | Expense table, filters, add dialog, budget warning                   |
| `/income`          | `03_income.md`               | Income table, filters, add dialog                                    |
| `/bills`           | `04_bills.md`                | Bill schedule, record payment                                        |
| `/savings`         | `05_savings.md`              | Goal cards, contribution dialog                                      |
| `/budgets`         | `06_budgets.md`              | Monthly budgets with progress                                        |
| `/reports` and `/` | `07_reports_dashboard.md`    | Reports, then the dashboard that reuses them                         |
| `/settings`        | `08_settings.md`             | Members, accounts, categories, income sources                        |

Sidebar order is: Dashboard, Expenses, Income, Bills, Savings, Budgets, Reports, Settings. Build order is the table order above.

### Out of scope (do not build, do not stub)

- Login, sessions, JWT, route guards, or hiding pages by role. The backend defers authentication, so the UI must not pretend roles are enforced. Roles appear only as a read-only value in Settings → Members.
- A "current user". Forms pick the member explicitly from a Select.
- Editing or deleting past transactions. The API only creates and reads income, expenses, bill payments and contributions.
- Pagination, dark-mode toggle, animations, export or print, i18n.
- New backend endpoints. If something is missing, write it under `# Backend gaps` in that slice spec and stop.
- UI test suites. No test runner is installed. Verification is `npm run lint`, `npm run build` and the slice's "Done when" checklist.

## 3. Stack

Installed today (`frontend/package.json`):

| Concern       | Choice                                                                           | Notes                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router, React 19, TypeScript `strict`                             | Next 16 differs from older tutorials. Before writing routing or data code, read the relevant guide in `node_modules/next/dist/docs/` (see `frontend/AGENTS.md`).                    |
| Styling       | Tailwind CSS v4, CSS-first                                                       | Tokens live in `src/app/globals.css` under `@theme inline`. There is no `tailwind.config`.                                                                                          |
| Components    | shadcn/ui, style `base-nova`, built on **Base UI** (`@base-ui/react`), not Radix | Base UI composes with the `render` prop, not Radix `asChild`. Do not copy Radix-era snippets. Read the generated file in `src/components/ui/` and the installed shadcn skill first. |
| Icons / utils | `lucide-react`, `cn` from `@/lib/utils`                                          |                                                                                                                                                                                     |

Default libraries, installed only when a slice needs them:

| Package                                         | Purpose                                 | First needed in |
| ----------------------------------------------- | --------------------------------------- | --------------- |
| `openapi-typescript` (dev)                      | Generate API types from the backend     | 01              |
| `@tanstack/react-query`                         | Fetching, caching, refetch after writes | 01              |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Forms and validation                    | 02              |
| `sonner` (via `npx shadcn@latest add sonner`)   | Toasts                                  | 02              |
| `recharts` (via `npx shadcn@latest add chart`)  | Charts                                  | 07              |

**Other libraries are allowed** when they fit a job clearly better than the default (for example TanStack Table for a sorting-heavy table, or `date-fns` for date handling). Conditions:

1. The slice spec names the library with a one-line reason.
2. It works with Next 16, React 19, Tailwind 4 and Base UI.
3. It does not duplicate a default above or an existing shadcn component.
4. It adds no feature outside section 2 and does not break section 6 (no money arithmetic, no `fetch` outside `api.ts`).

shadcn components are added with the CLI (`npx shadcn@latest add <name>`) when needed. Typical set: `sidebar card table dialog alert-dialog select input label badge progress skeleton sonner chart`. Dates use a native `<input type="date">` inside the shadcn `Input`. Months use `type="month"`.

## 4. Folder structure

The frontend uses a **`src/` folder**. All app code lives under `frontend/src/` and the alias is `@/*` → `./src/*`. Config files (`package.json`, `components.json`, `tsconfig.json`, `next.config.ts`, `.env.local`) and `public/` stay at the `frontend/` root.

```
frontend_spec/                  these spec files (repo root, beside backend/ and frontend/)
frontend/
├── AGENTS.md                   exists: Next.js agent rules
├── components.json             exists: shadcn config (base-nova, aliases @/components, @/hooks ...)
├── .env.local                  create, never commit: NEXT_PUBLIC_API_URL=http://localhost:8000
└── src/
    ├── app/
    │   ├── layout.tsx          root layout: font, <Providers>, app shell
    │   ├── globals.css         design tokens (section 8)
    │   ├── providers.tsx       QueryClientProvider + Toaster ("use client")
    │   ├── page.tsx            Dashboard (/)
    │   ├── expenses/page.tsx
    │   ├── income/page.tsx
    │   ├── bills/page.tsx
    │   ├── savings/page.tsx
    │   ├── budgets/page.tsx
    │   ├── reports/page.tsx
    │   └── settings/page.tsx
    ├── components/
    │   ├── ui/                 shadcn output only. Do not hand-write components here
    │   ├── layout/             app-sidebar.tsx, page-header.tsx
    │   ├── shared/             money.tsx, data-state.tsx, month-input.tsx, confirm-delete.tsx
    │   └── <feature>/          expenses/, income/, bills/, savings/, budgets/, reports/, settings/
    │                           each holds its table, filters and form dialog
    ├── hooks/                  use-members.ts, use-accounts.ts, use-categories.ts,
    │                           use-income-sources.ts, then use-<feature>.ts per slice
    ├── lib/
    │   ├── api.ts              the ONLY place that calls fetch
    │   ├── formatters.ts       formatMoney, formatDate, formatMonth, formatPercent
    │   └── utils.ts            exists: cn
    └── types/
        ├── api.d.ts            GENERATED by openapi-typescript. Never edit by hand
        └── index.ts            short aliases, e.g. export type Expense = components["schemas"]["ExpenseRead"]
```

- Paths written without a prefix elsewhere in this spec (`lib/api.ts`, `hooks/`, `components/shared/`) are relative to `frontend/src/`.
- `page.tsx` files stay tiny: a `PageHeader` plus one feature component. Feature components that use hooks start with `"use client"`.
- Create folders only when a slice needs them.
- One component per file, named in kebab-case (`expense-form-dialog.tsx`), exported as PascalCase.

## 5. Data flow and layers

```
Component  →  hook (TanStack Query)  →  lib/api.ts  →  FastAPI  →  PostgreSQL
 renders       caches, invalidates        fetch + errors   rules        constraints, SQL
```

| Layer               | Does                                                     | Never does                               |
| ------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Component           | Render, local UI state, call hooks, show toasts          | `fetch`, inline money formatting, totals |
| Hook (`hooks/`)     | `useQuery` / `useMutation`, query keys, invalidation     | JSX                                      |
| `lib/api.ts`        | URL building, JSON, typed responses, error normalisation | React, UI                                |
| `lib/formatters.ts` | Pure display formatting                                  | Business arithmetic                      |

Dependency direction mirrors the backend: components → hooks → `api.ts`. Nothing imports upward.

## 6. Rules (apply to every slice)

**Money**

1. Money is a **string** end to end (`"25000.00"`). Pydantic serialises `Decimal` as a JSON string. Confirm the example in `/docs` once.
2. Display is always `Rs. 25,000.00` through `formatMoney()` or `<Money>`. Grouping uses `en-US` (100,000.00), two decimals, minus sign in front for negatives (`-Rs. 500.00`).
3. **No arithmetic on money in the browser**: no sums, differences, percentages or balance maths. Show what the API returns. Comparisons for validation (`amount > 0`) are allowed. The only `Number()` conversions allowed are inside `formatMoney` and the chart data adapter, for display and plotting.
4. Money inputs are text inputs (`inputMode="decimal"`) validated with `^\d{1,10}(\.\d{1,2})?$` and sent as strings. This matches `NUMERIC(12,2)`.

**API and types** 5. All HTTP goes through `lib/api.ts`. No `fetch` or `axios` in components or hooks. 6. Types come from `types/api.d.ts`. Never hand-write a field name, enum value or route. If a field is not in the generated types, it does not exist. 7. Regenerate types whenever the backend changes: `npm run gen:api` (script defined in section 11). 8. IDs only in list responses: an expense carries `member_id`, `account_id`, `category_id`. Resolve names with the lookup hooks (`useMembers`, `useAccounts`, `useCategories`, `useIncomeSources`). This is display mapping, not calculation.

**UI** 9. Use shadcn components for tables, dialogs, selects, cards and inputs. Do not hand-build them. 10. Colours come from semantic tokens only (`text-income`, `bg-warning/15`, `bg-destructive`). No raw palette classes such as `text-green-600` and no hex values. 11. Every data view has loading, error and empty states (section 9). 12. No `any`, no `// @ts-ignore`, no `console.log` left behind. 13. Accessibility basics: every input has a `<Label>`, icon-only buttons have `aria-label`, dialogs close on Esc.

**Forms and writes** 14. Forms use react-hook-form + zod. The zod schema mirrors the backend rules (required, `> 0`, max length) to give early feedback. The backend and database remain the authority, so always handle server errors too. 15. On a successful write, invalidate every query the write affects (the list, account balances, budget report, dashboard), then toast. On failure, keep the dialog open and show the server message. 16. After `POST /transactions/expense` and `POST /transactions/bill-payment`, read `budget_warning` and `over_budget` from the response. Never recompute them. - `over_budget` true → destructive toast ("over budget"). - else `budget_warning` true → amber warning toast ("near budget limit"). - Both false → plain success toast.

**Process** 17. Read this file plus one slice spec at a time. Implement only that slice. Do not touch other pages. 18. Do not add features or endpoints that no spec asks for. A new library is allowed only under the conditions in section 3.

## 7. Backend facts the UI must respect

These come from the routers and `schemas.py`. Slice specs repeat only the ones they use.

- **Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). CORS allows `FRONTEND_ORIGIN` (default `http://localhost:3000`).
- **No auth, no pagination.** List endpoints return the full array. Server filters use query names `member_id`, `category_id`, `from`, `to` (dates, `YYYY-MM-DD`). Sort for display on the client (newest first) if the slice needs it.
- **Errors:** business errors are `{ "detail": "message" }` with status 400, 404, 409 or 422. Request-validation errors are 422 with `detail` as an array of `{ loc, msg, type }`. `api.ts` turns both into one `ApiError` (section 10).
- **Delete is not universal.**
  - DELETE exists for accounts, categories, income sources, budgets. It returns 204, or an error (expect 409) when the row is still referenced (`ON DELETE RESTRICT`).
  - Members, bills and savings goals have no DELETE. Deactivate with `PATCH { is_active: false }`.
  - Transactions are create + read only.
- **PATCH** bodies need at least one field and reject unknown fields.
- **Month fields** (`budget_month`, `period_month`) must be the **first day of a month** (`YYYY-MM-01`), enforced by a database CHECK. The month input sends `${value}-01`.
- **Category types:** income forms offer income categories only. Expense, bill and budget forms offer expense categories only. A database trigger rejects mismatches. Filter the lookup by `category_type` using the value from the generated types.
- **Required relations:** an income needs `income_source_id`. A bill payment needs `bill_id`, `category_id` (must equal the bill's category, so prefill it and lock it) and `period_month`. A savings goal needs `created_by_member_id`.
- **Uniqueness (expect 409):** one budget per category and month, one payment per bill and period, unique account, bill, goal, income-source and category names, unique member email.
- **Bill status** (paid, due, overdue) exists only in `GET /reports/upcoming-bills` and `GET /reports/overdue-bills`, not in `GET /bills`.
- **Account `balance`** is the stored running balance. `GET /reports/account-balances` adds `computed_balance`, `difference` and `is_reconciled`.
- **Budget status** from the report is one of `OK`, `Near limit`, `Over budget`. `percent_used` can be `null`. Show `—` for null, and clamp only the progress bar width to 100%.
- **Passwords:** `password` is required when creating a member, is write-only and is never shown.

## 8. Design tokens

Add these to `src/app/globals.css`. The values are a starting point; adjust in the browser, keep the names. Dark mode is out of scope, so leave the `.dark` block untouched.

| Token                                 | Use                                      |
| ------------------------------------- | ---------------------------------------- |
| `income` (green)                      | Income amounts, positive net             |
| `expense` (red, equals `destructive`) | Expense amounts, over-budget, delete     |
| `warning` (amber)                     | Near-limit, overdue-soon, budget warning |
| `sidebar*` (navy)                     | Sidebar surface, text, active item       |

```css
/* inside @theme inline */
--color-income: var(--income);
--color-expense: var(--expense);
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);

/* inside :root */
--income: oklch(0.62 0.17 150);
--expense: oklch(0.577 0.245 27.325);
--warning: oklch(0.77 0.16 75);
--warning-foreground: oklch(0.35 0.08 70); /* dark text on amber tint */
--sidebar: oklch(0.24 0.06 255);
--sidebar-foreground: oklch(0.97 0 0);
--sidebar-accent: oklch(0.32 0.07 255);
--sidebar-accent-foreground: oklch(0.99 0 0);
--sidebar-border: oklch(0.32 0.06 255);
```

- Amber is used as a tinted background with `text-warning-foreground`, never as plain text on white.
- Status is never colour alone: pair colour with a label or icon (Badge text such as "Over budget").
- Type: Geist (already loaded). Page title `text-2xl font-semibold`, section title `text-lg font-medium`, table text `text-sm`. Numeric columns are right-aligned with `tabular-nums`.
- Layout: fixed sidebar (collapsible on mobile), page container `max-w-6xl`, spacing in multiples of 4.
- Dates display as `21 Nov 2026`, months as `Nov 2026`. Format date strings by splitting `YYYY-MM-DD`, not with `new Date("YYYY-MM-DD")`, which shifts by timezone.

## 9. Standard states

| State           | Rendering                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Loading         | `Skeleton` rows or cards. Never a blank page or a bare spinner                                                    |
| Error           | Message from `ApiError`, a **Retry** button (`refetch`)                                                           |
| Empty           | One sentence plus the primary action ("No expenses yet. Add expense")                                             |
| Mutating        | Submit button disabled with a spinner, dialog stays open                                                          |
| Success         | Toast, dialog closes, affected queries refetched                                                                  |
| Server rejected | Dialog stays open, server `detail` shown in the form. Field-level errors map to fields where `loc` identifies one |

`components/shared/data-state.tsx` implements loading, error and empty once, and every page reuses it.

## 10. API client contract (details are in `01_shell_and_api_client.md`)

```ts
// lib/api.ts public surface: apiGet<T>(path, params?), apiPost<T>(path, body), apiPatch<T>(path, body), apiDelete(path)
// class ApiError extends Error { status: number; fieldErrors?: Record<string, string> }  // fieldErrors from 422 array details
```

Empty or `undefined` params are dropped from the query string. Network failure (backend down, Neon waking up) becomes an `ApiError` with status `0` and a readable message, not an uncaught exception.

## 11. Setup tasks (done once, in slice 01)

1. Confirm the `src/` move is wired up:
   - `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }`.
   - `components.json` has `"css": "src/app/globals.css"`. The aliases (`@/components`, `@/lib`, `@/hooks`) stay as they are.
   - `app/`, `components/` and `lib/` no longer exist at the `frontend/` root. Next ignores `src/app` if a root `app/` is still there.
   - `npm run build` passes before any slice work starts.
2. Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`. It must be gitignored.
3. Confirm the backend runs (`uv run fastapi dev main.py`), `/docs` opens, and seed data exists in Neon (members, accounts, categories, income sources).
4. Install the default packages for slice 01, then add to `package.json` scripts, with the backend running:
   ```json
   "gen:api": "openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts"
   ```
5. Run `npm run gen:api` (even if `src/types/` already has types, so they match the backend) and commit `src/types/api.d.ts`.
6. Fix the scaffold: in `src/app/globals.css` `--font-sans` points at itself, so point it to `var(--font-geist-sans)`; in `src/app/layout.tsx` replace the "Create Next App" title with "Family Finance".

## 12. Slice spec template

Every `02`–`08` file uses these headings, in this order, and stays under about 300 lines.

```
# Goal            one sentence
# Route           /expenses
# Endpoints used  exact method + path + query params, copied from the routers
# Types           which generated schemas it uses (ExpenseRead, ExpenseCreate, ExpenseResult ...)
# UI              table columns, filters, dialog fields, shadcn components
# Behaviour       on submit, what is refetched/invalidated, error handling
# Backend gaps    anything the UI needs that the API lacks (or "none")
# Out of scope    what this slice must not do
# Done when       checklist verifiable in the browser
```

## 13. Working method

Prompt for each slice, one spec at a time:

> Read `frontend_spec/00_frontend_overview.md` and `frontend_spec/<NN_slice>.md`. Inspect the existing frontend and `src/types/api.d.ts`. List the files you will create or change, then implement only what this spec describes. Do not build other pages.

Before starting the next slice:

1. `npm run lint` and `npm run build` pass with no errors.
2. Walk through the slice's "Done when" list in the browser against the real backend.
3. Ask the agent to explain the call flow of the slice, and be able to trace it yourself: form → hook → `api.ts` → endpoint → service → SQL. This is what the viva asks.

## 14. Global definition of done

A slice is done only when all hold, in addition to its own checklist:

- Lint and build pass. No `any`, no `fetch` outside `lib/api.ts`, no money arithmetic, no raw colours.
- Loading, error and empty states exist and were seen working (stop the backend to see the error state).
- Money shows as `Rs. 25,000.00` and dates as `21 Nov 2026` everywhere. After every write the screen updates without a reload.

# Family Finance Management System

Database Systems university project. Backend first, then frontend.

## Tech Stack

- Database: PostgreSQL on NeonDB
- Backend: Python 3.13, uv, FastAPI, SQLModel (SQLAlchemy), numbered SQL migrations, psycopg v3
- Frontend: Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Recharts (via shadcn chart), sonner, lucide-react, react-hook-form + zod (via shadcn Form)
- DATABASE_URL format: `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`
- Secrets only in `.env`. Never commit or print it.

## Approach

- ORM (SQLModel) for CRUD and transactions; hand-written SQL for reports and views.
- Build in vertical slices: schema, migration, repository, service, router, test.
- Frontend is built after the backend, one page per slice, from the specs in `frontend_spec/`.

## Backend Structure (`/backend`)

```
main.py             app setup and router registration only
src/database/       engine, session and numbered SQL migration runner
src/models/         SQLModel tables and request/response models
src/repositories/   database access only, never commits
src/services/       business logic and transaction boundaries
src/routers/        thin HTTP layer
backend/sql/schema/ authoritative numbered DDL files
backend/sql/reports/ raw .sql report queries
backend/sql/seed/    fabricated demo data
tests/              PostgreSQL-backed business-rule tests
```

Create folders only when a slice needs them.

## Frontend Structure (`/frontend`)

```
src/app/(dashboard)/layout.tsx     shared shell: sidebar + header
src/app/(dashboard)/<route>/page.tsx   dashboard, income, expenses, budgets,
                                       bills, savings, reports, settings
src/app/page.tsx                   redirects to /dashboard
src/components/ui/                 shadcn generated components (do not hand-edit)
src/components/layout/             app-sidebar, app-header, page-container
src/components/shared/             page-header, status-badge, empty/loading/error states,
                                   amount (PKR display), month-picker
src/components/<feature>/          feature components: expenses/, income/, bills/,
                                   savings/, budgets/, reports/, settings/, dashboard/
src/lib/api.ts                     the only place that calls fetch
src/lib/formatters.ts              currency (Rs. 25,000.00) and date formatting
src/hooks/                         data hooks (useExpenses, useAccounts, ...)
src/types/api.d.ts                 generated from FastAPI /openapi.json
```

Pages (8): Dashboard, Income, Expenses, Budgets, Bills, Savings Goals, Reports, Settings (tabs: Members, Accounts, Categories, Income Sources).
Build order: shell + api client, Expenses, Income, Bills, Savings, Budgets, Reports then Dashboard, Settings.

## Frontend Approach

- Component-based: `page.tsx` only composes components and holds page state; UI lives in `components/<feature>/`; HTTP lives in `lib/api.ts`; data fetching lives in `hooks/`.
- shadcn/ui first. Use the shadcn skill/MCP to add components (Card, Table, Dialog, Form, Select, Calendar, Tabs, Badge, Progress, Skeleton, Sheet, Alert Dialog, Dropdown Menu). Never hand-build what shadcn provides.
- Small reusable components with one responsibility. Share table and dialog patterns by passing columns/fields, not by building one giant generic component.
- Look: modern finance dashboard. Light background, white cards, navy sidebar (#0F172A). Income green (#16A34A), expense red (#DC2626), warning amber (#D97706). Inter or Geist Sans, tabular numbers for amounts. Responsive: sidebar collapses to a Sheet on mobile.
- Every data view has loading (Skeleton), empty and error states. Every mutation shows a sonner toast.

## Rules

- Dependency direction: routers -> services -> repositories -> database.
- No SQL or business logic in routers or `main.py`.
- Services commit once at the end and roll back on error.
- Expense, income, bill payment and savings contribution each insert a row and update the account balance in one transaction, using a single `UPDATE ... SET balance = balance - :amount`.
- Return a budget warning flag after each expense (near 80% or over the limit).
- Schema is FROZEN. Never edit an applied schema file; add a new numbered file. Apply changes with `python -m src.database.migrate`. Never call `create_all()`.
- Constraints live in the database: CHECK, UNIQUE, NOT NULL, FOREIGN KEY with explicit ON DELETE.
- Money is `NUMERIC(12,2)` / `Decimal`, never float or int.
- Do not store derived totals, except account.balance, which is a deliberate running balance updated by atomic UPDATE statements in the same transaction as the transaction row and verified by the v_account_reconciliation view.
- Raw SQL goes in `backend/sql/reports/*.sql`, run with `text()` and named parameters, never f-strings.
- Use `pool_pre_ping=True` on engines (Neon suspends idle databases).
- Add a test for each business rule.
- Plan briefly before coding. Do not add features or libraries that were not asked for.

### Frontend rules

- All HTTP goes through `lib/api.ts`. No `fetch` inside components. API base URL comes from `NEXT_PUBLIC_API_URL`; no secrets in `NEXT_PUBLIC_` variables.
- Types come from `src/types/api.d.ts` (generated). Never invent field names or endpoints; read the backend routers or `/openapi.json`.
- No financial calculation in the browser. Never compute balances, totals, budget usage or warnings; display what the API returns. After a mutation, refetch.
- The frontend never talks to the database and contains no SQL.
- Show money as `Rs. 25,000.00` using `formatters.ts`. Amounts from the API are decimals; never use float math on them.
- Show backend validation errors (`detail`) to the user; client-side zod validation is for UX only, the database remains the authority.
- Auth and roles are not implemented in the backend. Do not build fake login or role-based hiding.
- Do not edit files in `components/ui/`; compose them.
- Build one page per slice from its spec in `frontend_spec/`. Do not build other pages or add libraries that were not asked for.

## Commands (from `/backend`)

- `uv sync`
- `uv run fastapi dev main.py`
- `uv run python -m src.database.migrate`
- `uv run python -m src.database.migrate --reset` (development only)
- `ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed` (development only)
- `uv run pytest`

Tests require `TEST_DATABASE_URL` and must never use the production `DATABASE_URL`.

## Commands (from `/frontend`)

- `npm install`
- `npm run dev` (http://localhost:3000, backend on http://localhost:8000)
- `npm run lint`
- `npm run build`
- `npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts` (run with the backend up; regenerate after any API change)

The backend uses `account.opening_balance`, the views `v_monthly_income_vs_expense`, `v_bill_schedule`, and `v_account_reconciliation`, and database triggers for category and transaction integrity. Reports include budget-vs-actual, member-spending, category-spending, overdue-bills, upcoming-bills, savings-progress, monthly-income-vs-expense, and account-balances.

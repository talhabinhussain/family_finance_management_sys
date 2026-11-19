# Family Finance Management System

Database Systems university project. Backend first, then frontend.

## Tech Stack

- Database: PostgreSQL on NeonDB
- Backend: Python 3.13, uv, FastAPI, SQLModel (SQLAlchemy), numbered SQL migrations, psycopg v3
- Frontend (later): Next.js, TypeScript, Tailwind, shadcn/ui
- DATABASE_URL format: `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`
- Secrets only in `.env`. Never commit or print it.

## Approach

- ORM (SQLModel) for CRUD and transactions; hand-written SQL for reports and views.
- Build in vertical slices: schema, migration, repository, service, router, test.

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

## Rules

- Dependency direction: routers -> services -> repositories -> database.
- No SQL or business logic in routers or `main.py`.
- Services commit once at the end and roll back on error.
- Expense, income, bill payment and savings contribution each insert a row and update the account balance in one transaction, using a single `UPDATE ... SET balance = balance - :amount`.
- Return a budget warning flag after each expense (near 80% or over the limit).
- Schema is FROZEN. Never edit an applied schema file; add a new numbered file. Apply changes with `python -m src.database.migrate`. Never call `create_all()`.
- Constraints live in the database: CHECK, UNIQUE, NOT NULL, FOREIGN KEY with explicit ON DELETE.
- Money is `NUMERIC(12,2)` / `Decimal`, never float or int.
- Do not store derived totals; compute them with queries or views.
- Raw SQL goes in `backend/sql/reports/*.sql`, run with `text()` and named parameters, never f-strings.
- Use `pool_pre_ping=True` on engines (Neon suspends idle databases).
- Add a test for each business rule.
- Plan briefly before coding. Do not add features or libraries that were not asked for.

## Commands (from `/backend`)

- `uv sync`
- `uv run fastapi dev main.py`
- `uv run python -m src.database.migrate`
- `uv run python -m src.database.migrate --reset` (development only)
- `ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed` (development only)
- `uv run pytest`

Tests require `TEST_DATABASE_URL` and must never use the production `DATABASE_URL`.

The backend uses `account.opening_balance`, the views `v_monthly_income_vs_expense`, `v_bill_schedule`, and `v_account_reconciliation`, and database triggers for category and transaction integrity. Reports include budget-vs-actual, member-spending, category-spending, overdue-bills, upcoming-bills, savings-progress, monthly-income-vs-expense, and account-balances.

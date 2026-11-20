# Family Finance Backend

FastAPI backend for the Family Finance Management System. Commands run from `backend/`.

## Setup

Create `backend/.env` with the Neon connection string:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require
TEST_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/test_db?sslmode=require
ALLOW_DB_RESET=false
```

```bash
uv sync
uv run python -m src.database.migrate
```

For a development-only destructive rebuild:

```bash
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed
```

The runner applies `backend/sql/schema/*.sql` in filename order and records applied files in `schema_migrations`. The schema is FROZEN: never edit an applied schema file; add a new numbered file for future changes.

## Structure and database

```text
backend/
  main.py
  src/database/       connection and migration runner
  src/models/          SQLModel tables and API schemas
  src/repositories/    database access, no commits
  src/services/        business rules and transaction boundaries
  src/routers/         thin HTTP endpoints
  backend/sql/schema/  authoritative PostgreSQL DDL
  backend/sql/reports/ named-parameter report SQL
  backend/sql/seed/    fabricated demo data
  tests/               PostgreSQL-backed tests
```

This is a single-household design with 11 tables: `member`, `account`, `category`, `income_source`, `bill`, `savings_goal`, `budget`, `income`, `expense`, `bill_payment`, and `savings_contribution`. The optional `family` table is not used.

All money is `NUMERIC(12,2)`/`Decimal`. Accounts have an `opening_balance`; financial writes update balances and insert related rows in one transaction. Member passwords are immediately hashed with Argon2id and never returned. Authentication and login are deferred.

The database includes the `v_monthly_income_vs_expense`, `v_bill_schedule`, and `v_account_reconciliation` views, plus category-type and transaction-integrity triggers.

## Run

```bash
uv run fastapi dev main.py
uv run pytest
```

API documentation is available at `/docs`. Setup resources provide CRUD and partial update endpoints (`GET /{id}`, `PATCH /{id}`, and conditional `DELETE /{id}`), transaction endpoints provide creation and filtered history under `/transactions`, and reports are under `/reports`:

- `budget-vs-actual`
- `member-spending`
- `overdue-bills`
- `savings-progress`
- `monthly-income-vs-expense`
- `category-spending`
- `upcoming-bills`
- `account-balances`

Database tests require `TEST_DATABASE_URL`; otherwise they are skipped. Tests abort if it equals `DATABASE_URL`.

```bash
uv run python -m src.database.migrate
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed
uv run pytest
```

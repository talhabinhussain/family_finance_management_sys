# Family Finance Backend

FastAPI backend for the Family Finance Management System. Commands run from `backend/`.

## Setup

Create `backend/.env` with the Neon connection string:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require
```

```bash
uv sync
uv run python -m src.database.migrate
```

For a development-only destructive rebuild:

```bash
uv run python -m src.database.migrate --reset
```

The runner applies `sql/schema/*.sql` in filename order and records applied files in `schema_migrations`. Never edit an applied schema file; add a new numbered file for future changes.

## Structure and database

```text
backend/
  main.py
  src/database/       connection and migration runner
  src/models/          SQLModel tables and API schemas
  src/repositories/    database access, no commits
  src/services/        business rules and transaction boundaries
  src/routers/         thin HTTP endpoints
  sql/schema/          authoritative PostgreSQL DDL
  sql/reports/         named-parameter report SQL
  sql/seed/            fabricated demo data
  tests/               PostgreSQL-backed tests
```

This is a single-household design with 11 tables: `member`, `account`, `category`, `income_source`, `bill`, `savings_goal`, `budget`, `income`, `expense`, `bill_payment`, and `savings_contribution`. The optional `family` table is not used.

All money is `NUMERIC(12,2)`/`Decimal`. Financial writes update balances and insert related rows in one transaction. Member passwords are immediately hashed with Argon2id and never returned. Authentication and login are deferred.

## Run

```bash
uv run fastapi dev main.py
uv run pytest
```

API documentation is available at `/docs`. Setup resources provide create/list endpoints, transaction endpoints are under `/transactions`, and reports are under `/reports`:

- `budget-vs-actual`
- `member-spending`
- `overdue-bills`
- `savings-progress`
- `monthly-income-vs-expense`
- `account-balances`

Database tests require `DATABASE_URL`; otherwise they are skipped.

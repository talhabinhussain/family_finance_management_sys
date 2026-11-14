# Family Finance Management System

Database Systems university project. Backend first, then frontend.

## Tech Stack

- Database: PostgreSQL on NeonDB
- Backend: Python 3.13, uv, FastAPI, SQLModel (SQLAlchemy), Alembic, psycopg v3
- Frontend (later): Next.js, TypeScript, Tailwind, shadcn/ui
- DATABASE_URL format: `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`
- Secrets only in `.env`. Never commit or print it.

## Approach

- ORM (SQLModel) for CRUD and transactions; hand-written SQL for reports and views.
- Build in vertical slices: schema, migration, repository, service, router, test.

## Backend Structure (`/backend`)

```
main.py             app setup, CORS, router registration only
database/db.py      engine and get_session
schemas/            SQLModel tables and request/response models
repositories/       database access only, never commits
services/           business logic, owns the transaction
routers/            thin HTTP layer
sql/reports/        raw .sql report queries
alembic/            migrations
tests/
seed/seed.py        fabricated demo data
```

Create folders only when a slice needs them.

## Rules

- Dependency direction: routers -> services -> repositories -> database.
- No SQL or business logic in routers or `main.py`.
- Services commit once at the end and roll back on error.
- Expense, income, bill payment and savings contribution each insert a row and update the account balance in one transaction, using a single `UPDATE ... SET balance = balance - :amount`.
- Return a budget warning flag after each expense (near 80% or over the limit).
- Schema changes only through Alembic migrations. Remove `create_all` from `main.py` once Alembic is set up.
- Constraints live in the database: CHECK, UNIQUE, NOT NULL, FOREIGN KEY with explicit ON DELETE.
- Money is `NUMERIC(12,2)` / `Decimal`, never float or int.
- Do not store derived totals; compute them with queries or views.
- Raw SQL goes in `sql/reports/*.sql`, run with `text()` and named parameters, never f-strings.
- Use `pool_pre_ping=True` on engines (Neon suspends idle databases).
- Add a test for each business rule.
- Plan briefly before coding. Do not add features or libraries that were not asked for.

## Commands (from `/backend`)

- `uv sync`
- `uv run fastapi dev main.py`
- `uv run alembic revision --autogenerate -m "msg"` then `uv run alembic upgrade head`
- `uv run pytest`

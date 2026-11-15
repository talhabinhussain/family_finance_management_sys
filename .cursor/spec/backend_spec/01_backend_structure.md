# Backend Structure Spec

**Family Finance Management System — Database Systems Project**

This spec tells a coding agent how to lay out and build the backend step by step. Follow it literally. Do not add files, tables or libraries that are not listed here.

## 1. Core decisions

- **Schema source of truth:** numbered SQL files in `backend/sql/schema/`. They hold every `CREATE TABLE`, constraint, index and view.
- **ORM role:** SQLModel classes mirror the tables and are used only for CRUD and transactions. Never call `create_all()`. Alembic is not used, so there is no autogenerate.
- **Reports:** hand-written SQL in `backend/sql/reports/`, run with `text()` and named parameters, never f-strings.
- **Stack:** Python 3.13, uv, FastAPI, SQLModel, psycopg v3, PostgreSQL on NeonDB.
- **Secrets:** only in `.env`. Never commit or print it.

## 2. Target layout

```text
backend/
  main.py                 app, CORS, router registration only
  pyproject.toml
  src/
    database/
      db.py               engine and get_session
      migrate.py          applies sql/schema/*.sql in order
    models/               SQLModel table and request/response classes
    repositories/         database access only, never commits
    services/             business logic, owns the transaction
    routers/              thin HTTP layer
  sql/
    schema/               numbered DDL files
    reports/              one .sql file per report
    seed/seed.sql         fabricated demo data
  tests/
```

Create `repositories/`, `services/`, `routers/` and `tests/` only when a slice needs them. Add an empty `__init__.py` to every Python folder under `src/`. All commands run from `/backend`, and imports use the `src.` prefix (for example `from src.database.db import get_session`), never `backend.src`.

## 3. Build steps

### Step 1: Clean up the existing code

- Remove the `lifespan` hook and `create_db_and_tables()` (the `create_all` call).
- Delete the placeholder `Family` model in `src/models/tables_schema.py` and the `/family` endpoint in `main.py`.
- Fix imports to the `src.` form. The folder is `src/models/`, not `schemas/`.
- Move `test_db.py` to `scripts/` or delete it once the Neon connection works.
- Declare `python-dotenv` in `pyproject.toml`. Do not add Alembic.

### Step 2: `src/database/db.py`

Load `.env`, create the engine from `DATABASE_URL` (format `postgresql+psycopg://...`) with `pool_pre_ping=True` (Neon suspends idle databases), and expose `get_session()`. No table creation here.

### Step 3: `src/database/migrate.py`

A small runner, started with:

```bash
uv run python -m src.database.migrate [--reset]
```

- Replace the `postgresql+psycopg://` prefix with `postgresql://`, because `psycopg.connect()` does not accept the SQLAlchemy prefix.
- Find `sql/schema/` relative to the file location, and run every `*.sql` file in sorted filename order.
- Keep a `schema_migrations(filename, applied_at)` table and skip files already applied.
- Run everything in one transaction, so a failing file leaves the database unchanged.
- With `--reset`, run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` first (development only).

### Step 4: `sql/schema/` files

Number files by foreign-key dependency order. Use the default `public` schema.

| File                         | Tables                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `001_master_tables.sql`      | `family` (only if supporting multiple households), `member`, `account`, `category`, `income_source` |
| `002_planning_tables.sql`    | `bill`, `savings_goal`, `budget`                                                                    |
| `003_transaction_tables.sql` | `income`, `expense`, `bill_payment`, `savings_contribution`                                         |
| `004_indexes.sql`            | Indexes on foreign keys and date columns                                                            |
| `005_views.sql`              | One or two views, for example a monthly income vs expense summary                                   |

**Core database: 11 tables.** The `family` table is conditional, making it 12 tables if multiple households are supported.

#### Schema rules

**General rules**

- Primary keys are identity columns.
- Every foreign key has an explicit `ON DELETE`: `RESTRICT` by default, `CASCADE` only on `budget` where appropriate.
- Money is `NUMERIC(12,2)`, never float or int.
- Add `CHECK (amount > 0)` on all transaction amount columns.
- Do not delete members who have transactions. Deactivate them with `is_active`.

**Member**

- `member` stores household member details, including `full_name`, `email`, `password_hash`, `role`, `date_of_birth` and `is_active`.
- `role` must be restricted to `Admin`, `Earning Member` and `Dependent` using a CHECK constraint.
- `email` must be UNIQUE.
- Do not create separate `user` or `role` tables for this project.
- If supporting multiple households, introduce the `family` table and add `family_id` as a foreign key in `member`.
- If supporting only one household, do not create the `family` table.

**Account**

- `account` stores cash, bank and mobile-wallet accounts.
- `owner_member_id` references `member` and is optional because an account can be shared by the household.
- `balance` uses `NUMERIC(12,2)`.
- The stored balance is updated through transactions whenever income, expense, bill payment or savings contribution changes the account balance.

**Category**

- Add a `category_type` column to distinguish `Income` and `Expense` categories.
- Use a CHECK constraint to restrict its values to these two types.
- Use a UNIQUE constraint on `(category_name, category_type)` so the same category name can exist for different transaction types.
- Income records must reference an Income category if income categories are used.
- Expense and bill records must reference Expense categories.
- Enforce category-type consistency in the service layer or through appropriate database constraints.

**Income source**

- `income_source` stores where money comes from, such as Salary, Freelancing or Business.
- `source_name` must be UNIQUE.

**Budget**

- Budgets are household-wide, not individual-member budgets.
- Each budget belongs to an expense category.
- Add `UNIQUE (category_id, budget_month)`.
- Add a CHECK constraint ensuring `budget_month` is the first day of a month.
- Use `NUMERIC(12,2)` for `limit_amount` and enforce `limit_amount >= 0`.
- `category_id` references an Expense category.

**Bill and bill payment**

- `bill` stores bills that must be paid, including `bill_name`, `amount_due`, `due_date`, `recurrence` and `category_id`.
- `bill_payment` links a bill to the expense that records its payment.
- `bill_payment.expense_id` must be UNIQUE because an expense can belong to at most one bill payment.
- `bill_payment.bill_id` must NOT be UNIQUE because one recurring bill can have multiple payments over time.
- Include `period_month DATE` in `bill_payment`.
- Add `UNIQUE (bill_id, period_month)` to prevent duplicate payments for the same bill in the same month.
- Enforce the first-day-of-month rule for `period_month`.
- Each bill payment must reference an existing expense.
- Bill payments and their corresponding expenses must be inserted in the same transaction.

**Savings goal and contribution**

- `savings_goal` stores goals such as an Emergency Fund or Vacation Fund.
- Add `created_by_member_id` as a foreign key referencing `member`, identifying who created the goal.
- `savings_contribution` references `goal_id`, `member_id` and `account_id`.
- Multiple members can contribute to the same savings goal.
- Savings progress is calculated using `SUM(savings_contribution.amount)` rather than stored separately.

**Derived data and balances**

- Do not store derived data: paid or overdue status, savings progress and monthly totals are computed.
- The only stored balance is `account.balance`.
- Update the account balance in the same transaction as the row that changes it.
- Prevent accidental partial updates using database transactions and rollback on errors.

### Step 5: `src/models/`

- Create one SQLModel class per database table, with the same column names and compatible types as the SQL.
- Map `NUMERIC(12,2)` to Python `Decimal`, never float.
- Add separate Create and Read classes for API input and output.
- Include all foreign keys, UNIQUE constraints and other relevant SQLAlchemy column metadata where appropriate.
- Models never create or alter tables.
- Do not call `SQLModel.metadata.create_all()` anywhere.

### Step 6: First vertical slice

Build one feature end to end before the next, in this order:

Model → Repository → Service → Router → Test.

Start with `member` or `account`, confirm it in `/docs`, then continue with category, income, expense, budget, bill and savings.

- Routers call services.
- Services call repositories.
- Repositories touch the database.
- No SQL or business logic in routers or `main.py`.
- Repositories never commit transactions.
- Services commit once at the end and roll back on any error.
- Expense, income, bill payment and savings contribution each insert the required row(s) and update the account balance in one transaction.
- Use a single SQL UPDATE for balance changes, for example:

```sql
UPDATE account
SET balance = balance - :amount
WHERE account_id = :account_id;
```

- For income, increase the balance instead:

```sql
UPDATE account
SET balance = balance + :amount
WHERE account_id = :account_id;
```

- Never read, modify and write the balance in Python.
- A bill payment must create its expense and bill_payment records and update the account balance atomically.
- A savings contribution must create its contribution record and update the account balance atomically.
- After each expense, return a budget warning flag when the monthly category spending reaches 80% of the limit or exceeds it.
- Handle missing accounts and insufficient balances according to the application's business rules.

### Step 7: `sql/reports/`

One `.sql` file per report, loaded by a helper and run with `text()` and named parameters.

Required reports:

1. `budget_vs_actual`
2. `member_spending`
3. `overdue_bills`
4. `savings_progress`
5. `monthly_income_vs_expense`
6. `account_balances`

Requirements:

- Use JOIN, LEFT JOIN, GROUP BY, HAVING, aggregates and subqueries where appropriate.
- Total income and expense in separate subqueries or CTEs before combining them.
- Never join the `income` and `expense` tables directly because that can multiply rows and produce incorrect totals.
- Budget reports must include categories with no expenses using LEFT JOIN and COALESCE.
- Overdue bill reports must identify unpaid and overdue bills using due dates and the absence of a corresponding bill payment.
- Savings reports calculate contributions against the goal's target amount.
- Account balance reports retrieve the current stored account balance.

### Step 8: Seed data and tests

- `sql/seed/seed.sql` holds fabricated data only.
- Include approximately 4 members, 3 accounts, 8 categories, and 2–3 months of transactions.
- Include income and expense categories separately.
- Include income sources, budgets, bills, bill payments, savings goals and savings contributions.
- If the `family` table is implemented, include at least one fabricated family and link the members to it.
- Add tests for these business rules:
  - Rejected negative amount.
  - Duplicate bill payment for the same bill and month blocked by the database.
  - A bill can have multiple payments across different months.
  - One expense cannot be linked to multiple bill payments.
  - Duplicate monthly budget for the same category rejected.
  - Transaction rollback when any operation in a financial transaction fails.
  - Budget warning at 80% or above.
  - Invalid category type rejected.

### Step 9: Keep docs in sync

Update `AGENTS.md` and `README.md` so the structure and commands match this spec.

Specifically:

- Replace every mention of Alembic with the numbered SQL files and the migrate command.
- Document the 11 core tables and their relationships.
- Explain the conditional `family` table decision.
- Document the schema migration process and development-only reset command.
- Explain how to run reports and tests.

## 4. Commands (from `/backend`)

```bash
uv sync

# Apply new schema files
uv run python -m src.database.migrate

# Rebuild the development database (destructive)
uv run python -m src.database.migrate --reset

# Run FastAPI
uv run fastapi dev main.py

# Run tests
uv run pytest
```

## 5. Rules for the agent

- Plan briefly before coding.
- Do not add features, tables or libraries that were not asked for in this spec.
- Keep the core database at 11 tables. Only add `family` if multi-household support is explicitly required.
- Once the schema is stable, never edit an applied schema file. Add a new numbered file for any change.
- Keep constraints in the database, not only in Python validation.
- Update the SQLModel class in the same change as any SQL schema change.
- Do not introduce unnecessary abstractions or duplicate business logic.
- Test every important database constraint using actual PostgreSQL, not only SQLite.
- Keep the implementation understandable enough for every team member to explain during the university viva.

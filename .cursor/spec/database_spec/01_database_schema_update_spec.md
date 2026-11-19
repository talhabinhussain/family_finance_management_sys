# Database Spec, Part 1 of 2: Layout, Migration Runner, Schema

**Family Finance Management System — Database Systems Project**

Run order: **this file → `database_spec_part2_reports_seed.md` → `backend_spec.md`**. Do not start a later file before the acceptance checklist of the earlier one passes.

Follow this spec literally. It fixes the database layer: `sql/` folder, migration runner, schema files `001`–`005`, and the tests that prove the schema rules.

Spec `01_backend_structure.md` is still valid unless this spec overrides it. Where they disagree, **this spec wins**.

> The DDL and trigger SQL below were executed on PostgreSQL 16 before being written here. Use them as given. Adapt only if a test fails, and then fix the SQL, never the test.

## 0. Scope

**In scope:** move the SQL folder, fix `migrate.py` and the report loader, rewrite schema files `001`–`005`, add test safety fixtures and schema tests T1–T9.
**Not in scope:** report SQL, view content, seed data (Part 2); models, schemas, services, docs (backend spec). Do not touch routers, services, models or existing service tests here.

## 1. Problems fixed in this file

Review problems #1 (wrong `sql/` path, zero tables created), #2 (tests wipe the real DB), #4 (category type enforced only in Python), #9 (unbounded `TEXT`, no blank/duplicate rules, missing FK indexes) and part of #5 (no opening balance to reconcile against).

## 2. Decisions

- **D1 — Edit schema files in place, once.** The migration never ran successfully as committed, so no data needs preserving. Edit `001`–`003` in place, renumber as shown in Step 2, rebuild with `--reset`. The schema is **frozen at the end of `backend_spec.md`**, not before. After the freeze: never edit an applied file, add a new numbered file.
- **D2 — Category-type rule is a trigger, not a composite foreign key.** A composite FK needs a duplicate `category_type` column in `income`, `expense`, `bill` and `budget`, which weakens the 3NF argument in the viva. Triggers keep tables normalized and demonstrate PL/pgSQL.
- **D3 — `account.opening_balance` is added.** `balance` stays the single stored current balance. A view (Part 2) reconciles it: `opening_balance + income − expense − savings contributions`.
- **D4 — `bill.due_date` is the anchor (first) due date.** Later due dates are derived from `recurrence` in a view (Part 2). No derived rows are stored.
- **D6 — Tests use a separate database** (`TEST_DATABASE_URL`) and the reset command is guarded.
- **D7 — Datatypes:** `VARCHAR(n)` with `CHECK` instead of unbounded `TEXT`; money stays `NUMERIC(12,2)` in tables; views are prefixed `v_`.

## 3. Step 1 — Layout, migration runner, report loader

### 3.1 Move the SQL folder

```bash
git mv backend/src/sql backend/sql
```

Final layout (matches `AGENTS.md` and `01_backend_structure.md`):

```text
backend/sql/schema/   001_master_tables.sql … 006_views.sql
backend/sql/reports/  one .sql file per report
backend/sql/seed/     seed.sql
```

Do **not** change the `ROOT` / `REPORT_DIR` path arithmetic in `src/database/migrate.py` and `src/repositories/reports.py` (they already point at `backend/sql`).

### 3.2 `src/database/migrate.py`

- Signature: `run(reset: bool = False, seed: bool = False, url: str | None = None) -> None`. If `url` is `None`, use the existing `database_url()` logic.
- **Fail loudly:** if `SCHEMA_DIR` does not exist or contains no `*.sql` files, raise `FileNotFoundError` with the resolved path. Never print "Schema is up to date." in that case.
- **Reset guard:** `reset=True` is allowed only when env var `ALLOW_DB_RESET` equals `true`. Otherwise raise `RuntimeError("Reset is disabled. Set ALLOW_DB_RESET=true to drop the schema.")`.
- **Seed:** new CLI flag `--seed`. After applying schema files, if `SELECT count(*) FROM member` is `0`, execute `sql/seed/seed.sql`; otherwise print `Seed skipped: database already has data.` Schema + seed stay in one transaction.
- Keep: `schema_migrations` table, sorted filename order, one transaction, `postgresql+psycopg://` → `postgresql://` prefix replacement.

Commands (from `/backend`):

```bash
uv run python -m src.database.migrate                                      # apply pending files
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed   # dev rebuild + demo data
```

**Do not run `--seed` until Part 2 is finished.** The old `seed.sql` does not match the new schema. Use `--reset` alone in this file.

### 3.3 `src/repositories/reports.py`

`run_report` raises `FileNotFoundError(f"Report SQL not found: {path}")` if the file is missing. Keep returning `list[dict]`.

## 4. Step 2 — Schema files (rewrite in place)

Final file list:

| File                         | Contents                                                    | Action                                                                   |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `001_master_tables.sql`      | `member`, `account`, `category`, `income_source`            | rewrite                                                                  |
| `002_planning_tables.sql`    | `bill`, `savings_goal`, `budget`                            | rewrite                                                                  |
| `003_transaction_tables.sql` | `income`, `expense`, `bill_payment`, `savings_contribution` | only change `description TEXT` → `VARCHAR(500)`                          |
| `004_triggers.sql`           | category-type rules, bill-payment category rule             | new                                                                      |
| `005_indexes.sql`            | indexes on foreign keys and date columns                    | renamed from `004_indexes.sql`, content rewritten                        |
| `006_views.sql`              | views                                                       | renamed from `005_views.sql`, **content untouched** (Part 2 rewrites it) |

Still **11 tables**. No `family` table.

### Rules for every file

- Primary keys are identity columns; every foreign key keeps an explicit `ON DELETE RESTRICT`.
- `TEXT` is replaced by `VARCHAR(n)` as given. No other type changes.
- Every name column has `CHECK (length(btrim(col)) > 0)`.
- Money columns stay `NUMERIC(12, 2)`.
- In `003`, change `description TEXT` to `description VARCHAR(500)` in `income`, `expense` and `savings_contribution`. Nothing else changes in that file.

### `001_master_tables.sql`

```sql
CREATE TABLE member (
    member_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL CHECK (length(btrim(full_name)) > 0),
    email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+$'),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Earning Member', 'Dependent')),
    date_of_birth DATE CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE account (
    account_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim(account_name)) > 0),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Cash', 'Bank', 'Mobile Wallet')),
    owner_member_id INTEGER REFERENCES member(member_id) ON DELETE RESTRICT,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category (
    category_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL CHECK (length(btrim(category_name)) > 0),
    category_type VARCHAR(10) NOT NULL CHECK (category_type IN ('Income', 'Expense')),
    UNIQUE (category_name, category_type)
);

CREATE TABLE income_source (
    income_source_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    source_name VARCHAR(50) NOT NULL UNIQUE CHECK (length(btrim(source_name)) > 0)
);
```

### `002_planning_tables.sql`

```sql
CREATE TABLE bill (
    bill_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    bill_name VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim(bill_name)) > 0),
    amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due > 0),
    due_date DATE NOT NULL,
    recurrence VARCHAR(20) NOT NULL CHECK (recurrence IN ('One-time', 'Monthly', 'Quarterly', 'Yearly')),
    category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN bill.due_date IS 'First (anchor) due date. Later due dates are derived from recurrence in v_bill_schedule.';

CREATE TABLE savings_goal (
    goal_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    goal_name VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim(goal_name)) > 0),
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    target_date DATE,
    created_by_member_id INTEGER NOT NULL REFERENCES member(member_id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE budget (
    budget_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE RESTRICT,
    budget_month DATE NOT NULL CHECK (budget_month = date_trunc('month', budget_month)::DATE),
    limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount >= 0),
    UNIQUE (category_id, budget_month)
);
```

### `004_triggers.sql`

All rules raise SQLSTATE `check_violation` (23514), so SQLAlchemy reports an `IntegrityError` and the existing `execute()` helper maps it to HTTP 409.

```sql
-- Rule: income uses an Income category; expense, bill and budget use an Expense category.
CREATE FUNCTION enforce_category_type() RETURNS trigger AS $$
DECLARE
    actual_type TEXT;
BEGIN
    SELECT category_type INTO actual_type FROM category WHERE category_id = NEW.category_id;
    IF actual_type IS DISTINCT FROM TG_ARGV[0] THEN
        RAISE EXCEPTION '% requires a category of type %, got %', TG_TABLE_NAME, TG_ARGV[0], COALESCE(actual_type, 'unknown')
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_income_category_type  BEFORE INSERT OR UPDATE OF category_id ON income
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Income');
CREATE TRIGGER trg_expense_category_type BEFORE INSERT OR UPDATE OF category_id ON expense
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');
CREATE TRIGGER trg_bill_category_type    BEFORE INSERT OR UPDATE OF category_id ON bill
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');
CREATE TRIGGER trg_budget_category_type  BEFORE INSERT OR UPDATE OF category_id ON budget
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');

-- Rule: a category can never change type once created.
CREATE FUNCTION forbid_category_type_change() RETURNS trigger AS $$
BEGIN
    IF NEW.category_type IS DISTINCT FROM OLD.category_type THEN
        RAISE EXCEPTION 'category_type of category % cannot be changed', OLD.category_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_type_immutable BEFORE UPDATE OF category_type ON category
    FOR EACH ROW EXECUTE FUNCTION forbid_category_type_change();

-- Rule: a bill payment's expense must use the same category as the bill.
CREATE FUNCTION enforce_bill_payment_category() RETURNS trigger AS $$
DECLARE
    bill_category INTEGER;
    expense_category INTEGER;
BEGIN
    SELECT category_id INTO bill_category FROM bill WHERE bill_id = NEW.bill_id;
    SELECT category_id INTO expense_category FROM expense WHERE expense_id = NEW.expense_id;
    IF bill_category IS DISTINCT FROM expense_category THEN
        RAISE EXCEPTION 'bill payment expense category must match the bill category'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_payment_category BEFORE INSERT OR UPDATE OF bill_id, expense_id ON bill_payment
    FOR EACH ROW EXECUTE FUNCTION enforce_bill_payment_category();
```

The service layer keeps its friendly 400/404 pre-checks. Triggers are the backstop when someone writes SQL directly.

### `005_indexes.sql`

Foreign keys and date columns only:

```sql
CREATE INDEX idx_account_owner_member ON account(owner_member_id);
CREATE INDEX idx_bill_category ON bill(category_id);
CREATE INDEX idx_bill_due_date ON bill(due_date);
CREATE INDEX idx_savings_goal_creator ON savings_goal(created_by_member_id);
CREATE INDEX idx_budget_month ON budget(budget_month);
CREATE INDEX idx_income_member ON income(member_id);
CREATE INDEX idx_income_account ON income(account_id);
CREATE INDEX idx_income_category ON income(category_id);
CREATE INDEX idx_income_source ON income(income_source_id);
CREATE INDEX idx_income_date ON income(transaction_date);
CREATE INDEX idx_expense_member ON expense(member_id);
CREATE INDEX idx_expense_account ON expense(account_id);
CREATE INDEX idx_expense_category_date ON expense(category_id, transaction_date);
CREATE INDEX idx_expense_date ON expense(transaction_date);
CREATE INDEX idx_bill_payment_period ON bill_payment(period_month);
CREATE INDEX idx_savings_contribution_goal ON savings_contribution(goal_id);
CREATE INDEX idx_savings_contribution_member ON savings_contribution(member_id);
CREATE INDEX idx_savings_contribution_account ON savings_contribution(account_id);
CREATE INDEX idx_savings_contribution_date ON savings_contribution(contribution_date);
```

(`bill_payment(bill_id, period_month)` and `bill_payment(expense_id)` are already indexed by their UNIQUE constraints.)

## 5. Step 3 — Test safety and schema tests

### 5.1 `tests/conftest.py`

- Tests run only against `TEST_DATABASE_URL` (a Neon branch or local PostgreSQL). If it is not set, skip all database tests. **Never fall back to `DATABASE_URL`.**
- Before any `src` import, read the original `DATABASE_URL` (environment or `.env`), then set `os.environ["DATABASE_URL"] = TEST_DATABASE_URL`. If the two are equal, abort with `pytest.exit(...)`.
- Session fixture: set `ALLOW_DB_RESET=true`, call `run(reset=True, url=TEST_DATABASE_URL)` once.
- Autouse function fixture `clean_db` for DB tests: `TRUNCATE member, account, category, income_source, bill, savings_goal, budget, income, expense, bill_payment, savings_contribution RESTART IDENTITY CASCADE` before each test (service functions commit, so rollback is not enough).
- `session` fixture: yield a plain `Session(engine)` and close it. Do not rely on rollback for cleanup.
- Put small raw-SQL helpers (`make_member`, `make_account`, `make_category`, `make_expense`, and so on) in `tests/db_helpers.py`. Part 2 and the backend spec reuse them.

### 5.2 `tests/test_db_schema.py` — tests T1–T9

Use raw SQL through `session.execute(text(...))`. Expect `sqlalchemy.exc.IntegrityError` (or `DBAPIError` for length overflow). Call `session.rollback()` after each expected error. This proves the database enforces the rule, not Python.

| ID  | Test                                                                                                                 | Expected                                |
| --- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| T1  | `amount` ≤ 0 on income, expense, savings_contribution                                                                | rejected by CHECK                       |
| T2  | budget `limit_amount < 0`; `budget_month` not first day; duplicate `(category, month)`                               | rejected                                |
| T3  | duplicate bill payment same bill + `period_month`; same bill in a different month; same expense in two bill payments | 1st rejected, 2nd allowed, 3rd rejected |
| T4  | expense with Income category; income with Expense category; bill and budget with Income category                     | each rejected by trigger                |
| T5  | change a category's type; bill payment whose expense category differs from the bill's                                | each rejected by trigger                |
| T6  | delete member that owns an account or has expenses; delete category in use                                           | rejected (RESTRICT)                     |
| T7  | negative `balance`, negative `opening_balance`, duplicate `account_name`, duplicate bill name, duplicate goal name   | rejected                                |
| T8  | member: uppercase email, duplicate email, bad role, future date of birth, blank name                                 | rejected                                |
| T9  | name longer than its `VARCHAR` limit                                                                                 | rejected                                |

## 6. Acceptance checklist (Part 1)

Run from `/backend` with `TEST_DATABASE_URL` set:

```bash
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset
uv run pytest tests/test_db_schema.py
```

- [ ] Migration creates **11 tables + `schema_migrations`** and raises a clear error if the schema folder is missing.
- [ ] `pytest` skips (wipes nothing) when `TEST_DATABASE_URL` is unset, and aborts if it equals `DATABASE_URL`.
- [ ] Tests T1–T9 pass on real PostgreSQL.
- [ ] Raw SQL cannot insert an expense under an Income category, a negative amount, or a duplicate bill payment.
- [ ] `grep -r "TEXT NOT NULL" backend/sql/schema` returns nothing.

**Known interim state:** existing service tests and routers are not updated yet and may fail or behave oddly until `backend_spec.md` is done. Ignore them for now; do not "fix" them in this file.

## 7. Rules for the agent

- Plan briefly, then work in order Step 1 → Step 3. Do not add tables, columns, endpoints, libraries or features that are not listed here.
- Constraints live in the database; Python validation is an extra. Test against real PostgreSQL, never SQLite.
- Never touch `DATABASE_URL` data from tests; never print or commit `.env`. Keep it simple enough to explain in a viva.

# Database Spec, Part 2 of 2: Views, Reports, Seed Data

**Family Finance Management System — Database Systems Project**

Run order: `database_spec_part1_schema.md` (done) → **this file** → `backend_spec.md`.

**Prerequisite:** Part 1 acceptance checklist passes (11 tables, triggers, indexes, `tests/conftest.py`, `tests/db_helpers.py`, T1–T9 green).

Follow this spec literally. It writes the views, report SQL and seed data, and the tests that prove them.

Spec `01_backend_structure.md` is still valid unless a database or backend spec overrides it. Where they disagree, the newer spec wins.

> The view and report SQL below was executed on PostgreSQL 16 before being written here. Use it as given. Adapt only if a test fails, and then fix the SQL, never the test.

## 0. Scope

**In scope:** `sql/schema/006_views.sql` (rewrite), `sql/reports/*.sql`, `sql/seed/seed.sql`, tests T10–T17 and T21, `backend/docs/schema.md`.
**Not in scope:** routers, services, models, schemas, README/AGENTS edits, the schema freeze (all in `backend_spec.md`).

## 1. Problems fixed in this file

Review problems #3 (NULL-parameter HTTP 500), #5 (seed ignores balances), #6 (recurring bills never roll forward), #7 (`end_month` drops most of its month), #8 (one unused view; no `HAVING`, percent-used, upcoming-bills or unbudgeted-category spending).

## 2. Decisions

- **D5 — Report date filters are month-based and end-inclusive.** `start_month` and `end_month` can be any date; only their month counts. Range = first day of the start month up to the end of the end month.
- **D7 — Money in views/reports:** sums are `NUMERIC(14,2)`; never cast to float.

## 3. Step 1 — `sql/schema/006_views.sql` (replace the old content)

The old view `monthly_income_vs_expense` is removed (renamed `v_monthly_income_vs_expense`). Each view is used by at least one report.

```sql
-- Income, expense and savings per month. Each total is aggregated separately, then joined to a month list,
-- so income and expense rows are never multiplied against each other.
CREATE VIEW v_monthly_income_vs_expense AS
WITH income_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_income
    FROM income GROUP BY date_trunc('month', transaction_date)::DATE
), expense_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_expense
    FROM expense GROUP BY date_trunc('month', transaction_date)::DATE
), savings_totals AS (
    SELECT date_trunc('month', contribution_date)::DATE AS month, SUM(amount) AS total_savings
    FROM savings_contribution GROUP BY date_trunc('month', contribution_date)::DATE
), months AS (
    SELECT month FROM income_totals
    UNION SELECT month FROM expense_totals
    UNION SELECT month FROM savings_totals
)
SELECT m.month,
       COALESCE(i.total_income, 0)::NUMERIC(14, 2) AS total_income,
       COALESCE(e.total_expense, 0)::NUMERIC(14, 2) AS total_expense,
       COALESCE(s.total_savings, 0)::NUMERIC(14, 2) AS total_savings,
       (COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0))::NUMERIC(14, 2) AS net_amount
FROM months m
LEFT JOIN income_totals i ON i.month = m.month
LEFT JOIN expense_totals e ON e.month = m.month
LEFT JOIN savings_totals s ON s.month = m.month;

-- Every expected due date of every active bill (anchor date + recurrence), with paid/unpaid status.
-- Horizon: today + 366 days. due_date + n * interval does not drift at month ends (Aug 31 -> Sep 30 -> Oct 31).
CREATE VIEW v_bill_schedule AS
SELECT b.bill_id, b.bill_name, b.amount_due, b.recurrence, b.category_id,
       d.due_date,
       date_trunc('month', d.due_date)::DATE AS period_month,
       (p.bill_payment_id IS NOT NULL) AS is_paid
FROM bill b
CROSS JOIN LATERAL (
    SELECT (b.due_date + n * CASE b.recurrence
                                WHEN 'Monthly'   THEN INTERVAL '1 month'
                                WHEN 'Quarterly' THEN INTERVAL '3 months'
                                WHEN 'Yearly'    THEN INTERVAL '1 year'
                                ELSE INTERVAL '0' END)::DATE AS due_date
    FROM generate_series(0, CASE b.recurrence WHEN 'One-time' THEN 0 ELSE 1200 END) AS n
) d
LEFT JOIN bill_payment p
       ON p.bill_id = b.bill_id AND p.period_month = date_trunc('month', d.due_date)::DATE
WHERE b.is_active AND d.due_date <= CURRENT_DATE + 366;

-- Stored balance vs balance recomputed from the ledger.
CREATE VIEW v_account_reconciliation AS
SELECT a.account_id, a.account_name, a.account_type, a.owner_member_id,
       a.opening_balance,
       a.balance AS stored_balance,
       (a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0))::NUMERIC(14, 2) AS computed_balance,
       (a.balance - (a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0)))::NUMERIC(14, 2) AS difference,
       (a.balance = a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0)) AS is_reconciled
FROM account a
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM income GROUP BY account_id) i ON i.account_id = a.account_id
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM expense GROUP BY account_id) e ON e.account_id = a.account_id
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM savings_contribution GROUP BY account_id) s ON s.account_id = a.account_id;
```

## 4. Step 2 — Reports (`backend/sql/reports/`)

### Conventions (all report files)

- One `.sql` file per report, run with `text()` and named parameters. Never f-strings.
- **Every nullable parameter is cast:** `CAST(:name AS date) IS NULL`, `CAST(:name AS integer) IS NULL`, `CAST(:name AS numeric) IS NULL`. This fixes the HTTP 500.
- **Date ranges (D5):** start is `>= date_trunc('month', start)::date`. End is `< (date_trunc('month', end) + INTERVAL '1 month')::date` for transaction dates, or `<= date_trunc('month', end)::date` for month columns.

### Parameters per report (all passed every time; `None` allowed unless noted)

| Report file                     | Parameters                                              |
| ------------------------------- | ------------------------------------------------------- |
| `budget_vs_actual.sql`          | `start_month`, `end_month`                              |
| `member_spending.sql`           | `start_month`, `end_month`, `member_id`, `min_total`    |
| `category_spending.sql` (new)   | `start_month`, `end_month`                              |
| `monthly_income_vs_expense.sql` | `start_month`, `end_month`                              |
| `overdue_bills.sql`             | `as_of` (required date)                                 |
| `upcoming_bills.sql` (new)      | `as_of` (required date), `days_ahead` (`None` means 30) |
| `savings_progress.sql`          | none (file stays **unchanged**)                         |
| `account_balances.sql`          | none                                                    |

### `budget_vs_actual.sql`

Pre-aggregates spending per category and month, then LEFT JOINs, so budgets with no spending still appear. `percent_used` is `NULL` when `limit_amount` is 0. Status: `Over budget` when spent > limit, `Near limit` at 80% or more, else `OK`.

```sql
WITH monthly_spend AS (
    SELECT category_id, date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS spent
    FROM expense
    GROUP BY category_id, date_trunc('month', transaction_date)::DATE
)
SELECT b.budget_id, b.category_id, c.category_name, b.budget_month, b.limit_amount,
       COALESCE(s.spent, 0)::NUMERIC(14, 2) AS actual_amount,
       (b.limit_amount - COALESCE(s.spent, 0))::NUMERIC(14, 2) AS remaining_amount,
       ROUND(COALESCE(s.spent, 0) * 100 / NULLIF(b.limit_amount, 0), 2) AS percent_used,
       CASE WHEN COALESCE(s.spent, 0) > b.limit_amount THEN 'Over budget'
            WHEN b.limit_amount > 0 AND COALESCE(s.spent, 0) >= b.limit_amount * 0.8 THEN 'Near limit'
            ELSE 'OK' END AS status
FROM budget b
JOIN category c ON c.category_id = b.category_id
LEFT JOIN monthly_spend s ON s.category_id = b.category_id AND s.month = b.budget_month
WHERE (CAST(:start_month AS date) IS NULL OR b.budget_month >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR b.budget_month <= date_trunc('month', CAST(:end_month AS date))::date)
ORDER BY b.budget_month, c.category_name;
```

### `member_spending.sql`

Includes members with no spending. `HAVING` filters on the optional `min_total`.

```sql
SELECT m.member_id, m.full_name,
       COALESCE(SUM(e.amount), 0)::NUMERIC(14, 2) AS total_spending,
       COUNT(e.expense_id) AS expense_count
FROM member m
LEFT JOIN expense e ON e.member_id = m.member_id
  AND (CAST(:start_month AS date) IS NULL OR e.transaction_date >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR e.transaction_date < (date_trunc('month', CAST(:end_month AS date)) + INTERVAL '1 month')::date)
WHERE (CAST(:member_id AS integer) IS NULL OR m.member_id = CAST(:member_id AS integer))
GROUP BY m.member_id, m.full_name
HAVING COALESCE(SUM(e.amount), 0) >= COALESCE(CAST(:min_total AS numeric), 0)
ORDER BY total_spending DESC, m.full_name;
```

### `category_spending.sql` (new)

Spending per Expense category, including categories with no budget and no spending.

```sql
SELECT c.category_id, c.category_name,
       COALESCE(SUM(e.amount), 0)::NUMERIC(14, 2) AS total_spending,
       COUNT(e.expense_id) AS expense_count
FROM category c
LEFT JOIN expense e ON e.category_id = c.category_id
  AND (CAST(:start_month AS date) IS NULL OR e.transaction_date >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR e.transaction_date < (date_trunc('month', CAST(:end_month AS date)) + INTERVAL '1 month')::date)
WHERE c.category_type = 'Expense'
GROUP BY c.category_id, c.category_name
ORDER BY total_spending DESC, c.category_name;
```

### `monthly_income_vs_expense.sql`

```sql
SELECT month, total_income, total_expense, total_savings, net_amount
FROM v_monthly_income_vs_expense
WHERE (CAST(:start_month AS date) IS NULL OR month >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR month <= date_trunc('month', CAST(:end_month AS date))::date)
ORDER BY month;
```

### `overdue_bills.sql`

Reads `v_bill_schedule`, so every unpaid past occurrence of a recurring bill appears.

```sql
SELECT bill_id, bill_name, amount_due, recurrence, category_id, due_date, period_month,
       (CAST(:as_of AS date) - due_date) AS days_overdue
FROM v_bill_schedule
WHERE NOT is_paid AND due_date < CAST(:as_of AS date)
ORDER BY due_date, bill_name;
```

### `upcoming_bills.sql` (new)

```sql
SELECT bill_id, bill_name, amount_due, recurrence, category_id, due_date, period_month,
       (due_date - CAST(:as_of AS date)) AS days_until_due
FROM v_bill_schedule
WHERE NOT is_paid
  AND due_date >= CAST(:as_of AS date)
  AND due_date <= CAST(:as_of AS date) + COALESCE(CAST(:days_ahead AS integer), 30)
ORDER BY due_date, bill_name;
```

### `account_balances.sql`

```sql
SELECT account_id, account_name, account_type, owner_member_id,
       opening_balance, stored_balance, computed_balance, difference, is_reconciled
FROM v_account_reconciliation
ORDER BY account_id;
```

## 5. Step 3 — Seed data (`backend/sql/seed/seed.sql`)

Rewrite the file. Fabricated data only. **No hard-coded surrogate IDs:** look rows up by name/email with subqueries. **Dates come from `CURRENT_DATE`** (the 3 calendar months ending with the current month) so the demo always shows overdue and upcoming bills. No transaction may be dated in the future.

| Item                          | Count / rule                                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Members                       | 4: one Admin, two Earning Members, one Dependent. Emails lowercase. Password hash is a fake placeholder (these members cannot log in).                                                                                                             |
| Accounts                      | 3 (Bank, Cash, Mobile Wallet). `opening_balance` large enough that `balance` never goes negative. Insert `balance = opening_balance`.                                                                                                              |
| Categories                    | 8: 3 Income (Salary, Freelancing, Business), 5 Expense (Food, Utilities, Transport, Education, Entertainment)                                                                                                                                      |
| Income sources                | 3                                                                                                                                                                                                                                                  |
| Income / expenses             | transactions in each of the 3 months                                                                                                                                                                                                               |
| Budgets                       | for 3 months, including one budget with **no expenses**, one at **80–99%**, one **over limit**                                                                                                                                                     |
| Bills                         | 3: Electricity (Monthly), Internet (Monthly), School Fee (Quarterly)                                                                                                                                                                               |
| Bill payments                 | some months paid; at least one past month **unpaid** (shows in `overdue_bills`); at least one occurrence due within the next 30 days **unpaid** (shows in `upcoming_bills`). Each payment links an expense with the **same category** as the bill. |
| Savings goals / contributions | 2 goals, contributions from more than one member in more than one month                                                                                                                                                                            |

**Last statement of the seed file** reconciles balances, because seed rows bypass the service layer:

```sql
UPDATE account a
SET balance = r.computed_balance
FROM v_account_reconciliation r
WHERE r.account_id = a.account_id;
```

## 6. Step 4 — Tests (`tests/test_db_reports.py`, `tests/test_db_seed.py`)

Reuse the fixtures and helpers from Part 1. Run reports through `src.repositories.reports.run_report` with **all parameters passed**.

| ID  | Test                                                                                                                                                         | Expected                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| T10 | **each report SQL file runs with all parameters `None`** (parametrize over `sql/reports/*.sql`; give `as_of` where required)                                 | no exception (regression for the HTTP 500)                                                                                             |
| T11 | expense on the 25th, `end_month` = 1st of that month                                                                                                         | expense is included (D5)                                                                                                               |
| T12 | monthly bill anchored on the 31st, two past months unpaid                                                                                                    | 2 overdue rows; due dates 30th/31st correct; paying one leaves 1                                                                       |
| T13 | `upcoming_bills` with `days_ahead=None`                                                                                                                      | defaults to 30 days                                                                                                                    |
| T14 | `budget_vs_actual`: no-expense budget → `OK`, actual 0; 85% → `Near limit`; over → `Over budget`; limit 0 with spending → `Over budget`, `percent_used` NULL | as stated                                                                                                                              |
| T15 | `member_spending` includes a zero-spend member; `min_total` filters via `HAVING`                                                                             | as stated                                                                                                                              |
| T16 | `category_spending` includes unbudgeted and zero-spend Expense categories, excludes Income categories                                                        | as stated                                                                                                                              |
| T17 | `v_monthly_income_vs_expense` with 3 incomes and 3 expenses in the same month plus a month with only income                                                  | totals exact (no row multiplication)                                                                                                   |
| T21 | seeded database (`run(reset=True, seed=True, url=TEST_DATABASE_URL)`)                                                                                        | every account reconciled; counts match Step 3; `overdue_bills` and `upcoming_bills` non-empty; one `Near limit`, one `Over budget` row |

Insert test data with raw SQL helpers. For T12 and T17 insert ledger rows directly; balances do not matter there.

## 7. Step 5 — `backend/docs/schema.md` (new; used for the report and viva)

- Mermaid `erDiagram` of the 11 tables with PK/FK and cardinalities.
- Normalization note: why each table is in 3NF, with one worked example (why `category_type` lives only in `category` and is checked by trigger instead of copied into child tables).
- Table "Rule → where enforced" (CHECK / UNIQUE / FK / trigger / service) covering every rule in Part 1 and Part 2.
- This report → concept map:

| Report                             | Concepts shown                                                            |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `budget_vs_actual`                 | CTE, JOIN, LEFT JOIN, `COALESCE`, `NULLIF`, `CASE`, percentage            |
| `member_spending`                  | LEFT JOIN with filter in `ON`, `GROUP BY`, `HAVING`, aggregates           |
| `category_spending`                | LEFT JOIN, `GROUP BY`, filtering by category type                         |
| `monthly_income_vs_expense`        | view, three separate aggregations joined by month (no row multiplication) |
| `overdue_bills` / `upcoming_bills` | view, `generate_series` + `LATERAL`, anti-join through `LEFT JOIN`        |
| `savings_progress`                 | aggregate against target, `LEFT JOIN`, `GREATEST`                         |
| `account_balances`                 | view, reconciliation of a stored value against the ledger                 |

## 8. Acceptance checklist (Part 2)

Run from `/backend` with `TEST_DATABASE_URL` set:

```bash
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed
uv run pytest tests/test_db_schema.py tests/test_db_reports.py tests/test_db_seed.py
```

- [ ] Migration creates 11 tables + `schema_migrations` and **3 views**; the old `monthly_income_vs_expense` view is gone.
- [ ] Tests T1–T17 and T21 pass on real PostgreSQL.
- [ ] Every report SQL runs with all-`None` parameters.
- [ ] After seeding, `SELECT * FROM v_account_reconciliation` shows `is_reconciled = true` on every row.
- [ ] `backend/docs/schema.md` exists with the ER diagram, 3NF note, rule table and concept map.

**Known interim state:** routers may still call reports without the new parameters (`min_total`, `as_of`, `days_ahead`, `member_id`) and fail. That is fixed in the next (API) spec; do not touch routers here.

## 9. Rules for the agent

- Plan briefly, then work in order Step 1 → Step 5. Do not add tables, columns, endpoints, libraries or features that are not listed here.
- Reports use `text()` with named parameters only: no f-strings, no float casts on money.
- Test against real PostgreSQL, never SQLite. Never touch `DATABASE_URL` data from tests; never print or commit `.env`.

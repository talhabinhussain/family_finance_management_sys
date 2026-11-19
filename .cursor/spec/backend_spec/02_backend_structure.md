# Backend Spec: Models, Schemas, Service Edit, Service Tests, Docs, Freeze

**Family Finance Management System — Database Systems Project**

Run order: `database_spec_part1_schema.md` (done) → `database_spec_part2_reports_seed.md` (done) → **this file**.

**Prerequisite:** Part 2 acceptance checklist passes (11 tables, 3 views, triggers, reports, seed, tests T1–T17 and T21 green).

This spec tells a coding agent how to bring the Python backend in line with the new database: SQLModel table models, request/response schemas, one service edit, the service-level tests, and the docs. Follow it literally. Do not add tables, columns, libraries or features that are not listed here.

Spec `01_backend_structure.md` is still valid unless this spec overrides it. Where they disagree, **this spec wins**.

## 0. Scope

**In scope:** `src/models/tables.py`, `src/models/schemas.py`, `services/setup.py` (two edits), service tests T18–T20 and fixes to existing tests, `README.md`, `AGENTS.md`, schema freeze.

**Out of scope (next spec: API routes):** routers, new endpoints, `response_model` on routers, authentication and roles, frontend. See Step 6 for the hand-off list. Do not change any service logic other than the edits listed in Step 2.

## 1. Problems fixed in this file

| #   | Problem found in review                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | Money comes out of reports as floats; `income` and `savings-contribution` POST return `{}` (schemas fixed here, routers adopt them in the API spec). |
| 11  | Only 3 of the 8 required business-rule tests existed; one test passes for the wrong reason.                                                          |
| 5   | (part) `create_account` lets the client set `balance`; it must start equal to `opening_balance`.                                                     |

## 2. Step 1 — SQLModel models and schemas

Models never create or alter tables (rule unchanged). They mirror the SQL columns exactly.

### 2.1 `src/models/tables.py`

- Add `max_length` to every `str` column matching the SQL: `full_name` 100, `email` 254, `password_hash` 255, `role` 20, `account_name` 100, `account_type` 20, `category_name` 50, `category_type` 10, `source_name` 50, `bill_name` 100, `recurrence` 20, `goal_name` 100, every `description` 500.
- `Account`: add `opening_balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)`.
- `Member.email`: remove `index=True` (the DB has a UNIQUE constraint; the extra flag is misleading). Keep `unique=True`.
- Do **not** add `category_type` columns to `Income`, `Expense`, `Bill`, `Budget`.
- Add one comment block at the top: category-type triggers, `v_*` views and CHECK constraints exist only in `sql/schema/`; models do not define them.

### 2.2 `src/models/schemas.py`

**Shared string types.** Define reusable `Annotated` types with `StringConstraints(strip_whitespace=True, min_length=1, max_length=N)` (for example `Name100`, `Name50`) and use them in every Create schema, so over-long or blank input returns HTTP 422 instead of a database error.

**Create schemas**

- `MemberCreate`: `full_name` Name100; `email` stripped + lowercased, max 254, pattern `^[^@\s]+@[^@\s]+$`; `date_of_birth` must not be in the future (validator).
- `AccountCreate`: **replace `balance` with `opening_balance`** (`ge=0`, `max_digits=12`, `decimal_places=2`, default `0.00`). Clients can no longer set `balance`.
- `CategoryCreate`, `IncomeSourceCreate`, `BillCreate`, `SavingsGoalCreate`: names use the shared types with the lengths above.
- `description` fields: `str | None`, `max_length=500`.

**Read schemas**

- `AccountRead`: add `opening_balance`.
- New (all columns of the table, `from_attributes=True`): `IncomeRead`, `ExpenseRead`, `BillPaymentRead`, `SavingsContributionRead`.

**Report row schemas** (replace the placeholder `ReportRow`). Money fields are `Decimal`, so JSON output is a string like `"250000.00"` instead of a float.

| Schema                                      | Fields                                                                                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BudgetVsActualRow`                         | `budget_id`, `category_id`, `category_name`, `budget_month: date`, `limit_amount`, `actual_amount`, `remaining_amount`, `percent_used: Decimal \| None`, `status: Literal["OK","Near limit","Over budget"]` |
| `MemberSpendingRow`                         | `member_id`, `full_name`, `total_spending`, `expense_count: int`                                                                                                                                            |
| `CategorySpendingRow`                       | `category_id`, `category_name`, `total_spending`, `expense_count: int`                                                                                                                                      |
| `MonthlyIncomeExpenseRow`                   | `month: date`, `total_income`, `total_expense`, `total_savings`, `net_amount`                                                                                                                               |
| `BillDueRow` (used by overdue and upcoming) | `bill_id`, `bill_name`, `amount_due`, `recurrence`, `category_id`, `due_date`, `period_month`, `days_overdue: int \| None`, `days_until_due: int \| None`                                                   |
| `SavingsProgressRow`                        | `goal_id`, `goal_name`, `target_amount`, `contributed_amount`, `remaining_amount`, `completion_percent`                                                                                                     |
| `AccountBalanceRow`                         | `account_id`, `account_name`, `account_type`, `owner_member_id: int \| None`, `opening_balance`, `stored_balance`, `computed_balance`, `difference`, `is_reconciled: bool`                                  |

Routers adopt these as `response_model` in the API spec.

## 3. Step 2 — Service edits (only these two)

In `services/setup.py`:

- `create_account`: build the row explicitly so `balance` starts equal to `opening_balance`:

  ```python
  account = Account(
      account_name=data.account_name,
      account_type=data.account_type.value,
      owner_member_id=data.owner_member_id,
      opening_balance=data.opening_balance,
      balance=data.opening_balance,
  )
  return _create(session, account)
  ```

- `create_member`: email arrives already lowercased from the schema; no other change.

Do not change any other service logic. If a test below fails because existing service behavior differs from what the test expects, **stop and report the failing output to the user**. Do not silently rewrite the service.

## 4. Step 3 — Service tests (`tests/test_services.py`)

Reuse `tests/conftest.py` and `tests/db_helpers.py` from the database spec (`TEST_DATABASE_URL` only, `clean_db` truncation, plain `session`).

| ID  | Test                                                                                             | Expected                                                          |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| T18 | create account, income, expense, bill payment and savings contribution through the service layer | `v_account_reconciliation.is_reconciled` is true for all accounts |
| T19 | expense reaching 80% and over 100% of the budget                                                 | `budget_warning` true at 80%; `over_budget` true only when over   |
| T20 | duplicate bill payment fails                                                                     | balance unchanged, no expense row left behind (atomic rollback)   |

### Fix existing tests

- `test_insufficient_expense_rolls_back`: the old assertion (`session.get(Account, id) is None`) passes only because the whole setup is rolled back. Rewrite it: commit the setup, call `create_expense` with an amount above the balance, then assert the balance is unchanged and no `expense` row exists.
- `test_negative_amount_rejected_before_database` stays (Pydantic layer). T1 already covers the database layer.
- Update every other existing test to the new fixtures and to `AccountCreate(opening_balance=...)` instead of `balance`.

## 5. Step 4 — Docs and schema freeze

1. **`README.md` and `AGENTS.md`**
   - Replace every `src/sql` / bare `sql` reference with `backend/sql/...`.
   - Document the commands below, plus `TEST_DATABASE_URL` and `ALLOW_DB_RESET=true`.
   - Mention `account.opening_balance`, the three views, the triggers, and the report list including `category-spending` and `upcoming-bills`.
   - Replace the rule "Schema changes only through numbered SQL files" with: _"Schema is FROZEN. Never edit an applied schema file; add a new numbered file."_ Add this only after every test (T1–T21) passes.

   ```bash
   uv run python -m src.database.migrate                                      # apply pending schema files
   ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed   # dev rebuild + demo data
   uv run pytest                                                              # needs TEST_DATABASE_URL
   ```

2. **Freeze.** After the acceptance checklist below is green, the schema (`sql/schema/001`–`006`) is frozen. Any later change is a new numbered file (`007_...sql`).

## 6. Hand-off to the API spec (do not implement here)

- List endpoints for income, expense, bill payments, savings contributions with filters `member_id`, `category_id`, `from`, `to`; `GET /{resource}/{id}` for every resource.
- `PATCH` for member, account (never `balance`), category, budget, bill, savings goal; deactivate via `is_active` for member, bill, savings goal; `DELETE` only where `RESTRICT` makes it safe (409 when in use).
- `response_model` on every router using the new Read and report row schemas (fixes the `{}` bodies and float money).
- Routes for `category-spending` and `upcoming-bills`; params `min_total`, `days_ahead`; every router passes **all** report parameters.
- Routers must call services only (`list_all` is currently imported into routers directly, which breaks the dependency rule).
- Budget warning edge case: a budget with `limit_amount = 0` and spending should set `budget_warning` true.
- `create_bill_payment`: reject inactive bills.
- Roles and access limits promised in the proposal (Admin, Earning Member, Dependent).

## 7. Acceptance checklist (final)

Run from `/backend` with `TEST_DATABASE_URL` set:

```bash
ALLOW_DB_RESET=true uv run python -m src.database.migrate --reset --seed
uv run pytest
```

- [ ] All tests T1–T21 pass on real PostgreSQL.
- [ ] `pytest` skips (wipes nothing) when `TEST_DATABASE_URL` is unset, and aborts if it equals `DATABASE_URL`.
- [ ] `AccountCreate` has no `balance` field; `AccountRead` has `opening_balance`.
- [ ] Every `str` column in `tables.py` has the `max_length` from Step 1.
- [ ] Report row schemas return money as `Decimal`, not float.
- [ ] `README.md` and `AGENTS.md` are updated and contain the FROZEN rule.
- [ ] No router, endpoint or service logic changed beyond Step 2.

## 8. Rules for the agent

- Plan briefly before coding; work in order Step 1 → Step 4.
- Do not add tables, columns, endpoints, libraries or features that are not listed here.
- Keep SQL and models in sync: any column change updates the SQLModel class in the same change.
- Constraints live in the database; Python validation is an extra, not a replacement.
- Test against real PostgreSQL, never SQLite. Never touch `DATABASE_URL` data from tests; never print or commit `.env`.
- Keep the implementation simple enough to explain in a university viva.

API Testing and Acceptance Specification
Family Finance Management System — Database Systems Project
Prerequisite: Complete `03_api_routes.md` before this specification.

1. Purpose
   Verify the API contract, business rules, database constraints, transaction atomicity and report behavior. Tests must use the existing PostgreSQL test setup and fabricated data only.

2. Test environment safety

- Run commands from `backend/`.
- Use `TEST_DATABASE_URL` for every database test.
- Never point tests or reset commands at `DATABASE_URL`.
- Preserve the repository's existing guard that aborts if test and production URLs are equal.
- Do not print connection strings or secrets.
- Use real PostgreSQL for database constraints, transaction behavior, FK restrictions and report SQL. SQLite is not an acceptable substitute for these tests.
- If `TEST_DATABASE_URL` is absent, report database tests as not run, not passed.
- Do not run destructive reset commands unless `ALLOW_DB_RESET=true` is set and the target is confirmed to be the test database.

3. Test organization

- Follow the existing `backend/tests/` layout. Extend current test modules where appropriate; do not create a second test framework.
- Recommended grouping:
  - Router/API tests: endpoint status codes, request validation, response models and query parameters.
  - Service tests: business rules and error mapping.
  - PostgreSQL integration tests: constraints, FK behavior and transaction rollback.
  - Report tests: each report endpoint and SQL query with all supported parameters.
- Use FastAPI's `TestClient` and dependency overrides for `get_session` if the project already uses that pattern. Tests must still connect to the PostgreSQL test database for database behavior.
- Use fixtures with isolated test data. Avoid depending on fixed auto-generated IDs or the current contents of a developer's Neon database.

4. Required API tests
   4.1 Resource reads
   For members, accounts, categories, income sources, budgets, bills and savings goals:

- GET collection returns 200 and a JSON array.
- GET by existing ID returns 200 and the correct Read schema fields.
- GET by unknown ID returns 404.
- Empty collection returns `[]`, not null or an error.
- Response does not expose `password_hash`.
- Account responses may show the current balance, but update requests must not control it.
- ⚠️ **Architecture Check**: Test must verify that the router calls a service function, not a repository function directly (enforcing the dependency rule).

  4.2 PATCH behavior
  For every resource that supports PATCH:

- Updating one permitted field changes only that field.
- Omitted fields remain unchanged.
- Explicitly clearing a nullable field works where permitted (for example `date_of_birth` or `target_date`).
- Empty PATCH body returns 422.
- Unknown/prohibited fields are rejected or ignored according to the chosen Pydantic configuration; choose strict rejection for protected fields and test it.
- Invalid enum, blank name, overlong text, invalid email and invalid Decimal return 422.
- Missing target ID returns 404.
- Duplicate unique value or FK conflict returns 409.
- Database constraints still reject invalid writes even if a service-level validation is accidentally bypassed.

Specific protected-field tests:

- PATCH account with `balance` must not change the stored balance.
- PATCH account with `opening_balance` must not change the stored opening balance.
- PATCH category with `category_type` must not change category type.
- PATCH budget with `category_id` or `budget_month` must not move the budget.
- PATCH bill with `category_id` must not reinterpret historical bill payments.
- PATCH member must never return or accept `password_hash`.

  4.3 Safe deletion and deactivation

- Member PATCH `is_active=false` succeeds and member history remains.
- Bill PATCH `is_active=false` succeeds and bill-payment history remains.
- Savings goal PATCH `is_active=false` succeeds and contributions remain.
- Deleting a budget succeeds only when permitted by its FK relationship.
- Deleting an account/category/income source with dependent records returns 409 and leaves all records intact.
- Deleting a safe unused record succeeds with 204.
- Deleting a nonexistent record returns 404.
- No endpoint deletes income, expense, bill-payment or savings-contribution ledger records.

  4.4 Transaction list and filters
  For income, expense, bill payments and savings contributions:

- GET collection returns the correct Read schema and Decimal money values.
- GET by ID returns 200 or 404 as appropriate.
- `member_id` filter returns only matching rows where applicable.
- `category_id` filter returns only matching income/expense rows; bill-payment filtering follows its linked expense category if implemented.
- `from` and `to` are inclusive.
- `from > to` returns 422.
- No matches returns `[]`.
- Supplying one filter must not accidentally discard the others.
- SQL parameters must be bound, not interpolated into SQL text.

  4.5 Transaction creation and atomicity
  Test all four existing create operations:

- Income inserts an income row and increases the selected account balance by exactly the amount.
- Expense inserts an expense row and decreases the selected account balance by exactly the amount.
- Bill payment inserts both the linked expense and bill-payment rows and decreases the account balance exactly once.
- Savings contribution inserts the contribution row and decreases the account balance exactly once.
- Negative, zero or excessive-precision amounts are rejected before commit.
- Missing member/account/category/bill/goal returns the appropriate 404.
- Wrong category type returns a 4xx business-rule response.
- Insufficient account balance rejects expense, bill payment or savings contribution.
- Duplicate bill payment for the same bill and period returns 409.
- A bill payment category must match its bill's category.
- `period_month` must be the first day of the month.
- A failure after a balance update but before all related rows are inserted rolls back every change.
- After rollback, both account balance and row counts equal their pre-request values.
- The rollback test must force a real database/service failure after at least one write has been staged. Merely submitting invalid Pydantic input does not prove transaction rollback.

  4.6 Budget warning

- Expense creation returns `budget_warning=false` below 80% of the category/month limit.
- At 80% or above, `budget_warning=true`.
- Above the budget limit, `over_budget=true`.
- At exactly the limit, verify the agreed existing service semantics (`over_budget` is currently `total > limit`, not `>=`).
- No matching budget returns both warning flags false.
- Bill-payment expense uses the same budget-warning calculation because it is an expense.
- A failed expense must not leave a changed budget total or account balance.

5. Reports tests
   Test all report routes with seeded and isolated PostgreSQL data:
   | Endpoint | Required verification |
   | --- | --- |
   | /reports/budget-vs-actual | Date filters work; zero-spend budgets remain visible; Decimal totals and status values are correct. |
   | /reports/member-spending | Member filter, date filters and `min_total` work; zero-spend members behave as defined by SQL. |
   | /reports/category-spending | Includes Expense categories, excludes Income categories, handles zero-spend categories. |
   | /reports/overdue-bills | `as_of` is honored; only unpaid past occurrences are returned. |
   | /reports/upcoming-bills | `as_of` and `days_ahead` are honored; only unpaid future/current occurrences in range are returned. |
   | /reports/savings-progress | Contributions aggregate correctly against each goal target. |
   | /reports/monthly-income-vs-expense | Income and expense totals are not multiplied by joins; date filters work. |
   | /reports/account-balances | Stored and computed balances/reconciliation fields match the database view. |

Also verify:

- Every report SQL query executes when optional parameters are `None` or have documented defaults.
- Invalid date ranges and negative numeric/day parameters return 422.
- Report endpoints are read-only.
- Money values remain Decimal-compatible in JSON; no float conversion is introduced.
- Every route passes all named parameters expected by its SQL file.

6. HTTP contract checks
   | Condition | Expected |
   | --- | --- |
   | Create succeeds | 201 |
   | Read/list succeeds | 200 |
   | PATCH succeeds | 200 |
   | DELETE succeeds | 204 |
   | Request validation fails | 422 |
   | Resource not found | 404 |
   | Unique/FK conflict | 409 |
   | Unexpected server/database outage | 5xx, without leaking internals |

Check OpenAPI at `/openapi.json` or Swagger `/docs`:

- All implemented paths and methods are present.
- Every operation has the intended request schema and response schema.
- No password hash appears in response schemas.
- No login/authentication/RBAC endpoints are introduced.

7. Good and bad testing practices
   | Good | Bad |
   | --- | --- |
   | Real PostgreSQL for constraints and transactions | SQLite-only tests for PostgreSQL behavior |
   | Unique test fixtures and cleanup | Depend on developer's existing database rows |
   | Assert both ledger rows and account balance | Assert only HTTP 201 |
   | Test rollback after a staged write | Treat 422 validation as rollback proof |
   | Test boundary values (79.99%, 80%, 100%) | Test only one ordinary amount |
   | Assert response schema and sensitive-field exclusion | Check only that response is non-empty |
   | Test FK conflicts and retained history | Assume pre-checks guarantee safe deletion |
   | Report skipped tests honestly | Claim all tests pass when DB tests skipped |

8. Commands and execution order
   From `backend/`:

```bash
uv sync
uv run pytest
```

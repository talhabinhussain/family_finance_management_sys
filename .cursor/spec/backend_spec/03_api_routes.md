API Routes Specification
Family Finance Management System — Database Systems Project
Order: `01_backend_structure.md` → `02_backend_structure.md` → this specification → `04_api_testing_acceptance.md`.

1. Purpose and fixed decisions
   Implement the missing API operations on the existing backend. Extend the current code; do not redesign the database or replace working services without evidence from a failing test.
   Scope: one household only. Do not add a `family` table or multi-household support.
   No authentication, login, JWT, authorization middleware or role-based access control in this milestone.
   Keep the existing `member.role` field as household-member information. It does not grant or restrict API permissions.
   Keep PostgreSQL on NeonDB, FastAPI, SQLModel, psycopg v3 and Python 3.13.
   Keep the repository's numbered raw-SQL migration runner. Do not add Alembic or change the migration strategy.
   SQLModel is used for CRUD and transactional ORM work. Handwritten SQL remains in `backend/sql/schema/` and `backend/sql/reports/`.
   Do not change applied schema files. This API milestone should not require schema changes.
   Money is `Decimal` / `NUMERIC(12,2)`, never float.
   No feature creep: implement only the existing proposal and database specifications.

2. Existing architecture and dependency rules
   Use the current structure:
   backend/src/
   models/tables.py
   models/schemas.py
   repositories/
   services/
   routers/
   database/db.py
   backend/sql/
   schema/
   reports/

Dependency direction is strict:
`router → service → repository → database`

- Routers define HTTP paths, query/path parameters, response models and status codes.
- Services enforce business rules, coordinate repository calls and own transaction boundaries.
- Repositories perform database reads/writes only. They never commit.
- Reuse `services/unit_of_work.py` and the existing `ServiceError`, `NotFoundError` and `ConflictError` pattern where appropriate.
- ⚠️ **CRITICAL ACTION**: Routers must **never** import or call repository functions directly. The current codebase has direct `list_all` imports in `members.py`, `accounts.py`, and `categories.py`. You must fix this existing violation by adding service-level list/get functions _before_ adding any new endpoints.
- Do not put SQL or business rules in routers or `main.py`.
- Keep `main.py` limited to app setup, CORS and router registration.

3. API conventions

- Use plural resource paths and existing prefixes.
- Use `GET` to retrieve, `POST` to create, `PATCH` for partial updates, and `DELETE` only when deletion is safe.
- Do not add `PUT` merely to duplicate `PATCH`.
- Every endpoint must declare an explicit `response_model`, except endpoints returning HTTP 204.
- Use `201 Created` for successful POST, `200 OK` for GET/PATCH, and `204 No Content` for successful DELETE.
- Use `404` for missing resources, `409` for uniqueness/FK conflicts, and `422` for invalid request data.
- Preserve `Decimal` in request, service and response layers.
- Use FastAPI `Query` constraints for pagination/filter bounds only if pagination is actually implemented. Do not introduce pagination as a new feature in this milestone.
- Use consistent `{resource_id}` path parameter names and validate positive IDs.
- Return the created/read schema, not an ORM object with an accidental `{}` response.

4. Resource endpoint contract
   All listed GET-by-ID endpoints return the corresponding `*Read` schema and return 404 when the ID does not exist.
   ⚠️ **Note for AI Agent**: The current codebase only has `POST` and `GET` (list) for these resources. You must implement the missing `GET /{id}`, `PATCH /{id}`, and conditional `DELETE /{id}` endpoints as specified below. Do not assume they exist.

| Resource       | Create / list (already present) | Add                                   |
| -------------- | ------------------------------- | ------------------------------------- |
| Members        | POST/GET /members               | GET/PATCH /members/{member_id}        |
| Accounts       | POST/GET /accounts              | GET/PATCH /accounts/{account_id}      |
| Categories     | POST/GET /categories            | GET/PATCH /categories/{category_id}   |
| Income sources | POST/GET /income-sources        | GET/PATCH /income-sources/{source_id} |
| Budgets        | POST/GET /budgets               | GET/PATCH/DELETE /budgets/{budget_id} |
| Bills          | POST/GET /bills                 | GET/PATCH /bills/{bill_id}            |
| Savings goals  | POST/GET /savings-goals         | GET/PATCH /savings-goals/{goal_id}    |

Keep the existing `/setup` router organization if that is how `main.py` currently registers setup resources. Do not create duplicate routes under another prefix.

4.1 PATCH request schemas

- Create separate Pydantic/SQLModel update schemas in `models/schemas.py`. Do not reuse Create schemas as PATCH schemas.
- Update fields must be optional so clients can send only changed values.
- Use `model_dump(exclude_unset=True)` so omitted fields are not overwritten.
- Reject an empty PATCH body with 422.
- Apply the same string length, whitespace, enum, date and Decimal validation as Create schemas.
- Never allow clients to patch primary keys, created timestamps, computed values, or foreign-key IDs unless explicitly permitted below.
- Do not use `exclude_none=True` globally: an explicitly supplied nullable field may need to be cleared.

Permitted editable fields:
| Resource | PATCH fields | Immutable / prohibited |
| --- | --- | --- |
| Member | full_name, email, role, date_of_birth, is_active | IDs, password hash, created timestamp |
| Account | account_name, account_type, owner_member_id | balance, opening_balance, IDs, created timestamp |
| Category | category_name | category_type, IDs |
| Income source | source_name | IDs |
| Budget | limit_amount | category_id, budget_month, IDs |
| Bill | bill_name, amount_due, due_date, recurrence, is_active | category_id, IDs |
| Savings goal | goal_name, target_amount, target_date, is_active | created_by_member_id, IDs |

A category's type, a budget's category/month, and a bill's category are deliberately immutable through this API because changing them can reinterpret existing financial history or violate related rules. Do not silently add broader update behavior.

4.2 Validation and error handling

- Reuse existing shared types such as `Name100`, `Name50`, `Email` and `Description`.
- Validate that referenced members/accounts/categories/goals exist before writing.
- Preserve database constraints as the final authority; Pydantic validation does not replace CHECK, UNIQUE or FK constraints.
- Map service `NotFoundError` to 404 and `ConflictError` to 409 through `routers/common.py`.
- Map known business-rule `ServiceError` instances to a suitable 4xx status. Do not expose SQL, connection strings, stack traces or raw database exception details.
- Ensure the session rolls back on every failed write.
- Avoid catching every exception and returning 400; unexpected errors should remain server errors and be logged by normal application handling.

5. Deletion and record lifecycle
   Deletion must preserve financial history. Follow the existing PostgreSQL foreign-key actions; never disable constraints or cascade-delete ledger records.
   | Resource | Rule |
   | --- | --- |
   | Member | Do not hard-delete. Set `is_active = false` using PATCH. |
   | Bill | Do not hard-delete. Set `is_active = false` using PATCH. |
   | Savings goal | Do not hard-delete. Set `is_active = false` using PATCH. |
   | Budget | DELETE is allowed only if the database relationship permits it; return 409 if restricted. |
   | Category | DELETE only if no income, expense, budget or bill references it; otherwise 409. |
   | Account | DELETE only if no financial record references it; otherwise 409. |
   | Income source | DELETE only if no income record references it; otherwise 409. |
   | Income, expense, bill payment, savings contribution | No DELETE endpoint in this milestone. |

Do not create separate `/status` endpoints: the existing `is_active` fields are updated through the resource PATCH endpoints. Do not add `is_active` columns to tables that do not already have them.
For safe hard deletes, check existence in the service, attempt deletion inside the unit of work, and still handle a database FK conflict as 409. Do not rely only on a pre-check because another transaction may create a reference between the check and delete.

6. Account balance and transaction invariants

- `Account.balance` is system-maintained. Never expose it as an update field.
- `opening_balance` is supplied only when creating an account. Do not allow it to be changed by PATCH because that would require a deliberate ledger reconciliation operation.
- Income increases the account balance.
- Expense, bill payment and savings contribution decrease the relevant account balance.
- Each financial write and its balance change must happen in one database transaction.
- Use atomic SQL updates such as `UPDATE account SET balance = balance - :amount WHERE account_id = :account_id AND balance >= :amount`.
- Never read a balance into Python, calculate a new balance there, then write it back.
- A failure at any point must roll back both the ledger row(s) and the balance update.
- Financial history is immutable through ordinary CRUD. Do not add transaction PATCH/DELETE or pretend that changing a transaction row alone is safe.
- Do not add a transfer feature or a reversal feature in this milestone.

7. Transaction read endpoints
   ⚠️ **Note for AI Agent**: The current `transactions.py` router only has `POST` endpoints. You must add the missing `GET` (list with optional filters) and `GET /{id}` endpoints for income, expense, bill-payments, and savings-contributions as detailed below.

Keep the existing create endpoints and add read endpoints. Use the existing `IncomeRead`, `ExpenseRead`, `BillPaymentRead` and `SavingsContributionRead` schemas.
| Method | Path | Response |
| --- | --- | --- |
| GET | /transactions/income | list[IncomeRead] |
| GET | /transactions/income/{income_id} | IncomeRead |
| GET | /transactions/expense | list[ExpenseRead] |
| GET | /transactions/expense/{expense_id} | ExpenseRead |
| GET | /transactions/bill-payments | list[BillPaymentRead] |
| GET | /transactions/bill-payments/{payment_id} | BillPaymentRead |
| GET | /transactions/savings-contributions | list[SavingsContributionRead] |
| GET | /transactions/savings-contributions/{contribution_id} | SavingsContributionRead |

Support optional list filters where applicable:

- `member_id`
- `category_id` (income/expense; bill-payment filtering may use the linked expense category)
- `from` and `to` dates, mapped to the relevant transaction/contribution date column.

Validate `from <= to` when both are supplied. Use inclusive date filtering (`>= from`, `<= to`). Use SQLModel query expressions or parameterized SQL; never build SQL from user strings. Return an empty list when no records match. GET-by-ID returns 404 when missing.

Keep existing POST paths:

- `POST /transactions/income`
- `POST /transactions/expense`
- `POST /transactions/bill-payment`
- `POST /transactions/savings-contribution`

Add explicit response models: `IncomeRead`, `ExpenseResult` (existing expense/bill-payment warning result), and `SavingsContributionRead` as appropriate. Do not return `{}` for successful income or savings contribution creation. Preserve the existing bill-payment result contract unless a clear API consistency fix is implemented and tested.

8. Reports API
   Keep report SQL in `backend/sql/reports/` and execute it through the existing `run_report()` repository using `text()` and named parameters. Do not move report SQL into routers or f-strings.
   Expose these GET endpoints:
   | Path | Query parameters |
   | --- | --- |
   | /reports/budget-vs-actual | start_month, end_month |
   | /reports/member-spending | member_id, start_month, end_month, min_total |
   | /reports/category-spending | start_month, end_month |
   | /reports/overdue-bills | as_of |
   | /reports/upcoming-bills | as_of, days_ahead |
   | /reports/savings-progress | none |
   | /reports/monthly-income-vs-expense | start_month, end_month |
   | /reports/account-balances | none |

⚠️ **Note for AI Agent**: The SQL files `category_spending.sql` and `upcoming_bills.sql` **confirmed to exist** in `backend/sql/reports/`. You **must** add the corresponding GET routes to `routers/reports.py` to expose them, matching the parameter and response model patterns of the existing reports.

- Pass every parameter expected by each SQL file, including explicit `None` values where appropriate. This prevents NULL-parameter query failures.
- Validate `start_month <= end_month`; validate non-negative `min_total` and a sensible non-negative `days_ahead`.
- Use `date.today()` as the default `as_of` date when omitted.
- Use the existing report row schemas in `models/schemas.py` as response models. Inspect their exact field names before wiring each route; do not invent or rename report columns.
- Preserve Decimal values from PostgreSQL. Do not cast money to float.
- Keep report routes read-only.

9. Implementation sequence
   Implement in small vertical slices and keep each change testable:
1. Add repository get-by-ID and filtered-list functions.
1. Add service functions that call those repositories and raise `NotFoundError` consistently.
1. Add GET-by-ID endpoints and route all existing list endpoints through services (fixing any direct repository imports).
1. Add dedicated PATCH schemas, repository updates and service validation for setup resources.
1. Add safe DELETE for budget/category/account/income source only, respecting FK restrictions.
1. Add transaction list/get services and routes with filters.
1. Add report routes, parameters and response models.
1. Add/adjust tests according to `04_api_testing_acceptance.md`.

Do not implement all endpoints in one large router function. Keep functions small and use shared helpers only where they remove real duplication.

10. Good practices and bad practices
    | Good practice | Bad practice |
    | --- | --- |
    | Router → service → repository | Router imports repository functions |
    | PATCH with dedicated update schema | Reusing Create schema for PATCH |
    | exclude_unset=True | Overwriting omitted fields with defaults |
    | Decimal end to end | float for money |
    | Database constraints + service checks | Python validation as the only protection |
    | Atomic balance update in one transaction | Read-modify-write balance in Python |
    | Deactivate history-bearing records | Delete members/bills/goals with history |
    | 409 on FK/unique conflict | Ignore constraint errors or return 500 |
    | Explicit response models | Returning untyped ORM objects / `{}` |
    | Immutable transaction history | Generic PATCH/DELETE for ledger rows |
    | Named SQL parameters | SQL string concatenation / f-strings |
    | Small tested vertical slices | Implement every route in one untested change |

11. Out of scope
    Do not implement authentication, login, JWT, RBAC, per-member permissions, multi-household tenancy, transfers, transaction reversals, recurring automation/schedulers, frontend screens, notifications, or new database tables/columns. These are not required for this API milestone.

12. Completion hand-off
    After implementation, update `backend/README.md` only where its endpoint list or run instructions are now inaccurate. Do not rewrite unrelated documentation. Run the acceptance checklist in `04_api_testing_acceptance.md` and report:

- endpoints added/changed;
- files changed;
- tests executed and results;
- any blocked item and its exact reason.
  Do not claim completion if the PostgreSQL-backed tests were skipped.

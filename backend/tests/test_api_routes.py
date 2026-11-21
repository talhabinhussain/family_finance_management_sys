from datetime import date, timedelta
from decimal import Decimal
import inspect

import pytest

from src.routers import accounts, categories, members, reports, setup, transactions


def test_architecture_routers_do_not_import_repositories():
    """Routers must never import or call repository functions directly."""
    for router_module in [
        members,
        accounts,
        categories,
        setup,
        transactions,
        reports,
    ]:
        source = inspect.getsource(router_module)
        assert "src.repositories" not in source, f"{router_module.__name__} imports from src.repositories directly!"


def test_member_crud_and_patch(client):
    # Empty list
    res = client.get("/members")
    assert res.status_code == 200
    assert res.json() == []

    # Create member
    payload = {
        "full_name": "Alice Tester",
        "email": "alice@example.com",
        "password": "secretPassword123",
        "role": "Admin",
        "date_of_birth": "1990-01-01",
    }
    res = client.post("/members", json=payload)
    assert res.status_code == 201
    member = res.json()
    member_id = member["member_id"]
    assert member["full_name"] == "Alice Tester"
    assert member["email"] == "alice@example.com"
    assert "password_hash" not in member
    assert "password" not in member
    assert member["is_active"] is True

    # Get by ID
    res = client.get(f"/members/{member_id}")
    assert res.status_code == 200
    assert res.json()["member_id"] == member_id
    assert "password_hash" not in res.json()

    # Get non-existent
    res = client.get("/members/99999")
    assert res.status_code == 404

    # Invalid ID
    res = client.get("/members/0")
    assert res.status_code == 422

    # PATCH empty body -> 422
    res = client.patch(f"/members/{member_id}", json={})
    assert res.status_code == 422

    # PATCH prohibited field -> 422
    res = client.patch(f"/members/{member_id}", json={"password_hash": "hacked"})
    assert res.status_code == 422

    # PATCH permitted fields
    res = client.patch(f"/members/{member_id}", json={"full_name": "Alice Updated", "is_active": False})
    assert res.status_code == 200
    updated = res.json()
    assert updated["full_name"] == "Alice Updated"
    assert updated["email"] == "alice@example.com"  # unchanged
    assert updated["is_active"] is False


def test_account_crud_and_balance_immutability(client):
    # Create member
    m_res = client.post(
        "/members",
        json={"full_name": "Bob Member", "email": "bob@example.com", "password": "pass", "role": "Earning Member"},
    )
    assert m_res.status_code == 201
    member_id = m_res.json()["member_id"]

    # Create account
    res = client.post(
        "/accounts",
        json={
            "account_name": "Bob Checking",
            "account_type": "Bank",
            "owner_member_id": member_id,
            "opening_balance": "500.00",
        },
    )
    assert res.status_code == 201
    account = res.json()
    account_id = account["account_id"]
    assert Decimal(str(account["balance"])) == Decimal("500.00")

    # Get account
    res = client.get(f"/accounts/{account_id}")
    assert res.status_code == 200
    assert res.json()["account_name"] == "Bob Checking"

    # Attempt to patch balance -> strictly 422
    res = client.patch(f"/accounts/{account_id}", json={"balance": "1000000.00"})
    assert res.status_code == 422

    # Attempt to patch opening_balance -> 422
    res = client.patch(f"/accounts/{account_id}", json={"opening_balance": "1000000.00"})
    assert res.status_code == 422

    # Valid PATCH
    res = client.patch(f"/accounts/{account_id}", json={"account_name": "Bob Savings"})
    assert res.status_code == 200
    assert res.json()["account_name"] == "Bob Savings"
    assert Decimal(str(res.json()["balance"])) == Decimal("500.00")

    # Safe delete unreferenced account -> 204
    res = client.delete(f"/accounts/{account_id}")
    assert res.status_code == 204

    # Deleted account -> 404
    res = client.get(f"/accounts/{account_id}")
    assert res.status_code == 404


def test_category_immutability_and_fk_deletion_conflict(client):
    # Create category
    res = client.post("/categories", json={"category_name": "Groceries", "category_type": "Expense"})
    assert res.status_code == 201
    cat_id = res.json()["category_id"]

    # Attempt to change category_type via PATCH -> 422
    res = client.patch(f"/categories/{cat_id}", json={"category_type": "Income"})
    assert res.status_code == 422

    # Patch category name
    res = client.patch(f"/categories/{cat_id}", json={"category_name": "Food & Groceries"})
    assert res.status_code == 200
    assert res.json()["category_name"] == "Food & Groceries"

    # Create budget on this category
    b_res = client.post(
        "/budgets",
        json={"category_id": cat_id, "budget_month": "2026-01-01", "limit_amount": "300.00"},
    )
    assert b_res.status_code == 201

    # Attempt delete category with dependent budget -> 409 Conflict
    res = client.delete(f"/categories/{cat_id}")
    assert res.status_code == 409

    # Category still exists
    res = client.get(f"/categories/{cat_id}")
    assert res.status_code == 200


def test_transaction_reads_and_date_filters(client):
    # Setup member, account, categories, income source
    m_res = client.post(
        "/members",
        json={"full_name": "Tx User", "email": "tx@example.com", "password": "pass", "role": "Earning Member"},
    )
    assert m_res.status_code == 201
    m = m_res.json()
    acc_res = client.post(
        "/accounts",
        json={"account_name": "Tx Account", "account_type": "Bank", "owner_member_id": m["member_id"], "opening_balance": "1000.00"},
    )
    assert acc_res.status_code == 201
    acc = acc_res.json()
    cat_inc = client.post("/categories", json={"category_name": "Salary", "category_type": "Income"}).json()
    cat_exp = client.post("/categories", json={"category_name": "Dining", "category_type": "Expense"}).json()
    src = client.post("/income-sources", json={"source_name": "Company"}).json()

    # Record Income
    inc_res = client.post(
        "/transactions/income",
        json={
            "member_id": m["member_id"],
            "account_id": acc["account_id"],
            "category_id": cat_inc["category_id"],
            "income_source_id": src["income_source_id"],
            "amount": "250.00",
            "transaction_date": "2026-05-10",
            "description": "Bonus",
        },
    )
    assert inc_res.status_code == 201
    income_data = inc_res.json()
    assert income_data["income_id"] > 0
    assert Decimal(str(income_data["amount"])) == Decimal("250.00")

    # Get Income by ID
    res = client.get(f"/transactions/income/{income_data['income_id']}")
    assert res.status_code == 200
    assert res.json()["description"] == "Bonus"

    # Record Expense
    exp_res = client.post(
        "/transactions/expense",
        json={
            "member_id": m["member_id"],
            "account_id": acc["account_id"],
            "category_id": cat_exp["category_id"],
            "amount": "50.00",
            "transaction_date": "2026-05-15",
            "description": "Lunch",
        },
    )
    assert exp_res.status_code == 201
    exp_data = exp_res.json()
    assert exp_data["expense_id"] > 0

    # Get Expense by ID
    res = client.get(f"/transactions/expense/{exp_data['expense_id']}")
    assert res.status_code == 200
    assert res.json()["description"] == "Lunch"

    # List Income with filters
    res = client.get(f"/transactions/income?member_id={m['member_id']}")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Date range inclusive
    res = client.get("/transactions/income?from=2026-05-10&to=2026-05-10")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Date range outside
    res = client.get("/transactions/income?from=2026-05-11&to=2026-05-20")
    assert res.status_code == 200
    assert len(res.json()) == 0

    # Invalid date range (from > to) -> 422
    res = client.get("/transactions/income?from=2026-05-20&to=2026-05-10")
    assert res.status_code == 422


def test_savings_contribution_crud_and_read(client):
    m_res = client.post(
        "/members",
        json={"full_name": "Saver", "email": "saver@example.com", "password": "pass", "role": "Earning Member"},
    )
    assert m_res.status_code == 201
    m = m_res.json()
    acc_res = client.post(
        "/accounts",
        json={"account_name": "Savings Acc", "account_type": "Bank", "owner_member_id": m["member_id"], "opening_balance": "500.00"},
    )
    assert acc_res.status_code == 201
    acc = acc_res.json()
    goal = client.post(
        "/savings-goals",
        json={"goal_name": "Emergency Fund", "target_amount": "1000.00", "created_by_member_id": m["member_id"]},
    ).json()

    # Record savings contribution
    res = client.post(
        "/transactions/savings-contribution",
        json={
            "goal_id": goal["goal_id"],
            "member_id": m["member_id"],
            "account_id": acc["account_id"],
            "amount": "100.00",
            "contribution_date": "2026-06-01",
            "description": "First deposit",
        },
    )
    assert res.status_code == 201
    sc = res.json()
    assert sc["contribution_id"] > 0
    assert Decimal(str(sc["amount"])) == Decimal("100.00")

    # Get by ID
    res = client.get(f"/transactions/savings-contributions/{sc['contribution_id']}")
    assert res.status_code == 200
    assert res.json()["contribution_id"] == sc["contribution_id"]

    # List savings contributions
    res = client.get("/transactions/savings-contributions")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_reports_endpoints(client):
    # Verify all 8 reports return 200 and accept valid parameters
    endpoints = [
        "/reports/budget-vs-actual",
        "/reports/member-spending",
        "/reports/category-spending",
        "/reports/overdue-bills",
        "/reports/upcoming-bills",
        "/reports/savings-progress",
        "/reports/monthly-income-vs-expense",
        "/reports/account-balances",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"{ep} failed: {res.text}"
        assert isinstance(res.json(), list)

    # Test invalid report parameters return 422
    # start_month > end_month
    res = client.get("/reports/budget-vs-actual?start_month=2026-12-01&end_month=2026-01-01")
    assert res.status_code == 422

    # min_total < 0
    res = client.get("/reports/member-spending?min_total=-5")
    assert res.status_code == 422

    # days_ahead < 0
    res = client.get("/reports/upcoming-bills?days_ahead=-10")
    assert res.status_code == 422


def test_bill_reports_serialize_rows(client):
    category = client.post("/categories", json={"category_name": "Utilities", "category_type": "Expense"}).json()
    today = date.today()
    for name, due in [("Overdue Bill", today - timedelta(days=5)), ("Upcoming Bill", today + timedelta(days=5))]:
        res = client.post("/bills", json={
            "bill_name": name, "amount_due": "100.00", "due_date": due.isoformat(),
            "recurrence": "One-time", "category_id": category["category_id"],
        })
        assert res.status_code == 201
    overdue = client.get("/reports/overdue-bills")
    assert overdue.status_code == 200
    assert [r["bill_name"] for r in overdue.json()] == ["Overdue Bill"]
    assert overdue.json()[0]["days_overdue"] == 5
    upcoming = client.get("/reports/upcoming-bills")
    assert upcoming.status_code == 200
    assert [r["bill_name"] for r in upcoming.json()] == ["Upcoming Bill"]
    assert upcoming.json()[0]["days_until_due"] == 5

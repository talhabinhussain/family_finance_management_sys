from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import text

from src.repositories.reports import run_report
from tests.db_helpers import (
    make_account,
    make_bill,
    make_bill_payment,
    make_budget,
    make_category,
    make_expense,
    make_income,
    make_income_source,
    make_member,
)


REPORT_DIR = Path(__file__).resolve().parents[1] / "sql" / "reports"


def test_t10_all_reports_accept_none_parameters(session):
    params = {
        "start_month": None,
        "end_month": None,
        "member_id": None,
        "min_total": None,
        "as_of": date.today(),
        "days_ahead": None,
    }
    for path in sorted(REPORT_DIR.glob("*.sql")):
        run_report(session, path.stem, params)


def test_t11_end_month_includes_entire_month(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    make_expense(
        session,
        member_id=member_id,
        account_id=account_id,
        category_id=category_id,
        amount=Decimal("25"),
        transaction_date=date(2026, 9, 25),
    )
    session.commit()

    rows = run_report(session, "member_spending", {
        "start_month": None, "end_month": date(2026, 9, 1),
        "member_id": None, "min_total": None,
    })
    assert rows[0]["total_spending"] == Decimal("25.00")


def test_t12_recurring_bill_schedule_and_payments(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session, category_name="Utilities")
    bill_id = make_bill(session, due_date=date(2026, 8, 31), category_id=category_id)
    anchor_expense = make_expense(
        session, member_id=member_id, account_id=account_id, category_id=category_id,
        transaction_date=date(2026, 8, 31),
    )
    make_bill_payment(session, bill_id=bill_id, expense_id=anchor_expense, period_month=date(2026, 8, 1))
    session.commit()

    params = {"as_of": date(2026, 11, 1)}
    rows = run_report(session, "overdue_bills", params)
    assert [row["due_date"] for row in rows] == [date(2026, 9, 30), date(2026, 10, 31)]

    payment_expense = make_expense(
        session, member_id=member_id, account_id=account_id, category_id=category_id,
        transaction_date=date(2026, 10, 31), amount=Decimal("100"),
    )
    make_bill_payment(session, bill_id=bill_id, expense_id=payment_expense, period_month=date(2026, 9, 1))
    session.commit()
    assert len(run_report(session, "overdue_bills", params)) == 1


def test_t13_upcoming_bills_defaults_to_thirty_days(session):
    category_id = make_category(session, category_name="Utilities")
    make_bill(session, due_date=date(2026, 11, 30), category_id=category_id)
    make_bill(session, bill_name="Later Bill", due_date=date(2026, 12, 20), category_id=category_id)
    session.commit()

    rows = run_report(session, "upcoming_bills", {"as_of": date(2026, 11, 18), "days_ahead": None})
    assert [row["due_date"] for row in rows] == [date(2026, 11, 30)]


def test_t14_budget_statuses(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    near_id = make_category(session, category_name="Transport")
    over_id = make_category(session, category_name="Utilities")
    zero_id = make_category(session, category_name="Education")
    for category, limit in [(category_id, Decimal("100")), (near_id, Decimal("100")), (over_id, Decimal("100")), (zero_id, Decimal("0"))]:
        make_budget(session, category_id=category, budget_month=date(2026, 9, 1), limit_amount=limit)
    make_expense(session, member_id=member_id, account_id=account_id, category_id=category_id, amount=Decimal("0.01"), transaction_date=date(2026, 9, 1))
    make_expense(session, member_id=member_id, account_id=account_id, category_id=near_id, amount=Decimal("85"), transaction_date=date(2026, 9, 2))
    make_expense(session, member_id=member_id, account_id=account_id, category_id=over_id, amount=Decimal("101"), transaction_date=date(2026, 9, 3))
    make_expense(session, member_id=member_id, account_id=account_id, category_id=zero_id, amount=Decimal("1"), transaction_date=date(2026, 9, 4))
    session.commit()

    rows = run_report(session, "budget_vs_actual", {"start_month": None, "end_month": None})
    statuses = {row["category_name"]: row for row in rows}
    assert statuses["Food"]["status"] == "OK"
    assert statuses["Transport"]["status"] == "Near limit"
    assert statuses["Utilities"]["status"] == "Over budget"
    assert statuses["Education"]["status"] == "Over budget"
    assert statuses["Education"]["percent_used"] is None


def test_t15_member_spending_having_and_zero_member(session):
    member_id = make_member(session)
    zero_member_id = make_member(session, email="zero@example.com", full_name="Zero Member")
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    make_expense(session, member_id=member_id, account_id=account_id, category_id=category_id, amount=Decimal("100"))
    session.commit()

    base = {"start_month": None, "end_month": None, "member_id": None}
    rows = run_report(session, "member_spending", {**base, "min_total": None})
    totals = {row["member_id"]: row["total_spending"] for row in rows}
    assert totals[member_id] == Decimal("100.00")
    assert totals[zero_member_id] == Decimal("0.00")
    filtered = run_report(session, "member_spending", {**base, "min_total": Decimal("50")})
    assert [row["member_id"] for row in filtered] == [member_id]


def test_t16_category_spending_filters_type_and_includes_zero_rows(session):
    expense_category = make_category(session, category_name="Food")
    zero_category = make_category(session, category_name="Education")
    make_category(session, category_name="Salary", category_type="Income")
    session.commit()

    rows = run_report(session, "category_spending", {"start_month": None, "end_month": None})
    names = {row["category_name"]: row for row in rows}
    assert "Salary" not in names
    assert names["Food"]["total_spending"] == Decimal("0.00")
    assert names["Education"]["total_spending"] == Decimal("0.00")


def test_t17_monthly_view_aggregates_without_row_multiplication(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    income_category = make_category(session, category_name="Salary", category_type="Income")
    expense_category = make_category(session)
    source_id = make_income_source(session)
    for amount in (Decimal("10"), Decimal("20"), Decimal("30")):
        make_income(session, member_id=member_id, account_id=account_id, category_id=income_category, income_source_id=source_id, amount=amount, transaction_date=date(2026, 9, 5))
        make_expense(session, member_id=member_id, account_id=account_id, category_id=expense_category, amount=amount, transaction_date=date(2026, 9, 6))
    make_income(session, member_id=member_id, account_id=account_id, category_id=income_category, income_source_id=source_id, amount=Decimal("40"), transaction_date=date(2026, 10, 5))
    session.commit()

    rows = run_report(session, "monthly_income_vs_expense", {"start_month": None, "end_month": None})
    by_month = {row["month"]: row for row in rows}
    assert by_month[date(2026, 9, 1)]["total_income"] == Decimal("60.00")
    assert by_month[date(2026, 9, 1)]["total_expense"] == Decimal("60.00")
    assert by_month[date(2026, 10, 1)]["total_income"] == Decimal("40.00")
    assert by_month[date(2026, 10, 1)]["total_expense"] == Decimal("0.00")

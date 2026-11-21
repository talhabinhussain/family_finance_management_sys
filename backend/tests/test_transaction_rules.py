from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import text

from src.models.schemas import (
    BillPaymentCreate,
    ExpenseCreate,
    IncomeCreate,
    SavingsContributionCreate,
)
from src.services import transactions
from src.services.errors import ConflictError, ServiceError
from src.services.unit_of_work import execute
from tests.db_helpers import (
    make_account,
    make_bill,
    make_category,
    make_income_source,
    make_member,
    make_savings_goal,
)


def _bill_payment(member_id, account_id, bill_id, category_id, period_month):
    return BillPaymentCreate(
        member_id=member_id,
        account_id=account_id,
        bill_id=bill_id,
        category_id=category_id,
        amount=Decimal("100.00"),
        transaction_date=period_month,
        period_month=period_month,
    )


def test_unscheduled_bill_period_does_not_write_or_change_balance(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    bill_id = make_bill(session, due_date=date.today().replace(day=1), category_id=category_id)
    session.commit()

    with pytest.raises(ServiceError, match="period_month is not a scheduled due period for this bill"):
        execute(
            session,
            lambda: transactions.create_bill_payment(
                session, _bill_payment(member_id, account_id, bill_id, category_id, date(2020, 1, 1))
            ),
        )

    assert session.execute(text("SELECT balance FROM account WHERE account_id = :id"), {"id": account_id}).scalar_one() == Decimal("1000.00")
    assert session.execute(text("SELECT COUNT(*) FROM expense WHERE account_id = :id"), {"id": account_id}).scalar_one() == 0


def test_scheduled_bill_period_succeeds_and_duplicate_is_conflict(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    period = date.today().replace(day=1)
    bill_id = make_bill(session, due_date=period, category_id=category_id)
    session.commit()
    payment = _bill_payment(member_id, account_id, bill_id, category_id, period)

    execute(session, lambda: transactions.create_bill_payment(session, payment))
    with pytest.raises(ConflictError, match="This bill has already been paid for that month"):
        execute(session, lambda: transactions.create_bill_payment(session, payment))

    assert session.execute(text("SELECT balance FROM account WHERE account_id = :id"), {"id": account_id}).scalar_one() == Decimal("900.00")
    assert session.execute(text("SELECT COUNT(*) FROM bill_payment WHERE bill_id = :id"), {"id": bill_id}).scalar_one() == 1
    assert session.execute(text("SELECT COUNT(*) FROM expense WHERE account_id = :id"), {"id": account_id}).scalar_one() == 1


def test_inactive_bill_payment_is_rejected(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session)
    period = date.today().replace(day=1)
    bill_id = make_bill(session, due_date=period, category_id=category_id)
    session.execute(text("UPDATE bill SET is_active = false WHERE bill_id = :id"), {"id": bill_id})
    session.commit()

    with pytest.raises(ServiceError, match="Bill is not active"):
        execute(session, lambda: transactions.create_bill_payment(
            session, _bill_payment(member_id, account_id, bill_id, category_id, period)
        ))


def test_inactive_member_is_rejected_for_all_transaction_types(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    income_category_id = make_category(session, category_name="Salary", category_type="Income")
    expense_category_id = make_category(session)
    source_id = make_income_source(session)
    period = date.today().replace(day=1)
    bill_id = make_bill(session, due_date=period, category_id=expense_category_id)
    goal_id = make_savings_goal(session, created_by_member_id=member_id)
    session.execute(text("UPDATE member SET is_active = false WHERE member_id = :id"), {"id": member_id})
    session.commit()

    operations = [
        lambda: transactions.create_income(session, IncomeCreate(
            member_id=member_id, account_id=account_id, category_id=income_category_id,
            income_source_id=source_id, amount=Decimal("100.00"), transaction_date=period,
        )),
        lambda: transactions.create_expense(session, ExpenseCreate(
            member_id=member_id, account_id=account_id, category_id=expense_category_id,
            amount=Decimal("100.00"), transaction_date=period,
        )),
        lambda: transactions.create_bill_payment(
            session, _bill_payment(member_id, account_id, bill_id, expense_category_id, period)
        ),
        lambda: transactions.create_savings_contribution(session, SavingsContributionCreate(
            goal_id=goal_id, member_id=member_id, account_id=account_id,
            amount=Decimal("100.00"), contribution_date=period,
        )),
    ]
    for operation in operations:
        with pytest.raises(ServiceError, match="Member is inactive"):
            execute(session, operation)

    assert session.execute(text("SELECT balance FROM account WHERE account_id = :id"), {"id": account_id}).scalar_one() == Decimal("1000.00")
    counts = session.execute(
        text(
            "SELECT "
            "(SELECT COUNT(*) FROM income WHERE account_id = :id) AS income_count, "
            "(SELECT COUNT(*) FROM expense WHERE account_id = :id) AS expense_count, "
            "(SELECT COUNT(*) FROM bill_payment bp JOIN expense e ON e.expense_id = bp.expense_id WHERE e.account_id = :id) AS payment_count, "
            "(SELECT COUNT(*) FROM savings_contribution WHERE account_id = :id) AS contribution_count"
        ),
        {"id": account_id},
    ).one()
    assert counts == (0, 0, 0, 0)


def test_inactive_savings_goal_is_rejected_without_changing_balance(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    goal_id = make_savings_goal(session, created_by_member_id=member_id)
    session.execute(text("UPDATE savings_goal SET is_active = false WHERE goal_id = :id"), {"id": goal_id})
    session.commit()

    with pytest.raises(ServiceError, match="Savings goal is not active"):
        execute(session, lambda: transactions.create_savings_contribution(session, SavingsContributionCreate(
            goal_id=goal_id, member_id=member_id, account_id=account_id,
            amount=Decimal("100.00"), contribution_date=date.today(),
        )))

    assert session.execute(text("SELECT balance FROM account WHERE account_id = :id"), {"id": account_id}).scalar_one() == Decimal("1000.00")
    assert session.execute(text("SELECT COUNT(*) FROM savings_contribution WHERE goal_id = :id"), {"id": goal_id}).scalar_one() == 0

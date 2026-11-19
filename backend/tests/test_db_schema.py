from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

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
    make_savings_contribution,
    make_savings_goal,
)


def test_t1_amount_must_be_positive(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    income_category_id = make_category(session, category_name="Salary", category_type="Income")
    expense_category_id = make_category(session, category_name="Food", category_type="Expense")
    source_id = make_income_source(session)
    goal_id = make_savings_goal(session, created_by_member_id=member_id)
    session.commit()

    with pytest.raises(IntegrityError):
        make_income(
            session,
            member_id=member_id,
            account_id=account_id,
            category_id=income_category_id,
            income_source_id=source_id,
            amount=Decimal("0"),
        )
    session.rollback()

    with pytest.raises(IntegrityError):
        make_expense(
            session,
            member_id=member_id,
            account_id=account_id,
            category_id=expense_category_id,
            amount=Decimal("-1"),
        )
    session.rollback()

    with pytest.raises(IntegrityError):
        make_savings_contribution(
            session,
            goal_id=goal_id,
            member_id=member_id,
            account_id=account_id,
            amount=Decimal("0"),
        )
    session.rollback()


def test_t2_budget_constraints(session):
    make_member(session)
    category_id = make_category(session, category_name="Food", category_type="Expense")
    session.commit()

    with pytest.raises(IntegrityError):
        make_budget(session, category_id=category_id, limit_amount=Decimal("-1"))
    session.rollback()

    with pytest.raises(IntegrityError):
        make_budget(session, category_id=category_id, budget_month=date(2026, 9, 15))
    session.rollback()

    make_budget(session, category_id=category_id, budget_month=date(2026, 9, 1))
    session.commit()

    with pytest.raises(IntegrityError):
        make_budget(session, category_id=category_id, budget_month=date(2026, 9, 1))
    session.rollback()


def test_t3_bill_payment_uniqueness(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session, category_name="Utilities", category_type="Expense")
    bill_id = make_bill(session, category_id=category_id)
    expense_id_1 = make_expense(
        session, member_id=member_id, account_id=account_id, category_id=category_id
    )
    expense_id_2 = make_expense(
        session,
        member_id=member_id,
        account_id=account_id,
        category_id=category_id,
        amount=Decimal("60"),
        transaction_date=date(2026, 10, 10),
    )
    session.commit()

    make_bill_payment(
        session, bill_id=bill_id, expense_id=expense_id_1, period_month=date(2026, 9, 1)
    )
    session.commit()

    with pytest.raises(IntegrityError):
        make_bill_payment(
            session, bill_id=bill_id, expense_id=expense_id_2, period_month=date(2026, 9, 1)
        )
    session.rollback()

    make_bill_payment(
        session, bill_id=bill_id, expense_id=expense_id_2, period_month=date(2026, 10, 1)
    )
    session.commit()

    with pytest.raises(IntegrityError):
        make_bill_payment(
            session, bill_id=bill_id, expense_id=expense_id_2, period_month=date(2026, 11, 1)
        )
    session.rollback()


def test_t4_category_type_triggers(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    income_category_id = make_category(session, category_name="Salary", category_type="Income")
    expense_category_id = make_category(session, category_name="Food", category_type="Expense")
    source_id = make_income_source(session)
    session.commit()

    with pytest.raises(IntegrityError):
        make_expense(
            session,
            member_id=member_id,
            account_id=account_id,
            category_id=income_category_id,
        )
    session.rollback()

    with pytest.raises(IntegrityError):
        make_income(
            session,
            member_id=member_id,
            account_id=account_id,
            category_id=expense_category_id,
            income_source_id=source_id,
        )
    session.rollback()

    with pytest.raises(IntegrityError):
        make_bill(session, category_id=income_category_id)
    session.rollback()

    with pytest.raises(IntegrityError):
        make_budget(session, category_id=income_category_id)
    session.rollback()


def test_t5_immutable_category_and_bill_payment_match(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    utilities_id = make_category(session, category_name="Utilities", category_type="Expense")
    food_id = make_category(session, category_name="Food", category_type="Expense")
    income_category_id = make_category(session, category_name="Salary", category_type="Income")
    bill_id = make_bill(session, category_id=utilities_id)
    mismatched_expense_id = make_expense(
        session, member_id=member_id, account_id=account_id, category_id=food_id
    )
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(
            text("UPDATE category SET category_type = 'Expense' WHERE category_id = :id"),
            {"id": income_category_id},
        )
        session.commit()
    session.rollback()

    with pytest.raises(IntegrityError):
        make_bill_payment(
            session,
            bill_id=bill_id,
            expense_id=mismatched_expense_id,
            period_month=date(2026, 9, 1),
        )
    session.rollback()


def test_t6_on_delete_restrict(session):
    member_id = make_member(session)
    account_id = make_account(session, owner_member_id=member_id)
    category_id = make_category(session, category_name="Food", category_type="Expense")
    make_expense(session, member_id=member_id, account_id=account_id, category_id=category_id)
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(text("DELETE FROM member WHERE member_id = :id"), {"id": member_id})
        session.commit()
    session.rollback()

    with pytest.raises(IntegrityError):
        session.execute(text("DELETE FROM category WHERE category_id = :id"), {"id": category_id})
        session.commit()
    session.rollback()


def test_t7_account_and_name_uniqueness(session):
    member_id = make_member(session)
    category_id = make_category(session, category_name="Utilities", category_type="Expense")
    session.commit()

    with pytest.raises(IntegrityError):
        make_account(session, balance=Decimal("-1"))
    session.rollback()

    with pytest.raises(IntegrityError):
        make_account(session, opening_balance=Decimal("-1"))
    session.rollback()

    make_account(session, account_name="Household Bank", owner_member_id=member_id)
    session.commit()

    with pytest.raises(IntegrityError):
        make_account(session, account_name="Household Bank")
    session.rollback()

    make_bill(session, bill_name="Electricity", category_id=category_id)
    session.commit()

    with pytest.raises(IntegrityError):
        make_bill(session, bill_name="Electricity", category_id=category_id)
    session.rollback()

    make_savings_goal(session, goal_name="Emergency Fund", created_by_member_id=member_id)
    session.commit()

    with pytest.raises(IntegrityError):
        make_savings_goal(session, goal_name="Emergency Fund", created_by_member_id=member_id)
    session.rollback()


def test_t8_member_constraints(session):
    with pytest.raises(IntegrityError):
        make_member(session, email="UPPER@EXAMPLE.COM")
    session.rollback()

    make_member(session, email="dup@example.com")
    session.commit()

    with pytest.raises(IntegrityError):
        make_member(session, email="dup@example.com", full_name="Other")
    session.rollback()

    with pytest.raises(IntegrityError):
        make_member(session, email="role@example.com", role="Guest")
    session.rollback()

    with pytest.raises(IntegrityError):
        make_member(
            session,
            email="future@example.com",
            date_of_birth=date.today() + timedelta(days=1),
        )
    session.rollback()

    with pytest.raises(IntegrityError):
        make_member(session, email="blank@example.com", full_name="   ")
    session.rollback()


def test_t9_varchar_length_limit(session):
    with pytest.raises(DBAPIError):
        make_member(session, full_name="x" * 101, email="long@example.com")
    session.rollback()

from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError
from sqlmodel import select

from src.models.schemas import ExpenseCreate
from src.models.tables import Account, Category, Expense, Member
from src.services.errors import ServiceError
from src.services.transactions import create_expense
from src.services.unit_of_work import execute


def create_setup(session):
    member = Member(full_name="Test Member", email="test@example.com", password_hash="hash", role="Admin")
    account = Account(
        account_name="Test Account",
        account_type="Cash",
        opening_balance=Decimal("100.00"),
        balance=Decimal("100.00"),
    )
    category = Category(category_name="Food", category_type="Expense")
    session.add_all([member, account, category])
    session.flush()
    return member, account, category


def test_negative_amount_rejected_before_database():
    with pytest.raises(ValidationError):
        ExpenseCreate(member_id=1, account_id=1, category_id=1, amount=Decimal("-1"), transaction_date=date.today())


def test_insufficient_expense_rolls_back(session):
    member, account, category = create_setup(session)
    session.commit()
    account_id = account.account_id
    data = ExpenseCreate(
        member_id=member.member_id,
        account_id=account.account_id,
        category_id=category.category_id,
        amount=Decimal("101.00"),
        transaction_date=date(2026, 11, 1),
    )
    with pytest.raises(ServiceError):
        execute(session, lambda: create_expense(session, data))
    refreshed_account = session.get(Account, account_id)
    assert refreshed_account is not None
    assert refreshed_account.balance == Decimal("100.00")
    assert session.exec(select(Expense)).all() == []


def test_invalid_category_type_rejected(session):
    member, account, _ = create_setup(session)
    income_category = Category(category_name="Salary", category_type="Income")
    session.add(income_category)
    session.flush()
    data = ExpenseCreate(
        member_id=member.member_id,
        account_id=account.account_id,
        category_id=income_category.category_id,
        amount=Decimal("10.00"),
        transaction_date=date(2026, 11, 1),
    )
    with pytest.raises(ServiceError):
        execute(session, lambda: create_expense(session, data))

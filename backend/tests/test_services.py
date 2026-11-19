from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlmodel import select

from src.models.schemas import (
    AccountCreate,
    BillCreate,
    BillPaymentCreate,
    BudgetCreate,
    CategoryCreate,
    ExpenseCreate,
    IncomeCreate,
    IncomeSourceCreate,
    MemberCreate,
    SavingsContributionCreate,
    SavingsGoalCreate,
)
from src.models.tables import Account, Bill, Category, Expense
from src.services import setup, transactions
from src.services.errors import ConflictError
from src.services.unit_of_work import execute


def create_member(session):
    return execute(
        session,
        lambda: setup.create_member(
            session,
            MemberCreate(
                full_name="Service Member",
                email="service@example.com",
                password="password",
                role="Admin",
            ),
        ),
    )


def create_account(session, member_id: int, opening_balance: Decimal = Decimal("1000.00")):
    return execute(
        session,
        lambda: setup.create_account(
            session,
            AccountCreate(
                account_name="Service Account",
                account_type="Bank",
                owner_member_id=member_id,
                opening_balance=opening_balance,
            ),
        ),
    )


def create_expense_category(session, name: str = "Food"):
    return execute(
        session,
        lambda: setup.create_category(
            session, CategoryCreate(category_name=name, category_type="Expense")
        ),
    )


def test_t18_service_transactions_reconcile_account(session):
    member = create_member(session)
    account = create_account(session, member.member_id)
    expense_category = create_expense_category(session)
    income_category = execute(
        session,
        lambda: setup.create_category(
            session, CategoryCreate(category_name="Salary", category_type="Income")
        ),
    )
    source = execute(
        session,
        lambda: setup.create_income_source(session, IncomeSourceCreate(source_name="Employer")),
    )
    bill = execute(
        session,
        lambda: setup.create_bill(
            session,
            BillCreate(
                bill_name="Electricity",
                amount_due=Decimal("100.00"),
                due_date=date(2026, 9, 15),
                recurrence="Monthly",
                category_id=expense_category.category_id,
            ),
        ),
    )
    goal = execute(
        session,
        lambda: setup.create_savings_goal(
            session,
            SavingsGoalCreate(
                goal_name="Emergency Fund",
                target_amount=Decimal("1000.00"),
                created_by_member_id=member.member_id,
            ),
        ),
    )

    execute(
        session,
        lambda: transactions.create_income(
            session,
            IncomeCreate(
                member_id=member.member_id,
                account_id=account.account_id,
                category_id=income_category.category_id,
                income_source_id=source.income_source_id,
                amount=Decimal("100.00"),
                transaction_date=date(2026, 9, 1),
            ),
        ),
    )
    execute(
        session,
        lambda: transactions.create_expense(
            session,
            ExpenseCreate(
                member_id=member.member_id,
                account_id=account.account_id,
                category_id=expense_category.category_id,
                amount=Decimal("50.00"),
                transaction_date=date(2026, 9, 2),
            ),
        ),
    )
    execute(
        session,
        lambda: transactions.create_bill_payment(
            session,
            BillPaymentCreate(
                member_id=member.member_id,
                account_id=account.account_id,
                bill_id=bill.bill_id,
                category_id=expense_category.category_id,
                amount=Decimal("100.00"),
                transaction_date=date(2026, 9, 15),
                period_month=date(2026, 9, 1),
            ),
        ),
    )
    execute(
        session,
        lambda: transactions.create_savings_contribution(
            session,
            SavingsContributionCreate(
                goal_id=goal.goal_id,
                member_id=member.member_id,
                account_id=account.account_id,
                amount=Decimal("25.00"),
                contribution_date=date(2026, 9, 20),
            ),
        ),
    )

    row = session.execute(
        text("SELECT is_reconciled FROM v_account_reconciliation WHERE account_id = :account_id"),
        {"account_id": account.account_id},
    ).scalar_one()
    assert row is True


def test_t19_expense_budget_warning_at_eighty_and_over_budget(session):
    member = create_member(session)
    account = create_account(session, member.member_id)
    category = create_expense_category(session)
    execute(
        session,
        lambda: setup.create_budget(
            session,
                BudgetCreate(
                category_id=category.category_id,
                budget_month=date(2026, 9, 1),
                limit_amount=Decimal("100.00"),
            ),
        ),
    )

    result = execute(
        session,
        lambda: transactions.create_expense(
            session,
            ExpenseCreate(
                member_id=member.member_id,
                account_id=account.account_id,
                category_id=category.category_id,
                amount=Decimal("80.00"),
                transaction_date=date(2026, 9, 1),
            ),
        ),
    )
    assert result[1:] == (True, False)

    result = execute(
        session,
        lambda: transactions.create_expense(
            session,
            ExpenseCreate(
                member_id=member.member_id,
                account_id=account.account_id,
                category_id=category.category_id,
                amount=Decimal("21.00"),
                transaction_date=date(2026, 9, 2),
            ),
        ),
    )
    assert result[1:] == (True, True)


def test_t20_duplicate_bill_payment_rolls_back_expense_and_balance(session):
    member = create_member(session)
    account = create_account(session, member.member_id)
    category = create_expense_category(session)
    bill = execute(
        session,
        lambda: setup.create_bill(
            session,
            BillCreate(
                bill_name="Rent",
                amount_due=Decimal("100.00"),
                due_date=date(2026, 9, 1),
                recurrence="Monthly",
                category_id=category.category_id,
            ),
        ),
    )
    payment = BillPaymentCreate(
        member_id=member.member_id,
        account_id=account.account_id,
        bill_id=bill.bill_id,
        category_id=category.category_id,
        amount=Decimal("100.00"),
        transaction_date=date(2026, 9, 1),
        period_month=date(2026, 9, 1),
    )
    execute(session, lambda: transactions.create_bill_payment(session, payment))

    with pytest.raises(ConflictError):
        execute(session, lambda: transactions.create_bill_payment(session, payment))

    balance = session.exec(
        select(Account.balance).where(Account.account_id == account.account_id)
    ).one()
    expense_count = session.exec(select(Expense)).all()
    assert balance == Decimal("900.00")
    assert len(expense_count) == 1

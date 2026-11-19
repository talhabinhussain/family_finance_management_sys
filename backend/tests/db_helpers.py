from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlmodel import Session


def make_member(
    session: Session,
    *,
    full_name: str = "Test Member",
    email: str = "test@example.com",
    password_hash: str = "hash",
    role: str = "Admin",
    date_of_birth: date | None = None,
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO member (full_name, email, password_hash, role, date_of_birth)
            VALUES (:full_name, :email, :password_hash, :role, :date_of_birth)
            RETURNING member_id
            """
        ),
        {
            "full_name": full_name,
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "date_of_birth": date_of_birth,
        },
    ).scalar_one()


def make_account(
    session: Session,
    *,
    account_name: str = "Test Account",
    account_type: str = "Bank",
    owner_member_id: int | None = None,
    opening_balance: Decimal = Decimal("0"),
    balance: Decimal = Decimal("1000"),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO account (account_name, account_type, owner_member_id, opening_balance, balance)
            VALUES (:account_name, :account_type, :owner_member_id, :opening_balance, :balance)
            RETURNING account_id
            """
        ),
        {
            "account_name": account_name,
            "account_type": account_type,
            "owner_member_id": owner_member_id,
            "opening_balance": opening_balance,
            "balance": balance,
        },
    ).scalar_one()


def make_category(
    session: Session,
    *,
    category_name: str = "Food",
    category_type: str = "Expense",
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO category (category_name, category_type)
            VALUES (:category_name, :category_type)
            RETURNING category_id
            """
        ),
        {"category_name": category_name, "category_type": category_type},
    ).scalar_one()


def make_income_source(session: Session, *, source_name: str = "Employer") -> int:
    return session.execute(
        text(
            """
            INSERT INTO income_source (source_name)
            VALUES (:source_name)
            RETURNING income_source_id
            """
        ),
        {"source_name": source_name},
    ).scalar_one()


def make_bill(
    session: Session,
    *,
    bill_name: str = "Electricity",
    amount_due: Decimal = Decimal("100"),
    due_date: date = date(2026, 9, 15),
    recurrence: str = "Monthly",
    category_id: int,
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO bill (bill_name, amount_due, due_date, recurrence, category_id)
            VALUES (:bill_name, :amount_due, :due_date, :recurrence, :category_id)
            RETURNING bill_id
            """
        ),
        {
            "bill_name": bill_name,
            "amount_due": amount_due,
            "due_date": due_date,
            "recurrence": recurrence,
            "category_id": category_id,
        },
    ).scalar_one()


def make_savings_goal(
    session: Session,
    *,
    goal_name: str = "Emergency Fund",
    target_amount: Decimal = Decimal("1000"),
    created_by_member_id: int,
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO savings_goal (goal_name, target_amount, created_by_member_id)
            VALUES (:goal_name, :target_amount, :created_by_member_id)
            RETURNING goal_id
            """
        ),
        {
            "goal_name": goal_name,
            "target_amount": target_amount,
            "created_by_member_id": created_by_member_id,
        },
    ).scalar_one()


def make_budget(
    session: Session,
    *,
    category_id: int,
    budget_month: date = date(2026, 9, 1),
    limit_amount: Decimal = Decimal("500"),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO budget (category_id, budget_month, limit_amount)
            VALUES (:category_id, :budget_month, :limit_amount)
            RETURNING budget_id
            """
        ),
        {
            "category_id": category_id,
            "budget_month": budget_month,
            "limit_amount": limit_amount,
        },
    ).scalar_one()


def make_income(
    session: Session,
    *,
    member_id: int,
    account_id: int,
    category_id: int,
    income_source_id: int,
    amount: Decimal = Decimal("100"),
    transaction_date: date = date(2026, 9, 1),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO income (
                member_id, account_id, category_id, income_source_id, amount, transaction_date
            )
            VALUES (
                :member_id, :account_id, :category_id, :income_source_id, :amount, :transaction_date
            )
            RETURNING income_id
            """
        ),
        {
            "member_id": member_id,
            "account_id": account_id,
            "category_id": category_id,
            "income_source_id": income_source_id,
            "amount": amount,
            "transaction_date": transaction_date,
        },
    ).scalar_one()


def make_expense(
    session: Session,
    *,
    member_id: int,
    account_id: int,
    category_id: int,
    amount: Decimal = Decimal("50"),
    transaction_date: date = date(2026, 9, 10),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO expense (member_id, account_id, category_id, amount, transaction_date)
            VALUES (:member_id, :account_id, :category_id, :amount, :transaction_date)
            RETURNING expense_id
            """
        ),
        {
            "member_id": member_id,
            "account_id": account_id,
            "category_id": category_id,
            "amount": amount,
            "transaction_date": transaction_date,
        },
    ).scalar_one()


def make_bill_payment(
    session: Session,
    *,
    bill_id: int,
    expense_id: int,
    period_month: date = date(2026, 9, 1),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO bill_payment (bill_id, expense_id, period_month)
            VALUES (:bill_id, :expense_id, :period_month)
            RETURNING bill_payment_id
            """
        ),
        {
            "bill_id": bill_id,
            "expense_id": expense_id,
            "period_month": period_month,
        },
    ).scalar_one()


def make_savings_contribution(
    session: Session,
    *,
    goal_id: int,
    member_id: int,
    account_id: int,
    amount: Decimal = Decimal("25"),
    contribution_date: date = date(2026, 9, 20),
) -> int:
    return session.execute(
        text(
            """
            INSERT INTO savings_contribution (
                goal_id, member_id, account_id, amount, contribution_date
            )
            VALUES (
                :goal_id, :member_id, :account_id, :amount, :contribution_date
            )
            RETURNING contribution_id
            """
        ),
        {
            "goal_id": goal_id,
            "member_id": member_id,
            "account_id": account_id,
            "amount": amount,
            "contribution_date": contribution_date,
        },
    ).scalar_one()

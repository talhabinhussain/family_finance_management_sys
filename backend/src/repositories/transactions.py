from decimal import Decimal

from sqlalchemy import text
from sqlmodel import Session

from src.models.tables import Account, Category, Expense


def account_exists(session: Session, account_id: int) -> bool:
    return session.get(Account, account_id) is not None


def category(session: Session, category_id: int) -> Category | None:
    return session.get(Category, category_id)


def update_balance(session: Session, account_id: int, amount: Decimal, increase: bool) -> bool:
    if increase:
        statement = text("UPDATE account SET balance = balance + :amount WHERE account_id = :account_id")
        parameters = {"amount": amount, "account_id": account_id}
    else:
        statement = text(
            "UPDATE account SET balance = balance - :amount "
            "WHERE account_id = :account_id AND balance >= :amount"
        )
        parameters = {"amount": amount, "account_id": account_id}
    result = session.execute(statement, parameters)
    return result.rowcount == 1


def monthly_expense_total(session: Session, category_id: int, month) -> Decimal:
    result = session.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) FROM expense "
            "WHERE category_id = :category_id "
            "AND transaction_date >= :month "
            "AND transaction_date < (:month + INTERVAL '1 month')"
        ),
        {"category_id": category_id, "month": month},
    )
    return result.scalar_one()


def budget_limit(session: Session, category_id: int, month) -> Decimal | None:
    result = session.execute(
        text("SELECT limit_amount FROM budget WHERE category_id = :category_id AND budget_month = :month"),
        {"category_id": category_id, "month": month},
    )
    return result.scalar_one_or_none()

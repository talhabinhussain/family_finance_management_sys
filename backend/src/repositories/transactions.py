from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlmodel import Session, select

from src.models.tables import Account, BillPayment, Category, Expense, Income, SavingsContribution


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


def is_bill_period_scheduled(session: Session, bill_id: int, period_month: date) -> bool:
    result = session.execute(
        text(
            "SELECT 1 FROM v_bill_schedule "
            "WHERE bill_id = :bill_id AND period_month = :period_month LIMIT 1"
        ),
        {"bill_id": bill_id, "period_month": period_month},
    )
    return result.scalar_one_or_none() is not None


def get_income(session: Session, income_id: int) -> Income | None:
    return session.get(Income, income_id)


def list_income(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[Income]:
    query = select(Income)
    if member_id is not None:
        query = query.where(Income.member_id == member_id)
    if category_id is not None:
        query = query.where(Income.category_id == category_id)
    if from_date is not None:
        query = query.where(Income.transaction_date >= from_date)
    if to_date is not None:
        query = query.where(Income.transaction_date <= to_date)
    query = query.order_by(Income.transaction_date.desc(), Income.income_id.desc())
    return list(session.exec(query).all())


def get_expense(session: Session, expense_id: int) -> Expense | None:
    return session.get(Expense, expense_id)


def list_expenses(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[Expense]:
    query = select(Expense)
    if member_id is not None:
        query = query.where(Expense.member_id == member_id)
    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    if from_date is not None:
        query = query.where(Expense.transaction_date >= from_date)
    if to_date is not None:
        query = query.where(Expense.transaction_date <= to_date)
    query = query.order_by(Expense.transaction_date.desc(), Expense.expense_id.desc())
    return list(session.exec(query).all())


def get_bill_payment(session: Session, payment_id: int) -> BillPayment | None:
    return session.get(BillPayment, payment_id)


def list_bill_payments(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[BillPayment]:
    query = select(BillPayment)
    if member_id is not None or category_id is not None or from_date is not None or to_date is not None:
        query = query.join(Expense, BillPayment.expense_id == Expense.expense_id)
        if member_id is not None:
            query = query.where(Expense.member_id == member_id)
        if category_id is not None:
            query = query.where(Expense.category_id == category_id)
        if from_date is not None:
            query = query.where(Expense.transaction_date >= from_date)
        if to_date is not None:
            query = query.where(Expense.transaction_date <= to_date)
    query = query.order_by(BillPayment.bill_payment_id.desc())
    return list(session.exec(query).all())


def get_savings_contribution(session: Session, contribution_id: int) -> SavingsContribution | None:
    return session.get(SavingsContribution, contribution_id)


def list_savings_contributions(
    session: Session,
    member_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[SavingsContribution]:
    query = select(SavingsContribution)
    if member_id is not None:
        query = query.where(SavingsContribution.member_id == member_id)
    if from_date is not None:
        query = query.where(SavingsContribution.contribution_date >= from_date)
    if to_date is not None:
        query = query.where(SavingsContribution.contribution_date <= to_date)
    query = query.order_by(SavingsContribution.contribution_date.desc(), SavingsContribution.contribution_id.desc())
    return list(session.exec(query).all())


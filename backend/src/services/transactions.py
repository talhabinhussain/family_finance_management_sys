from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.models.schemas import BillPaymentCreate, ExpenseCreate, IncomeCreate, SavingsContributionCreate
from src.models.tables import Bill, BillPayment, Category, Expense, Income, SavingsContribution, SavingsGoal
from src.repositories.transactions import (
    budget_limit, category, get_bill_payment, get_expense, get_income, get_savings_contribution,
    list_bill_payments, list_expenses, list_income, list_savings_contributions,
    monthly_expense_total, update_balance,
)
from src.services.errors import ConflictError, NotFoundError, ServiceError, ValidationError


def _member_and_account(session: Session, member_id: int, account_id: int):
    from src.models.tables import Account, Member

    if not session.get(Member, member_id):
        raise NotFoundError("Member not found")
    if not session.get(Account, account_id):
        raise NotFoundError("Account not found")


def create_income(session: Session, data: IncomeCreate) -> Income:
    _member_and_account(session, data.member_id, data.account_id)
    cat = category(session, data.category_id)
    if not cat:
        raise NotFoundError("Category not found")
    if cat.category_type != "Income":
        raise ServiceError("Income requires an Income category")
    income = Income.model_validate(data)
    session.add(income)
    if not update_balance(session, data.account_id, data.amount, True):
        raise ServiceError("Account balance could not be updated")
    try:
        session.flush()
        session.refresh(income)
        return income
    except IntegrityError as exc:
        raise ConflictError("Income could not be recorded") from exc


def _expense(session: Session, member_id: int, account_id: int, category_id: int, amount, transaction_date: date, description):
    _member_and_account(session, member_id, account_id)
    cat = category(session, category_id)
    if not cat:
        raise NotFoundError("Category not found")
    if cat.category_type != "Expense":
        raise ServiceError("Expense requires an Expense category")
    expense = Expense(
        member_id=member_id, account_id=account_id, category_id=category_id,
        amount=amount, transaction_date=transaction_date, description=description,
    )
    session.add(expense)
    if not update_balance(session, account_id, amount, False):
        raise ServiceError("Insufficient account balance")
    session.flush()
    session.refresh(expense)
    limit = budget_limit(session, category_id, transaction_date.replace(day=1))
    total = monthly_expense_total(session, category_id, transaction_date.replace(day=1))
    return expense, bool(limit is not None and limit > 0 and total >= limit * 80 / 100), bool(limit is not None and total > limit)


def create_expense(session: Session, data: ExpenseCreate):
    return _expense(session, data.member_id, data.account_id, data.category_id, data.amount, data.transaction_date, data.description)


def create_bill_payment(session: Session, data: BillPaymentCreate):
    if data.period_month.day != 1:
        raise ServiceError("period_month must be the first day of a month")
    bill = session.get(Bill, data.bill_id)
    if not bill:
        raise NotFoundError("Bill not found")
    if data.category_id != bill.category_id:
        raise ServiceError("Bill payment category must match the bill category")
    expense, warning, over = _expense(session, data.member_id, data.account_id, data.category_id, data.amount, data.transaction_date, data.description)
    payment = BillPayment(bill_id=data.bill_id, expense_id=expense.expense_id, period_month=data.period_month)
    session.add(payment)
    try:
        session.flush()
        return payment, warning, over
    except IntegrityError as exc:
        raise ConflictError("This bill has already been paid for that month") from exc


def create_savings_contribution(session: Session, data: SavingsContributionCreate):
    _member_and_account(session, data.member_id, data.account_id)
    if not session.get(SavingsGoal, data.goal_id):
        raise NotFoundError("Savings goal not found")
    contribution = SavingsContribution.model_validate(data)
    session.add(contribution)
    if not update_balance(session, data.account_id, data.amount, False):
        raise ServiceError("Insufficient account balance")
    session.flush()
    session.refresh(contribution)
    return contribution


def _validate_date_range(from_date: date | None, to_date: date | None):
    if from_date is not None and to_date is not None and from_date > to_date:
        raise ValidationError("from date must be before or equal to to date")


def get_income_by_id(session: Session, income_id: int) -> Income:
    inc = get_income(session, income_id)
    if not inc:
        raise NotFoundError("Income record not found")
    return inc


def list_all_income(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[Income]:
    _validate_date_range(from_date, to_date)
    return list_income(session, member_id, category_id, from_date, to_date)


def get_expense_by_id(session: Session, expense_id: int) -> Expense:
    exp = get_expense(session, expense_id)
    if not exp:
        raise NotFoundError("Expense record not found")
    return exp


def list_all_expenses(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[Expense]:
    _validate_date_range(from_date, to_date)
    return list_expenses(session, member_id, category_id, from_date, to_date)


def get_bill_payment_by_id(session: Session, payment_id: int) -> BillPayment:
    pmt = get_bill_payment(session, payment_id)
    if not pmt:
        raise NotFoundError("Bill payment record not found")
    return pmt


def list_all_bill_payments(
    session: Session,
    member_id: int | None = None,
    category_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[BillPayment]:
    _validate_date_range(from_date, to_date)
    return list_bill_payments(session, member_id, category_id, from_date, to_date)


def get_savings_contribution_by_id(session: Session, contribution_id: int) -> SavingsContribution:
    sc = get_savings_contribution(session, contribution_id)
    if not sc:
        raise NotFoundError("Savings contribution record not found")
    return sc


def list_all_savings_contributions(
    session: Session,
    member_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[SavingsContribution]:
    _validate_date_range(from_date, to_date)
    return list_savings_contributions(session, member_id, from_date, to_date)


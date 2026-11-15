from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.models.schemas import BillPaymentCreate, ExpenseCreate, IncomeCreate, SavingsContributionCreate
from src.models.tables import Bill, BillPayment, Category, Expense, Income, SavingsContribution, SavingsGoal
from src.repositories.transactions import budget_limit, category, monthly_expense_total, update_balance
from src.services.errors import ConflictError, NotFoundError, ServiceError


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

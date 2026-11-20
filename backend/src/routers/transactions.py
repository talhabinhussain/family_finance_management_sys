from datetime import date

from fastapi import APIRouter, Depends, Path, Query, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import (
    BillPaymentCreate, BillPaymentRead,
    ExpenseCreate, ExpenseRead, ExpenseResult,
    IncomeCreate, IncomeRead,
    SavingsContributionCreate, SavingsContributionRead,
)
from src.routers.common import service_error
from src.services import transactions
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _write(session: Session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


# Income
@router.post("/income", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(data: IncomeCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: transactions.create_income(session, data))


@router.get("/income", response_model=list[IncomeRead])
def list_income(
    member_id: int | None = Query(default=None, gt=0),
    category_id: int | None = Query(default=None, gt=0),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    try:
        return transactions.list_all_income(session, member_id, category_id, from_date, to_date)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/income/{income_id}", response_model=IncomeRead)
def get_income(income_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return transactions.get_income_by_id(session, income_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


# Expense
@router.post("/expense", response_model=ExpenseResult, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, session: Session = Depends(get_session)):
    expense, warning, over = _write(session, lambda: transactions.create_expense(session, data))
    return ExpenseResult(expense_id=expense.expense_id, budget_warning=warning, over_budget=over)


@router.get("/expense", response_model=list[ExpenseRead])
def list_expenses(
    member_id: int | None = Query(default=None, gt=0),
    category_id: int | None = Query(default=None, gt=0),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    try:
        return transactions.list_all_expenses(session, member_id, category_id, from_date, to_date)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/expense/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return transactions.get_expense_by_id(session, expense_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


# Bill Payment
@router.post("/bill-payment", response_model=ExpenseResult, status_code=status.HTTP_201_CREATED)
def create_bill_payment(data: BillPaymentCreate, session: Session = Depends(get_session)):
    payment, warning, over = _write(session, lambda: transactions.create_bill_payment(session, data))
    return ExpenseResult(expense_id=payment.expense_id, budget_warning=warning, over_budget=over)


@router.get("/bill-payments", response_model=list[BillPaymentRead])
def list_bill_payments(
    member_id: int | None = Query(default=None, gt=0),
    category_id: int | None = Query(default=None, gt=0),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    try:
        return transactions.list_all_bill_payments(session, member_id, category_id, from_date, to_date)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/bill-payments/{payment_id}", response_model=BillPaymentRead)
def get_bill_payment(payment_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return transactions.get_bill_payment_by_id(session, payment_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


# Savings Contribution
@router.post("/savings-contribution", response_model=SavingsContributionRead, status_code=status.HTTP_201_CREATED)
def create_savings_contribution(data: SavingsContributionCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: transactions.create_savings_contribution(session, data))


@router.get("/savings-contributions", response_model=list[SavingsContributionRead])
def list_savings_contributions(
    member_id: int | None = Query(default=None, gt=0),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    session: Session = Depends(get_session),
):
    try:
        return transactions.list_all_savings_contributions(session, member_id, from_date, to_date)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/savings-contributions/{contribution_id}", response_model=SavingsContributionRead)
def get_savings_contribution(contribution_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return transactions.get_savings_contribution_by_id(session, contribution_id)
    except ServiceError as exc:
        raise service_error(exc) from exc

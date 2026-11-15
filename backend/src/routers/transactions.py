from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import (
    BillPaymentCreate, ExpenseCreate, ExpenseResult, IncomeCreate, SavingsContributionCreate,
)
from src.routers.common import service_error
from src.services import transactions
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _write(session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.post("/income", status_code=status.HTTP_201_CREATED)
def create_income(data: IncomeCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: transactions.create_income(session, data))


@router.post("/expense", response_model=ExpenseResult, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, session: Session = Depends(get_session)):
    expense, warning, over = _write(session, lambda: transactions.create_expense(session, data))
    return ExpenseResult(expense_id=expense.expense_id, budget_warning=warning, over_budget=over)


@router.post("/bill-payment", response_model=ExpenseResult, status_code=status.HTTP_201_CREATED)
def create_bill_payment(data: BillPaymentCreate, session: Session = Depends(get_session)):
    payment, warning, over = _write(session, lambda: transactions.create_bill_payment(session, data))
    return ExpenseResult(expense_id=payment.expense_id, budget_warning=warning, over_budget=over)


@router.post("/savings-contribution", status_code=status.HTTP_201_CREATED)
def create_savings_contribution(data: SavingsContributionCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: transactions.create_savings_contribution(session, data))

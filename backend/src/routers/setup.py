from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import (
    BillCreate, BillRead, BudgetCreate, BudgetRead, IncomeSourceCreate, IncomeSourceRead,
    SavingsGoalCreate, SavingsGoalRead,
)
from src.models.tables import Bill, Budget, IncomeSource, SavingsGoal
from src.repositories.crud import list_all
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(tags=["setup"])


def _write(session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.post("/income-sources", response_model=IncomeSourceRead, status_code=status.HTTP_201_CREATED)
def create_income_source(data: IncomeSourceCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_income_source(session, data))


@router.get("/income-sources", response_model=list[IncomeSourceRead])
def list_income_sources(session: Session = Depends(get_session)):
    return list_all(session, IncomeSource)


@router.post("/budgets", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(data: BudgetCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_budget(session, data))


@router.get("/budgets", response_model=list[BudgetRead])
def list_budgets(session: Session = Depends(get_session)):
    return list_all(session, Budget)


@router.post("/bills", response_model=BillRead, status_code=status.HTTP_201_CREATED)
def create_bill(data: BillCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_bill(session, data))


@router.get("/bills", response_model=list[BillRead])
def list_bills(session: Session = Depends(get_session)):
    return list_all(session, Bill)


@router.post("/savings-goals", response_model=SavingsGoalRead, status_code=status.HTTP_201_CREATED)
def create_savings_goal(data: SavingsGoalCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_savings_goal(session, data))


@router.get("/savings-goals", response_model=list[SavingsGoalRead])
def list_savings_goals(session: Session = Depends(get_session)):
    return list_all(session, SavingsGoal)

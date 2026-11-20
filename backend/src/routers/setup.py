from fastapi import APIRouter, Depends, Path, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import (
    BillCreate, BillRead, BillUpdate,
    BudgetCreate, BudgetRead, BudgetUpdate,
    IncomeSourceCreate, IncomeSourceRead, IncomeSourceUpdate,
    SavingsGoalCreate, SavingsGoalRead, SavingsGoalUpdate,
)
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(tags=["setup"])


def _write(session: Session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


# Income Sources
@router.post("/income-sources", response_model=IncomeSourceRead, status_code=status.HTTP_201_CREATED)
def create_income_source(data: IncomeSourceCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_income_source(session, data))


@router.get("/income-sources", response_model=list[IncomeSourceRead])
def list_income_sources(session: Session = Depends(get_session)):
    return setup.list_income_sources(session)


@router.get("/income-sources/{source_id}", response_model=IncomeSourceRead)
def get_income_source(source_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return setup.get_income_source(session, source_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/income-sources/{source_id}", response_model=IncomeSourceRead)
def update_income_source(
    data: IncomeSourceUpdate,
    source_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_income_source(session, source_id, data))


@router.delete("/income-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_source(source_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    _write(session, lambda: setup.delete_income_source(session, source_id))


# Budgets
@router.post("/budgets", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(data: BudgetCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_budget(session, data))


@router.get("/budgets", response_model=list[BudgetRead])
def list_budgets(session: Session = Depends(get_session)):
    return setup.list_budgets(session)


@router.get("/budgets/{budget_id}", response_model=BudgetRead)
def get_budget(budget_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return setup.get_budget(session, budget_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/budgets/{budget_id}", response_model=BudgetRead)
def update_budget(
    data: BudgetUpdate,
    budget_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_budget(session, budget_id, data))


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    _write(session, lambda: setup.delete_budget(session, budget_id))


# Bills
@router.post("/bills", response_model=BillRead, status_code=status.HTTP_201_CREATED)
def create_bill(data: BillCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_bill(session, data))


@router.get("/bills", response_model=list[BillRead])
def list_bills(session: Session = Depends(get_session)):
    return setup.list_bills(session)


@router.get("/bills/{bill_id}", response_model=BillRead)
def get_bill(bill_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return setup.get_bill(session, bill_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/bills/{bill_id}", response_model=BillRead)
def update_bill(
    data: BillUpdate,
    bill_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_bill(session, bill_id, data))


# Savings Goals
@router.post("/savings-goals", response_model=SavingsGoalRead, status_code=status.HTTP_201_CREATED)
def create_savings_goal(data: SavingsGoalCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_savings_goal(session, data))


@router.get("/savings-goals", response_model=list[SavingsGoalRead])
def list_savings_goals(session: Session = Depends(get_session)):
    return setup.list_savings_goals(session)


@router.get("/savings-goals/{goal_id}", response_model=SavingsGoalRead)
def get_savings_goal(goal_id: int = Path(..., gt=0), session: Session = Depends(get_session)):
    try:
        return setup.get_savings_goal(session, goal_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/savings-goals/{goal_id}", response_model=SavingsGoalRead)
def update_savings_goal(
    data: SavingsGoalUpdate,
    goal_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_savings_goal(session, goal_id, data))

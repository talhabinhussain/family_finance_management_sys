from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import (
    AccountBalanceRow, BillDueRow, BudgetVsActualRow, CategorySpendingRow,
    MemberSpendingRow, MonthlyIncomeExpenseRow, SavingsProgressRow,
)
from src.routers.common import service_error
from src.services import reports
from src.services.errors import ServiceError

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/budget-vs-actual", response_model=list[BudgetVsActualRow])
def budget_vs_actual(
    start_month: date | None = None,
    end_month: date | None = None,
    session: Session = Depends(get_session),
):
    try:
        return reports.get_budget_vs_actual(session, start_month, end_month)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/member-spending", response_model=list[MemberSpendingRow])
def member_spending(
    member_id: int | None = Query(default=None, gt=0),
    start_month: date | None = None,
    end_month: date | None = None,
    min_total: Decimal | None = Query(default=None, ge=0),
    session: Session = Depends(get_session),
):
    try:
        return reports.get_member_spending(session, member_id, start_month, end_month, min_total)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/category-spending", response_model=list[CategorySpendingRow])
def category_spending(
    start_month: date | None = None,
    end_month: date | None = None,
    session: Session = Depends(get_session),
):
    try:
        return reports.get_category_spending(session, start_month, end_month)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/overdue-bills", response_model=list[BillDueRow])
def overdue_bills(
    as_of: date | None = None,
    session: Session = Depends(get_session),
):
    try:
        return reports.get_overdue_bills(session, as_of)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/upcoming-bills", response_model=list[BillDueRow])
def upcoming_bills(
    as_of: date | None = None,
    days_ahead: int | None = Query(default=30, ge=0),
    session: Session = Depends(get_session),
):
    try:
        return reports.get_upcoming_bills(session, as_of, days_ahead)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/savings-progress", response_model=list[SavingsProgressRow])
def savings_progress(session: Session = Depends(get_session)):
    try:
        return reports.get_savings_progress(session)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/monthly-income-vs-expense", response_model=list[MonthlyIncomeExpenseRow])
def monthly_income_vs_expense(
    start_month: date | None = None,
    end_month: date | None = None,
    session: Session = Depends(get_session),
):
    try:
        return reports.get_monthly_income_vs_expense(session, start_month, end_month)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.get("/account-balances", response_model=list[AccountBalanceRow])
def account_balances(session: Session = Depends(get_session)):
    try:
        return reports.get_account_balances(session)
    except ServiceError as exc:
        raise service_error(exc) from exc

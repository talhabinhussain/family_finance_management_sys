from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from src.database.db import get_session
from src.repositories.reports import run_report

router = APIRouter(prefix="/reports", tags=["reports"])


def _params(start_month: date | None, end_month: date | None, member_id: int | None):
    return {"start_month": start_month, "end_month": end_month, "member_id": member_id}


@router.get("/budget-vs-actual")
def budget_vs_actual(start_month: date | None = None, end_month: date | None = None, session: Session = Depends(get_session)):
    return run_report(session, "budget_vs_actual", _params(start_month, end_month, None))


@router.get("/member-spending")
def member_spending(member_id: int | None = None, start_month: date | None = None, end_month: date | None = None, session: Session = Depends(get_session)):
    return run_report(session, "member_spending", _params(start_month, end_month, member_id))


@router.get("/overdue-bills")
def overdue_bills(as_of: date | None = None, session: Session = Depends(get_session)):
    return run_report(session, "overdue_bills", {"as_of": as_of or date.today()})


@router.get("/savings-progress")
def savings_progress(session: Session = Depends(get_session)):
    return run_report(session, "savings_progress", {})


@router.get("/monthly-income-vs-expense")
def monthly_income_vs_expense(start_month: date | None = None, end_month: date | None = None, session: Session = Depends(get_session)):
    return run_report(session, "monthly_income_vs_expense", _params(start_month, end_month, None))


@router.get("/account-balances")
def account_balances(session: Session = Depends(get_session)):
    return run_report(session, "account_balances", {})

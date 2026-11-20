from datetime import date
from decimal import Decimal

from sqlmodel import Session

from src.repositories.reports import run_report
from src.services.errors import ValidationError


def _validate_month_range(start_month: date | None, end_month: date | None):
    if start_month is not None and end_month is not None and start_month > end_month:
        raise ValidationError("start_month must be before or equal to end_month")


def get_budget_vs_actual(session: Session, start_month: date | None = None, end_month: date | None = None) -> list[dict]:
    _validate_month_range(start_month, end_month)
    return run_report(session, "budget_vs_actual", {"start_month": start_month, "end_month": end_month})


def get_member_spending(
    session: Session,
    member_id: int | None = None,
    start_month: date | None = None,
    end_month: date | None = None,
    min_total: Decimal | None = None,
) -> list[dict]:
    _validate_month_range(start_month, end_month)
    if min_total is not None and min_total < 0:
        raise ValidationError("min_total must be non-negative")
    return run_report(
        session,
        "member_spending",
        {
            "member_id": member_id,
            "start_month": start_month,
            "end_month": end_month,
            "min_total": min_total,
        },
    )


def get_category_spending(
    session: Session,
    start_month: date | None = None,
    end_month: date | None = None,
) -> list[dict]:
    _validate_month_range(start_month, end_month)
    return run_report(session, "category_spending", {"start_month": start_month, "end_month": end_month})


def get_overdue_bills(session: Session, as_of: date | None = None) -> list[dict]:
    return run_report(session, "overdue_bills", {"as_of": as_of or date.today()})


def get_upcoming_bills(session: Session, as_of: date | None = None, days_ahead: int | None = 30) -> list[dict]:
    if days_ahead is not None and days_ahead < 0:
        raise ValidationError("days_ahead must be non-negative")
    return run_report(
        session,
        "upcoming_bills",
        {"as_of": as_of or date.today(), "days_ahead": days_ahead if days_ahead is not None else 30},
    )


def get_savings_progress(session: Session) -> list[dict]:
    return run_report(session, "savings_progress", {})


def get_monthly_income_vs_expense(
    session: Session,
    start_month: date | None = None,
    end_month: date | None = None,
) -> list[dict]:
    _validate_month_range(start_month, end_month)
    return run_report(session, "monthly_income_vs_expense", {"start_month": start_month, "end_month": end_month})


def get_account_balances(session: Session) -> list[dict]:
    return run_report(session, "account_balances", {})

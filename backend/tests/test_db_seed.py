import os
from datetime import date

from sqlalchemy import text
from sqlmodel import Session

from src.database.migrate import run
from src.database.db import engine
from src.repositories.reports import run_report


def test_t21_seeded_database_is_reconciled_and_complete():
    test_url = os.environ["TEST_DATABASE_URL"]
    run(reset=True, seed=True, url=test_url)

    with Session(engine) as session:
        counts = {
            table: session.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()
            for table in (
                "member", "account", "category", "income_source", "income", "expense",
                "budget", "bill", "bill_payment", "savings_goal", "savings_contribution",
            )
        }
        assert counts == {
            "member": 4,
            "account": 3,
            "category": 8,
            "income_source": 3,
            "income": 3,
            "expense": 6,
            "budget": 3,
            "bill": 3,
            "bill_payment": 3,
            "savings_goal": 2,
            "savings_contribution": 3,
        }

        assert session.execute(
            text("SELECT count(*) FROM v_account_reconciliation WHERE NOT is_reconciled")
        ).scalar_one() == 0

        overdue = run_report(session, "overdue_bills", {"as_of": date.today()})
        upcoming = run_report(session, "upcoming_bills", {"as_of": date.today(), "days_ahead": None})
        budgets = run_report(session, "budget_vs_actual", {"start_month": None, "end_month": None})

        assert overdue
        assert upcoming
        assert sum(row["status"] == "Near limit" for row in budgets) == 1
        assert sum(row["status"] == "Over budget" for row in budgets) == 1

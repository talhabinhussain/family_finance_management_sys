import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

_original_database_url = os.getenv("DATABASE_URL")
_test_database_url = os.getenv("TEST_DATABASE_URL")

if not _test_database_url:
    pytest.skip("TEST_DATABASE_URL is required for PostgreSQL tests", allow_module_level=True)

if _original_database_url and _original_database_url == _test_database_url:
    pytest.exit("TEST_DATABASE_URL must not equal DATABASE_URL")

os.environ["DATABASE_URL"] = _test_database_url


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    os.environ["ALLOW_DB_RESET"] = "true"
    from src.database.migrate import run

    run(reset=True, url=_test_database_url)
    yield


@pytest.fixture(autouse=True)
def clean_db(migrated_database):
    from sqlalchemy import text
    from src.database.db import engine

    with engine.connect() as connection:
        connection.execute(
            text(
                """
                TRUNCATE member, account, category, income_source, bill, savings_goal,
                         budget, income, expense, bill_payment, savings_contribution
                RESTART IDENTITY CASCADE
                """
            )
        )
        connection.commit()
    yield


@pytest.fixture
def session(migrated_database):
    from sqlmodel import Session
    from src.database.db import engine

    session = Session(engine)
    try:
        yield session
    finally:
        session.close()

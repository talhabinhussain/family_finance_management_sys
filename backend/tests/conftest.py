import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def migrated_database():
    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL is required for PostgreSQL tests")
    from src.database.migrate import run

    run(reset=True)
    yield


@pytest.fixture
def session():
    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL is required for PostgreSQL tests")
    from sqlmodel import Session
    from src.database.db import engine

    with Session(engine) as session:
        yield session
        session.rollback()

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv()

DATABASE_URL = os.getenv("TEST_DB") or os.getenv("TEST_DB_URL") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("TEST_DB, TEST_DB_URL, or DATABASE_URL must be set in the environment or .env file")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


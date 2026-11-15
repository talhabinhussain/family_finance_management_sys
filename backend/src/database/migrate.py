import argparse
import os
from datetime import UTC, datetime
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "sql" / "schema"


def database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
        url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL must be set in the environment or .env file")
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def run(reset: bool = False) -> None:
    with psycopg.connect(database_url()) as connection:
        with connection.cursor() as cursor:
            if reset:
                cursor.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    filename TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            cursor.execute("SELECT filename FROM schema_migrations")
            applied = {row[0] for row in cursor.fetchall()}
            for path in sorted(SCHEMA_DIR.glob("*.sql")):
                if path.name in applied:
                    continue
                cursor.execute(path.read_text(encoding="utf-8"))
                cursor.execute(
                    "INSERT INTO schema_migrations (filename, applied_at) VALUES (%s, %s)",
                    (path.name, datetime.now(UTC)),
                )
    print("Schema is up to date.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the development schema first")
    run(parser.parse_args().reset)

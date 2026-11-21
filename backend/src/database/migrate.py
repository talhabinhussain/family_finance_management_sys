import argparse
import os
from datetime import UTC, datetime
from pathlib import Path

import psycopg


ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "sql" / "schema"
SEED_PATH = ROOT / "sql" / "seed" / "seed.sql"


def database_url() -> str:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
    url = os.getenv("TEST_DB") or os.getenv("TEST_DB_URL") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("TEST_DB, TEST_DB_URL, or DATABASE_URL must be set in the environment or .env file")
    return url.replace("postgresql+psycopg://", "postgresql://", 1)


def run(reset: bool = False, seed: bool = False, url: str | None = None) -> None:
    if reset and os.getenv("ALLOW_DB_RESET") != "true":
        raise RuntimeError(
            "Reset is disabled. Set ALLOW_DB_RESET=true to drop the schema."
        )

    if not SCHEMA_DIR.is_dir():
        raise FileNotFoundError(f"Schema directory not found: {SCHEMA_DIR.resolve()}")

    schema_files = sorted(SCHEMA_DIR.glob("*.sql"))
    if not schema_files:
        raise FileNotFoundError(f"No schema SQL files found in: {SCHEMA_DIR.resolve()}")

    target_url = (url or database_url()).replace("postgresql+psycopg://", "postgresql://", 1)

    with psycopg.connect(target_url) as connection:
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
            for path in schema_files:
                if path.name in applied:
                    continue
                cursor.execute(path.read_text(encoding="utf-8"))
                cursor.execute(
                    "INSERT INTO schema_migrations (filename, applied_at) VALUES (%s, %s)",
                    (path.name, datetime.now(UTC)),
                )

            if seed:
                cursor.execute("SELECT count(*) FROM member")
                member_count = cursor.fetchone()[0]
                if member_count == 0:
                    cursor.execute(SEED_PATH.read_text(encoding="utf-8"))
                else:
                    print("Seed skipped: database already has data.")

    print("Schema is up to date.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the development schema first")
    parser.add_argument("--seed", action="store_true", help="Load seed data if the database is empty")
    parser.add_argument("--url", type=str, default=None, help="Explicit database URL to migrate")
    args = parser.parse_args()
    run(reset=args.reset, seed=args.seed, url=args.url)

from pathlib import Path

from sqlalchemy import text
from sqlmodel import Session

REPORT_DIR = Path(__file__).resolve().parents[2] / "sql" / "reports"


def run_report(session: Session, name: str, params: dict) -> list[dict]:
    path = REPORT_DIR / f"{name}.sql"
    if not path.is_file():
        raise FileNotFoundError(f"Report SQL not found: {path}")
    query = path.read_text(encoding="utf-8")
    return [dict(row) for row in session.execute(text(query), params).mappings().all()]

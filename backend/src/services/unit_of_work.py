from collections.abc import Callable

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.services.errors import ConflictError


def execute(session: Session, operation: Callable):
    try:
        result = operation()
        session.commit()
        return result
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("The operation conflicts with an existing record or database constraint") from exc
    except Exception:
        session.rollback()
        raise

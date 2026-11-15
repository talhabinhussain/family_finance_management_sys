from typing import TypeVar

from sqlmodel import Session, SQLModel, select

ModelT = TypeVar("ModelT", bound=SQLModel)


def create(session: Session, item: ModelT) -> ModelT:
    session.add(item)
    session.flush()
    session.refresh(item)
    return item


def list_all(session: Session, model: type[ModelT]) -> list[ModelT]:
    return list(session.exec(select(model)).all())

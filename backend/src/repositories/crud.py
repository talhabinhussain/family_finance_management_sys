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


def get_by_id(session: Session, model: type[ModelT], item_id: int) -> ModelT | None:
    return session.get(model, item_id)


def update(session: Session, item: ModelT, values: dict) -> ModelT:
    for key, value in values.items():
        setattr(item, key, value)
    session.add(item)
    session.flush()
    session.refresh(item)
    return item


def delete(session: Session, item: ModelT) -> None:
    session.delete(item)
    session.flush()


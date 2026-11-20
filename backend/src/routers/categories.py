from fastapi import APIRouter, Depends, Path, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/categories", tags=["categories"])


def _write(session: Session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_category(session, data))


@router.get("", response_model=list[CategoryRead])
def list_categories(session: Session = Depends(get_session)):
    return setup.list_categories(session)


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(
    category_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    try:
        return setup.get_category(session, category_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    data: CategoryUpdate,
    category_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_category(session, category_id, data))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    _write(session, lambda: setup.delete_category(session, category_id))

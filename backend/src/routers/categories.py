from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import CategoryCreate, CategoryRead
from src.models.tables import Category
from src.repositories.crud import list_all
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, session: Session = Depends(get_session)):
    try:
        return execute(session, lambda: setup.create_category(session, data))
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.get("", response_model=list[CategoryRead])
def list_categories(session: Session = Depends(get_session)):
    return list_all(session, Category)

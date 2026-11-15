from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import AccountCreate, AccountRead
from src.models.tables import Account
from src.repositories.crud import list_all
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, session: Session = Depends(get_session)):
    try:
        return execute(session, lambda: setup.create_account(session, data))
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.get("", response_model=list[AccountRead])
def list_accounts(session: Session = Depends(get_session)):
    return setup.list_model(session, Account)

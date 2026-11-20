from fastapi import APIRouter, Depends, Path, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import AccountCreate, AccountRead, AccountUpdate
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _write(session: Session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_account(session, data))


@router.get("", response_model=list[AccountRead])
def list_accounts(session: Session = Depends(get_session)):
    return setup.list_accounts(session)


@router.get("/{account_id}", response_model=AccountRead)
def get_account(
    account_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    try:
        return setup.get_account(session, account_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/{account_id}", response_model=AccountRead)
def update_account(
    data: AccountUpdate,
    account_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_account(session, account_id, data))


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    _write(session, lambda: setup.delete_account(session, account_id))

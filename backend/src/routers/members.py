from fastapi import APIRouter, Depends, Path, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import MemberCreate, MemberRead, MemberUpdate
from src.routers.common import service_error
from src.services import setup
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/members", tags=["members"])


def _write(session: Session, operation):
    try:
        return execute(session, operation)
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.post("", response_model=MemberRead, status_code=status.HTTP_201_CREATED)
def create_member(data: MemberCreate, session: Session = Depends(get_session)):
    return _write(session, lambda: setup.create_member(session, data))


@router.get("", response_model=list[MemberRead])
def list_members(session: Session = Depends(get_session)):
    return setup.list_members(session)


@router.get("/{member_id}", response_model=MemberRead)
def get_member(
    member_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    try:
        return setup.get_member(session, member_id)
    except ServiceError as exc:
        raise service_error(exc) from exc


@router.patch("/{member_id}", response_model=MemberRead)
def update_member(
    data: MemberUpdate,
    member_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    return _write(session, lambda: setup.update_member(session, member_id, data))

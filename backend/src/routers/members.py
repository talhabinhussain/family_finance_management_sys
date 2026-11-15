from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from src.database.db import get_session
from src.models.schemas import MemberCreate, MemberRead
from src.models.tables import Member
from src.repositories.crud import list_all
from src.services import setup
from src.routers.common import service_error
from src.services.errors import ServiceError
from src.services.unit_of_work import execute

router = APIRouter(prefix="/members", tags=["members"])


@router.post("", response_model=MemberRead, status_code=status.HTTP_201_CREATED)
def create_member(data: MemberCreate, session: Session = Depends(get_session)):
    try:
        return execute(session, lambda: setup.create_member(session, data))
    except ServiceError as exc:
        session.rollback()
        raise service_error(exc) from exc


@router.get("", response_model=list[MemberRead])
def list_members(session: Session = Depends(get_session)):
    return list_all(session, Member)

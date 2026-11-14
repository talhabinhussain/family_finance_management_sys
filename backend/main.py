from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, status
from sqlmodel import Session

from database.db import create_db_and_tables, get_session
from schemas.tables_schema import Family, FamilyCreate


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def get_health():
    return {"status": "Server is Running"}


@app.post("/family", response_model=Family, status_code=status.HTTP_201_CREATED)
def create_family(family_data: FamilyCreate, session: Session = Depends(get_session)):
    family = Family.model_validate(family_data)
    session.add(family)
    session.commit()
    session.refresh(family)
    return family



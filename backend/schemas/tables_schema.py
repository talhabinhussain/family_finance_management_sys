from typing import Optional
from sqlmodel import Field, SQLModel


class FamilyBase(SQLModel):
    family_member: int
    earning_members: int
    family_expenses: int
    family_budget: int


class Family(FamilyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class FamilyCreate(FamilyBase):
    pass



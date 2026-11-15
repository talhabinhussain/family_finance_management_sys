from datetime import date
from decimal import Decimal

from pydantic import ConfigDict, Field as PydanticField, SecretStr
from sqlmodel import SQLModel

from src.models.tables import AccountType, CategoryType, MemberRole, Recurrence


class MemberCreate(SQLModel):
    full_name: str
    email: str
    password: SecretStr
    role: MemberRole
    date_of_birth: date | None = None


class MemberRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    member_id: int
    full_name: str
    email: str
    role: str
    date_of_birth: date | None
    is_active: bool


class AccountCreate(SQLModel):
    account_name: str
    account_type: AccountType
    owner_member_id: int | None = None
    balance: Decimal = PydanticField(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)


class AccountRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    account_id: int
    account_name: str
    account_type: str
    owner_member_id: int | None
    balance: Decimal


class CategoryCreate(SQLModel):
    category_name: str
    category_type: CategoryType


class CategoryRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    category_name: str
    category_type: str


class IncomeSourceCreate(SQLModel):
    source_name: str


class IncomeSourceRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    income_source_id: int
    source_name: str


class BudgetCreate(SQLModel):
    category_id: int
    budget_month: date
    limit_amount: Decimal = PydanticField(ge=0, max_digits=12, decimal_places=2)


class BudgetRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    budget_id: int
    category_id: int
    budget_month: date
    limit_amount: Decimal


class BillCreate(SQLModel):
    bill_name: str
    amount_due: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    due_date: date
    recurrence: Recurrence
    category_id: int


class BillRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    bill_id: int
    bill_name: str
    amount_due: Decimal
    due_date: date
    recurrence: str
    category_id: int
    is_active: bool


class SavingsGoalCreate(SQLModel):
    goal_name: str
    target_amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    created_by_member_id: int


class SavingsGoalRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    goal_id: int
    goal_name: str
    target_amount: Decimal
    target_date: date | None
    created_by_member_id: int
    is_active: bool


class IncomeCreate(SQLModel):
    member_id: int
    account_id: int
    category_id: int
    income_source_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    description: str | None = None


class ExpenseCreate(SQLModel):
    member_id: int
    account_id: int
    category_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    description: str | None = None


class BillPaymentCreate(SQLModel):
    member_id: int
    account_id: int
    bill_id: int
    category_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    period_month: date
    description: str | None = None


class SavingsContributionCreate(SQLModel):
    goal_id: int
    member_id: int
    account_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    contribution_date: date
    description: str | None = None


class ExpenseResult(SQLModel):
    expense_id: int
    budget_warning: bool
    over_budget: bool


class ReportRow(SQLModel):
    model_config = ConfigDict(extra="allow")

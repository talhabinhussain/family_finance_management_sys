from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    ConfigDict,
    Field as PydanticField,
    SecretStr,
    StringConstraints,
    field_validator,
    model_validator,
)
from sqlmodel import SQLModel

from src.models.tables import AccountType, CategoryType, MemberRole, Recurrence


Name100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Name50 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=1,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+$",
    ),
]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class PatchBase(SQLModel):
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_at_least_one_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided in PATCH body")
        return self


class MemberCreate(SQLModel):
    full_name: Name100
    email: Email
    password: SecretStr
    role: MemberRole
    date_of_birth: date | None = None

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return value


class MemberRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    member_id: int
    full_name: str
    email: str
    role: str
    date_of_birth: date | None
    is_active: bool


class MemberUpdate(PatchBase):
    full_name: Name100 | None = None
    email: Email | None = None
    role: MemberRole | None = None
    date_of_birth: date | None = None
    is_active: bool | None = None

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_not_in_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return value


class AccountCreate(SQLModel):
    account_name: Name100
    account_type: AccountType
    owner_member_id: int | None = None
    opening_balance: Decimal = PydanticField(
        default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2
    )


class AccountRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    account_id: int
    account_name: str
    account_type: str
    owner_member_id: int | None
    opening_balance: Decimal
    balance: Decimal


class AccountUpdate(PatchBase):
    account_name: Name100 | None = None
    account_type: AccountType | None = None
    owner_member_id: int | None = None


class CategoryCreate(SQLModel):
    category_name: Name50
    category_type: CategoryType


class CategoryRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    category_name: str
    category_type: str


class CategoryUpdate(PatchBase):
    category_name: Name50 | None = None


class IncomeSourceCreate(SQLModel):
    source_name: Name50


class IncomeSourceRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    income_source_id: int
    source_name: str


class IncomeSourceUpdate(PatchBase):
    source_name: Name50 | None = None


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


class BudgetUpdate(PatchBase):
    limit_amount: Decimal | None = PydanticField(default=None, ge=0, max_digits=12, decimal_places=2)


class BillCreate(SQLModel):
    bill_name: Name100
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


class BillUpdate(PatchBase):
    bill_name: Name100 | None = None
    amount_due: Decimal | None = PydanticField(default=None, gt=0, max_digits=12, decimal_places=2)
    due_date: date | None = None
    recurrence: Recurrence | None = None
    is_active: bool | None = None


class SavingsGoalCreate(SQLModel):
    goal_name: Name100
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


class SavingsGoalUpdate(PatchBase):
    goal_name: Name100 | None = None
    target_amount: Decimal | None = PydanticField(default=None, gt=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    is_active: bool | None = None


class IncomeCreate(SQLModel):
    member_id: int
    account_id: int
    category_id: int
    income_source_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    description: Description | None = None


class ExpenseCreate(SQLModel):
    member_id: int
    account_id: int
    category_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    description: Description | None = None


class BillPaymentCreate(SQLModel):
    member_id: int
    account_id: int
    bill_id: int
    category_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    transaction_date: date
    period_month: date
    description: Description | None = None


class SavingsContributionCreate(SQLModel):
    goal_id: int
    member_id: int
    account_id: int
    amount: Decimal = PydanticField(gt=0, max_digits=12, decimal_places=2)
    contribution_date: date
    description: Description | None = None


class IncomeRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    income_id: int
    member_id: int
    account_id: int
    category_id: int
    income_source_id: int
    amount: Decimal
    transaction_date: date
    description: str | None
    created_at: datetime


class ExpenseRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    expense_id: int
    member_id: int
    account_id: int
    category_id: int
    amount: Decimal
    transaction_date: date
    description: str | None
    created_at: datetime


class BillPaymentRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    bill_payment_id: int
    bill_id: int
    expense_id: int
    period_month: date
    paid_at: datetime


class SavingsContributionRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    contribution_id: int
    goal_id: int
    member_id: int
    account_id: int
    amount: Decimal
    contribution_date: date
    description: str | None
    created_at: datetime


class ExpenseResult(SQLModel):
    expense_id: int
    budget_warning: bool
    over_budget: bool


class BudgetVsActualRow(SQLModel):
    budget_id: int
    category_id: int
    category_name: str
    budget_month: date
    limit_amount: Decimal
    actual_amount: Decimal
    remaining_amount: Decimal
    percent_used: Decimal | None
    status: Literal["OK", "Near limit", "Over budget"]


class MemberSpendingRow(SQLModel):
    member_id: int
    full_name: str
    total_spending: Decimal
    expense_count: int


class CategorySpendingRow(SQLModel):
    category_id: int
    category_name: str
    total_spending: Decimal
    expense_count: int


class MonthlyIncomeExpenseRow(SQLModel):
    month: date
    total_income: Decimal
    total_expense: Decimal
    total_savings: Decimal
    net_amount: Decimal


class BillDueRow(SQLModel):
    bill_id: int
    bill_name: str
    amount_due: Decimal
    recurrence: str
    category_id: int
    due_date: date
    period_month: date
    days_overdue: int | None
    days_until_due: int | None


class SavingsProgressRow(SQLModel):
    goal_id: int
    goal_name: str
    target_amount: Decimal
    contributed_amount: Decimal
    remaining_amount: Decimal
    completion_percent: Decimal


class AccountBalanceRow(SQLModel):
    account_id: int
    account_name: str
    account_type: str
    owner_member_id: int | None
    opening_balance: Decimal
    stored_balance: Decimal
    computed_balance: Decimal
    difference: Decimal
    is_reconciled: bool

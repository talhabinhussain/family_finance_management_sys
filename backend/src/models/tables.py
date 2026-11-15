from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlmodel import Field, SQLModel


class MemberRole(StrEnum):
    ADMIN = "Admin"
    EARNING_MEMBER = "Earning Member"
    DEPENDENT = "Dependent"


class CategoryType(StrEnum):
    INCOME = "Income"
    EXPENSE = "Expense"


class AccountType(StrEnum):
    CASH = "Cash"
    BANK = "Bank"
    MOBILE_WALLET = "Mobile Wallet"


class Recurrence(StrEnum):
    ONE_TIME = "One-time"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    YEARLY = "Yearly"


class Member(SQLModel, table=True):
    __tablename__ = "member"
    member_id: int | None = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: str
    date_of_birth: date | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Account(SQLModel, table=True):
    __tablename__ = "account"
    account_id: int | None = Field(default=None, primary_key=True)
    account_name: str
    account_type: str
    owner_member_id: int | None = Field(default=None, foreign_key="member.member_id")
    balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Category(SQLModel, table=True):
    __tablename__ = "category"
    category_id: int | None = Field(default=None, primary_key=True)
    category_name: str
    category_type: str


class IncomeSource(SQLModel, table=True):
    __tablename__ = "income_source"
    income_source_id: int | None = Field(default=None, primary_key=True)
    source_name: str = Field(unique=True)


class Bill(SQLModel, table=True):
    __tablename__ = "bill"
    bill_id: int | None = Field(default=None, primary_key=True)
    bill_name: str
    amount_due: Decimal = Field(max_digits=12, decimal_places=2)
    due_date: date
    recurrence: str
    category_id: int = Field(foreign_key="category.category_id")
    is_active: bool = True


class SavingsGoal(SQLModel, table=True):
    __tablename__ = "savings_goal"
    goal_id: int | None = Field(default=None, primary_key=True)
    goal_name: str
    target_amount: Decimal = Field(max_digits=12, decimal_places=2)
    target_date: date | None = None
    created_by_member_id: int = Field(foreign_key="member.member_id")
    is_active: bool = True


class Budget(SQLModel, table=True):
    __tablename__ = "budget"
    budget_id: int | None = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="category.category_id")
    budget_month: date
    limit_amount: Decimal = Field(max_digits=12, decimal_places=2)


class Income(SQLModel, table=True):
    __tablename__ = "income"
    income_id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="member.member_id")
    account_id: int = Field(foreign_key="account.account_id")
    category_id: int = Field(foreign_key="category.category_id")
    income_source_id: int = Field(foreign_key="income_source.income_source_id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    transaction_date: date
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Expense(SQLModel, table=True):
    __tablename__ = "expense"
    expense_id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="member.member_id")
    account_id: int = Field(foreign_key="account.account_id")
    category_id: int = Field(foreign_key="category.category_id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    transaction_date: date
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class BillPayment(SQLModel, table=True):
    __tablename__ = "bill_payment"
    bill_payment_id: int | None = Field(default=None, primary_key=True)
    bill_id: int = Field(foreign_key="bill.bill_id")
    expense_id: int = Field(foreign_key="expense.expense_id", unique=True)
    period_month: date
    paid_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SavingsContribution(SQLModel, table=True):
    __tablename__ = "savings_contribution"
    contribution_id: int | None = Field(default=None, primary_key=True)
    goal_id: int = Field(foreign_key="savings_goal.goal_id")
    member_id: int = Field(foreign_key="member.member_id")
    account_id: int = Field(foreign_key="account.account_id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    contribution_date: date
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

from argon2 import PasswordHasher
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.models.schemas import (
    AccountCreate, BillCreate, BudgetCreate, CategoryCreate, IncomeSourceCreate,
    MemberCreate, SavingsGoalCreate,
)
from src.models.tables import Account, Bill, Budget, Category, IncomeSource, Member, SavingsGoal
from src.repositories.crud import create, list_all
from src.services.errors import ConflictError, NotFoundError, ServiceError

password_hasher = PasswordHasher()


def _create(session: Session, item):
    try:
        return create(session, item)
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("The record conflicts with an existing record or database constraint") from exc


def create_member(session: Session, data: MemberCreate) -> Member:
    member = Member(
        full_name=data.full_name,
        email=data.email,
        password_hash=password_hasher.hash(data.password.get_secret_value()),
        role=data.role.value,
        date_of_birth=data.date_of_birth,
    )
    return _create(session, member)


def create_account(session: Session, data: AccountCreate) -> Account:
    account = Account(
        account_name=data.account_name,
        account_type=data.account_type.value,
        owner_member_id=data.owner_member_id,
        opening_balance=data.opening_balance,
        balance=data.opening_balance,
    )
    return _create(session, account)


def create_category(session: Session, data: CategoryCreate) -> Category:
    return _create(session, Category.model_validate(data))


def create_income_source(session: Session, data: IncomeSourceCreate) -> IncomeSource:
    return _create(session, IncomeSource.model_validate(data))


def create_budget(session: Session, data: BudgetCreate) -> Budget:
    if data.budget_month.day != 1:
        raise ServiceError("budget_month must be the first day of a month")
    category = session.get(Category, data.category_id)
    if not category:
        raise NotFoundError("Category not found")
    if category.category_type != "Expense":
        raise ServiceError("Budgets require an Expense category")
    return _create(session, Budget.model_validate(data))


def create_bill(session: Session, data: BillCreate) -> Bill:
    category = session.get(Category, data.category_id)
    if not category:
        raise NotFoundError("Category not found")
    if category.category_type != "Expense":
        raise ServiceError("Bills require an Expense category")
    return _create(session, Bill.model_validate(data))


def create_savings_goal(session: Session, data: SavingsGoalCreate) -> SavingsGoal:
    if not session.get(Member, data.created_by_member_id):
        raise NotFoundError("Member not found")
    return _create(session, SavingsGoal.model_validate(data))


def list_model(session: Session, model):
    return list_all(session, model)

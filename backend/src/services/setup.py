from argon2 import PasswordHasher
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from src.models.schemas import (
    AccountCreate, AccountUpdate, BillCreate, BillUpdate, BudgetCreate, BudgetUpdate,
    CategoryCreate, CategoryUpdate, IncomeSourceCreate, IncomeSourceUpdate,
    MemberCreate, MemberUpdate, SavingsGoalCreate, SavingsGoalUpdate,
)
from src.models.tables import Account, Bill, Budget, Category, IncomeSource, Member, SavingsGoal
from src.repositories.crud import create, delete, get_by_id, list_all, update
from src.services.errors import ConflictError, NotFoundError, ServiceError

password_hasher = PasswordHasher()


def _create(session: Session, item):
    try:
        return create(session, item)
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("The record conflicts with an existing record or database constraint") from exc


def _update(session: Session, item, updates: dict):
    try:
        return update(session, item, updates)
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("The update conflicts with an existing record or database constraint") from exc


def _delete(session: Session, item):
    try:
        delete(session, item)
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("Cannot delete record because dependent records exist") from exc



def create_member(session: Session, data: MemberCreate) -> Member:
    member = Member(
        full_name=data.full_name,
        email=data.email,
        password_hash=password_hasher.hash(data.password.get_secret_value()),
        role=data.role.value,
        date_of_birth=data.date_of_birth,
    )
    return _create(session, member)


def get_member(session: Session, member_id: int) -> Member:
    member = get_by_id(session, Member, member_id)
    if not member:
        raise NotFoundError("Member not found")
    return member


def list_members(session: Session) -> list[Member]:
    return list_all(session, Member)


def update_member(session: Session, member_id: int, data: MemberUpdate) -> Member:
    member = get_member(session, member_id)
    values = data.model_dump(exclude_unset=True)
    if "role" in values and hasattr(values["role"], "value"):
        values["role"] = values["role"].value
    return _update(session, member, values)


def create_account(session: Session, data: AccountCreate) -> Account:
    if data.owner_member_id is not None and not get_by_id(session, Member, data.owner_member_id):
        raise NotFoundError("Owner member not found")
    account = Account(
        account_name=data.account_name,
        account_type=data.account_type.value,
        owner_member_id=data.owner_member_id,
        opening_balance=data.opening_balance,
        balance=data.opening_balance,
    )
    return _create(session, account)


def get_account(session: Session, account_id: int) -> Account:
    account = get_by_id(session, Account, account_id)
    if not account:
        raise NotFoundError("Account not found")
    return account


def list_accounts(session: Session) -> list[Account]:
    return list_all(session, Account)


def update_account(session: Session, account_id: int, data: AccountUpdate) -> Account:
    account = get_account(session, account_id)
    values = data.model_dump(exclude_unset=True)
    if "owner_member_id" in values and values["owner_member_id"] is not None:
        if not get_by_id(session, Member, values["owner_member_id"]):
            raise NotFoundError("Owner member not found")
    if "account_type" in values and hasattr(values["account_type"], "value"):
        values["account_type"] = values["account_type"].value
    return _update(session, account, values)


def delete_account(session: Session, account_id: int) -> None:
    account = get_account(session, account_id)
    _delete(session, account)


def create_category(session: Session, data: CategoryCreate) -> Category:
    return _create(session, Category(category_name=data.category_name, category_type=data.category_type.value))


def get_category(session: Session, category_id: int) -> Category:
    cat = get_by_id(session, Category, category_id)
    if not cat:
        raise NotFoundError("Category not found")
    return cat


def list_categories(session: Session) -> list[Category]:
    return list_all(session, Category)


def update_category(session: Session, category_id: int, data: CategoryUpdate) -> Category:
    cat = get_category(session, category_id)
    values = data.model_dump(exclude_unset=True)
    return _update(session, cat, values)


def delete_category(session: Session, category_id: int) -> None:
    cat = get_category(session, category_id)
    _delete(session, cat)


def create_income_source(session: Session, data: IncomeSourceCreate) -> IncomeSource:
    return _create(session, IncomeSource.model_validate(data))


def get_income_source(session: Session, source_id: int) -> IncomeSource:
    source = get_by_id(session, IncomeSource, source_id)
    if not source:
        raise NotFoundError("Income source not found")
    return source


def list_income_sources(session: Session) -> list[IncomeSource]:
    return list_all(session, IncomeSource)


def update_income_source(session: Session, source_id: int, data: IncomeSourceUpdate) -> IncomeSource:
    source = get_income_source(session, source_id)
    values = data.model_dump(exclude_unset=True)
    return _update(session, source, values)


def delete_income_source(session: Session, source_id: int) -> None:
    source = get_income_source(session, source_id)
    _delete(session, source)


def create_budget(session: Session, data: BudgetCreate) -> Budget:
    if data.budget_month.day != 1:
        raise ServiceError("budget_month must be the first day of a month")
    category = session.get(Category, data.category_id)
    if not category:
        raise NotFoundError("Category not found")
    if category.category_type != "Expense":
        raise ServiceError("Budgets require an Expense category")
    return _create(session, Budget.model_validate(data))


def get_budget(session: Session, budget_id: int) -> Budget:
    budget = get_by_id(session, Budget, budget_id)
    if not budget:
        raise NotFoundError("Budget not found")
    return budget


def list_budgets(session: Session) -> list[Budget]:
    return list_all(session, Budget)


def update_budget(session: Session, budget_id: int, data: BudgetUpdate) -> Budget:
    budget = get_budget(session, budget_id)
    values = data.model_dump(exclude_unset=True)
    return _update(session, budget, values)


def delete_budget(session: Session, budget_id: int) -> None:
    budget = get_budget(session, budget_id)
    _delete(session, budget)


def create_bill(session: Session, data: BillCreate) -> Bill:
    category = session.get(Category, data.category_id)
    if not category:
        raise NotFoundError("Category not found")
    if category.category_type != "Expense":
        raise ServiceError("Bills require an Expense category")
    return _create(
        session,
        Bill(
            bill_name=data.bill_name,
            amount_due=data.amount_due,
            due_date=data.due_date,
            recurrence=data.recurrence.value,
            category_id=data.category_id,
        ),
    )


def get_bill(session: Session, bill_id: int) -> Bill:
    bill = get_by_id(session, Bill, bill_id)
    if not bill:
        raise NotFoundError("Bill not found")
    return bill


def list_bills(session: Session) -> list[Bill]:
    return list_all(session, Bill)


def update_bill(session: Session, bill_id: int, data: BillUpdate) -> Bill:
    bill = get_bill(session, bill_id)
    values = data.model_dump(exclude_unset=True)
    if "recurrence" in values and hasattr(values["recurrence"], "value"):
        values["recurrence"] = values["recurrence"].value
    return _update(session, bill, values)


def create_savings_goal(session: Session, data: SavingsGoalCreate) -> SavingsGoal:
    if not session.get(Member, data.created_by_member_id):
        raise NotFoundError("Member not found")
    return _create(session, SavingsGoal.model_validate(data))


def get_savings_goal(session: Session, goal_id: int) -> SavingsGoal:
    goal = get_by_id(session, SavingsGoal, goal_id)
    if not goal:
        raise NotFoundError("Savings goal not found")
    return goal


def list_savings_goals(session: Session) -> list[SavingsGoal]:
    return list_all(session, SavingsGoal)


def update_savings_goal(session: Session, goal_id: int, data: SavingsGoalUpdate) -> SavingsGoal:
    goal = get_savings_goal(session, goal_id)
    values = data.model_dump(exclude_unset=True)
    return _update(session, goal, values)


def list_model(session: Session, model):
    return list_all(session, model)


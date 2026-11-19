-- Rule: income uses an Income category; expense, bill and budget use an Expense category.
CREATE FUNCTION enforce_category_type() RETURNS trigger AS $$
DECLARE
    actual_type TEXT;
BEGIN
    SELECT category_type INTO actual_type FROM category WHERE category_id = NEW.category_id;
    IF actual_type IS DISTINCT FROM TG_ARGV[0] THEN
        RAISE EXCEPTION '% requires a category of type %, got %', TG_TABLE_NAME, TG_ARGV[0], COALESCE(actual_type, 'unknown')
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_income_category_type  BEFORE INSERT OR UPDATE OF category_id ON income
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Income');
CREATE TRIGGER trg_expense_category_type BEFORE INSERT OR UPDATE OF category_id ON expense
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');
CREATE TRIGGER trg_bill_category_type    BEFORE INSERT OR UPDATE OF category_id ON bill
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');
CREATE TRIGGER trg_budget_category_type  BEFORE INSERT OR UPDATE OF category_id ON budget
    FOR EACH ROW EXECUTE FUNCTION enforce_category_type('Expense');

-- Rule: a category can never change type once created.
CREATE FUNCTION forbid_category_type_change() RETURNS trigger AS $$
BEGIN
    IF NEW.category_type IS DISTINCT FROM OLD.category_type THEN
        RAISE EXCEPTION 'category_type of category % cannot be changed', OLD.category_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_type_immutable BEFORE UPDATE OF category_type ON category
    FOR EACH ROW EXECUTE FUNCTION forbid_category_type_change();

-- Rule: a bill payment's expense must use the same category as the bill.
CREATE FUNCTION enforce_bill_payment_category() RETURNS trigger AS $$
DECLARE
    bill_category INTEGER;
    expense_category INTEGER;
BEGIN
    SELECT category_id INTO bill_category FROM bill WHERE bill_id = NEW.bill_id;
    SELECT category_id INTO expense_category FROM expense WHERE expense_id = NEW.expense_id;
    IF bill_category IS DISTINCT FROM expense_category THEN
        RAISE EXCEPTION 'bill payment expense category must match the bill category'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_payment_category BEFORE INSERT OR UPDATE OF bill_id, expense_id ON bill_payment
    FOR EACH ROW EXECUTE FUNCTION enforce_bill_payment_category();

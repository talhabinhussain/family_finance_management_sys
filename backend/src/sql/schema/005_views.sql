CREATE VIEW monthly_income_vs_expense AS
WITH income_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month,
           SUM(amount) AS total_income
    FROM income
    GROUP BY date_trunc('month', transaction_date)::DATE
), expense_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month,
           SUM(amount) AS total_expense
    FROM expense
    GROUP BY date_trunc('month', transaction_date)::DATE
)
SELECT COALESCE(i.month, e.month) AS month,
       COALESCE(i.total_income, 0)::NUMERIC(12, 2) AS total_income,
       COALESCE(e.total_expense, 0)::NUMERIC(12, 2) AS total_expense
FROM income_totals i
FULL OUTER JOIN expense_totals e ON e.month = i.month;

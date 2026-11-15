WITH income_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_income
    FROM income
    WHERE (:start_month IS NULL OR transaction_date >= :start_month)
      AND (:end_month IS NULL OR transaction_date <= :end_month)
    GROUP BY date_trunc('month', transaction_date)::DATE
), expense_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_expense
    FROM expense
    WHERE (:start_month IS NULL OR transaction_date >= :start_month)
      AND (:end_month IS NULL OR transaction_date <= :end_month)
    GROUP BY date_trunc('month', transaction_date)::DATE
)
SELECT COALESCE(i.month, e.month) AS month,
       COALESCE(i.total_income, 0) AS total_income,
       COALESCE(e.total_expense, 0) AS total_expense,
       COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0) AS net_amount
FROM income_totals i
FULL OUTER JOIN expense_totals e ON e.month = i.month
ORDER BY month;

CREATE VIEW v_monthly_income_vs_expense AS
WITH income_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_income
    FROM income GROUP BY date_trunc('month', transaction_date)::DATE
), expense_totals AS (
    SELECT date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS total_expense
    FROM expense GROUP BY date_trunc('month', transaction_date)::DATE
), savings_totals AS (
    SELECT date_trunc('month', contribution_date)::DATE AS month, SUM(amount) AS total_savings
    FROM savings_contribution GROUP BY date_trunc('month', contribution_date)::DATE
), months AS (
    SELECT month FROM income_totals
    UNION SELECT month FROM expense_totals
    UNION SELECT month FROM savings_totals
)
SELECT m.month,
       COALESCE(i.total_income, 0)::NUMERIC(14, 2) AS total_income,
       COALESCE(e.total_expense, 0)::NUMERIC(14, 2) AS total_expense,
       COALESCE(s.total_savings, 0)::NUMERIC(14, 2) AS total_savings,
       (COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0))::NUMERIC(14, 2) AS net_amount
FROM months m
LEFT JOIN income_totals i ON i.month = m.month
LEFT JOIN expense_totals e ON e.month = m.month
LEFT JOIN savings_totals s ON s.month = m.month;

CREATE VIEW v_bill_schedule AS
SELECT b.bill_id, b.bill_name, b.amount_due, b.recurrence, b.category_id,
       d.due_date,
       date_trunc('month', d.due_date)::DATE AS period_month,
       (p.bill_payment_id IS NOT NULL) AS is_paid
FROM bill b
CROSS JOIN LATERAL (
    SELECT (b.due_date + n * CASE b.recurrence
                                WHEN 'Monthly'   THEN INTERVAL '1 month'
                                WHEN 'Quarterly' THEN INTERVAL '3 months'
                                WHEN 'Yearly'    THEN INTERVAL '1 year'
                                ELSE INTERVAL '0' END)::DATE AS due_date
    FROM generate_series(0, CASE b.recurrence WHEN 'One-time' THEN 0 ELSE 1200 END) AS n
) d
LEFT JOIN bill_payment p
       ON p.bill_id = b.bill_id AND p.period_month = date_trunc('month', d.due_date)::DATE
WHERE b.is_active AND d.due_date <= CURRENT_DATE + 366;

CREATE VIEW v_account_reconciliation AS
SELECT a.account_id, a.account_name, a.account_type, a.owner_member_id,
       a.opening_balance,
       a.balance AS stored_balance,
       (a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0))::NUMERIC(14, 2) AS computed_balance,
       (a.balance - (a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0)))::NUMERIC(14, 2) AS difference,
       (a.balance = a.opening_balance + COALESCE(i.total, 0) - COALESCE(e.total, 0) - COALESCE(s.total, 0)) AS is_reconciled
FROM account a
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM income GROUP BY account_id) i ON i.account_id = a.account_id
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM expense GROUP BY account_id) e ON e.account_id = a.account_id
LEFT JOIN (SELECT account_id, SUM(amount) AS total FROM savings_contribution GROUP BY account_id) s ON s.account_id = a.account_id;

WITH monthly_spend AS (
    SELECT category_id, date_trunc('month', transaction_date)::DATE AS month, SUM(amount) AS spent
    FROM expense
    GROUP BY category_id, date_trunc('month', transaction_date)::DATE
)
SELECT b.budget_id, b.category_id, c.category_name, b.budget_month, b.limit_amount,
       COALESCE(s.spent, 0)::NUMERIC(14, 2) AS actual_amount,
       (b.limit_amount - COALESCE(s.spent, 0))::NUMERIC(14, 2) AS remaining_amount,
       ROUND(COALESCE(s.spent, 0) * 100 / NULLIF(b.limit_amount, 0), 2) AS percent_used,
       CASE WHEN COALESCE(s.spent, 0) > b.limit_amount THEN 'Over budget'
            WHEN b.limit_amount > 0 AND COALESCE(s.spent, 0) >= b.limit_amount * 0.8 THEN 'Near limit'
            ELSE 'OK' END AS status
FROM budget b
JOIN category c ON c.category_id = b.category_id
LEFT JOIN monthly_spend s ON s.category_id = b.category_id AND s.month = b.budget_month
WHERE (CAST(:start_month AS date) IS NULL OR b.budget_month >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR b.budget_month <= date_trunc('month', CAST(:end_month AS date))::date)
ORDER BY b.budget_month, c.category_name;

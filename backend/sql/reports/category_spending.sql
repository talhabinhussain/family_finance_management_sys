SELECT c.category_id, c.category_name,
       COALESCE(SUM(e.amount), 0)::NUMERIC(14, 2) AS total_spending,
       COUNT(e.expense_id) AS expense_count
FROM category c
LEFT JOIN expense e ON e.category_id = c.category_id
  AND (CAST(:start_month AS date) IS NULL OR e.transaction_date >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR e.transaction_date < (date_trunc('month', CAST(:end_month AS date)) + INTERVAL '1 month')::date)
WHERE c.category_type = 'Expense'
GROUP BY c.category_id, c.category_name
ORDER BY total_spending DESC, c.category_name;

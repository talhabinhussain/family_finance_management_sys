SELECT b.budget_id, b.category_id, c.category_name, b.budget_month,
       b.limit_amount,
       COALESCE(SUM(e.amount) FILTER (WHERE e.transaction_date >= b.budget_month AND e.transaction_date < b.budget_month + INTERVAL '1 month'), 0) AS actual_amount,
       b.limit_amount - COALESCE(SUM(e.amount) FILTER (WHERE e.transaction_date >= b.budget_month AND e.transaction_date < b.budget_month + INTERVAL '1 month'), 0) AS remaining_amount
FROM budget b
JOIN category c ON c.category_id = b.category_id
LEFT JOIN expense e ON e.category_id = b.category_id
WHERE (:start_month IS NULL OR b.budget_month >= :start_month)
  AND (:end_month IS NULL OR b.budget_month <= :end_month)
GROUP BY b.budget_id, b.category_id, c.category_name, b.budget_month, b.limit_amount
ORDER BY b.budget_month, c.category_name;

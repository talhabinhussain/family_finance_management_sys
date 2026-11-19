SELECT m.member_id, m.full_name,
       COALESCE(SUM(e.amount), 0)::NUMERIC(14, 2) AS total_spending,
       COUNT(e.expense_id) AS expense_count
FROM member m
LEFT JOIN expense e ON e.member_id = m.member_id
  AND (CAST(:start_month AS date) IS NULL OR e.transaction_date >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR e.transaction_date < (date_trunc('month', CAST(:end_month AS date)) + INTERVAL '1 month')::date)
WHERE (CAST(:member_id AS integer) IS NULL OR m.member_id = CAST(:member_id AS integer))
GROUP BY m.member_id, m.full_name
HAVING COALESCE(SUM(e.amount), 0) >= COALESCE(CAST(:min_total AS numeric), 0)
ORDER BY total_spending DESC, m.full_name;

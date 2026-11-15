SELECT m.member_id, m.full_name, COALESCE(SUM(e.amount), 0) AS total_spending
FROM member m
LEFT JOIN expense e ON e.member_id = m.member_id
  AND (:start_month IS NULL OR e.transaction_date >= :start_month)
  AND (:end_month IS NULL OR e.transaction_date <= :end_month)
WHERE (:member_id IS NULL OR m.member_id = :member_id)
GROUP BY m.member_id, m.full_name
ORDER BY total_spending DESC;

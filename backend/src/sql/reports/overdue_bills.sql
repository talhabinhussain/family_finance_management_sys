SELECT b.bill_id, b.bill_name, b.amount_due, b.due_date, b.recurrence, b.category_id
FROM bill b
WHERE b.is_active = TRUE
  AND b.due_date < :as_of
  AND NOT EXISTS (
      SELECT 1 FROM bill_payment p
      WHERE p.bill_id = b.bill_id
        AND p.period_month = date_trunc('month', b.due_date)::DATE
  )
ORDER BY b.due_date;

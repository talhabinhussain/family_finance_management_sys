SELECT bill_id, bill_name, amount_due, recurrence, category_id, due_date, period_month,
       (due_date - CAST(:as_of AS date)) AS days_until_due
FROM v_bill_schedule
WHERE NOT is_paid
  AND due_date >= CAST(:as_of AS date)
  AND due_date <= CAST(:as_of AS date) + COALESCE(CAST(:days_ahead AS integer), 30)
ORDER BY due_date, bill_name;

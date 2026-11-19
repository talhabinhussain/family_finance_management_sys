SELECT bill_id, bill_name, amount_due, recurrence, category_id, due_date, period_month,
       (CAST(:as_of AS date) - due_date) AS days_overdue
FROM v_bill_schedule
WHERE NOT is_paid AND due_date < CAST(:as_of AS date)
ORDER BY due_date, bill_name;

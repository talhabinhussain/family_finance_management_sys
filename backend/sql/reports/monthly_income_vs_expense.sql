SELECT month, total_income, total_expense, total_savings, net_amount
FROM v_monthly_income_vs_expense
WHERE (CAST(:start_month AS date) IS NULL OR month >= date_trunc('month', CAST(:start_month AS date))::date)
  AND (CAST(:end_month AS date) IS NULL OR month <= date_trunc('month', CAST(:end_month AS date))::date)
ORDER BY month;

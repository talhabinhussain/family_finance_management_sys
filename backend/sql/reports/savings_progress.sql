SELECT g.goal_id, g.goal_name, g.target_amount,
       COALESCE(SUM(c.amount), 0) AS contributed_amount,
       GREATEST(g.target_amount - COALESCE(SUM(c.amount), 0), 0) AS remaining_amount,
       CASE WHEN g.target_amount = 0 THEN 0
            ELSE ROUND(COALESCE(SUM(c.amount), 0) * 100 / g.target_amount, 2)
       END AS completion_percent
FROM savings_goal g
LEFT JOIN savings_contribution c ON c.goal_id = g.goal_id
GROUP BY g.goal_id, g.goal_name, g.target_amount
ORDER BY g.goal_id;

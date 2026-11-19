INSERT INTO member (full_name, email, password_hash, role) VALUES
('Ayesha Khan', 'ayesha@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Admin'),
('Bilal Khan', 'bilal@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Earning Member'),
('Sara Khan', 'sara@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Earning Member'),
('Hamza Khan', 'hamza@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Dependent');

INSERT INTO category (category_name, category_type) VALUES
('Salary', 'Income'), ('Freelancing', 'Income'), ('Business', 'Income'),
('Food', 'Expense'), ('Utilities', 'Expense'), ('Transport', 'Expense'),
('Education', 'Expense'), ('Entertainment', 'Expense');

INSERT INTO income_source (source_name) VALUES ('Employer'), ('Client'), ('Family Business');

INSERT INTO account (account_name, account_type, owner_member_id, opening_balance, balance) VALUES
('Household Bank', 'Bank', (SELECT member_id FROM member WHERE email = 'ayesha@example.com'), 500000, 500000),
('Cash Wallet', 'Cash', NULL, 20000, 20000),
('Bilal Mobile Wallet', 'Mobile Wallet', (SELECT member_id FROM member WHERE email = 'bilal@example.com'), 50000, 50000);

INSERT INTO budget (category_id, budget_month, limit_amount) VALUES
((SELECT category_id FROM category WHERE category_name = 'Food' AND category_type = 'Expense'),
 date_trunc('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 30000),
((SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'),
 date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 15000),
((SELECT category_id FROM category WHERE category_name = 'Education' AND category_type = 'Expense'),
 date_trunc('month', CURRENT_DATE)::DATE, 20000);

INSERT INTO bill (bill_name, amount_due, due_date, recurrence, category_id) VALUES
('Electricity', 12000, (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '15 days')::DATE,
 'Monthly', (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense')),
('Internet', 5000, (date_trunc('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '25 days')::DATE,
 'Monthly', (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense')),
('School Fee', 18000, (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '10 days')::DATE,
 'Quarterly', (SELECT category_id FROM category WHERE category_name = 'Education' AND category_type = 'Expense'));

INSERT INTO savings_goal (goal_name, target_amount, target_date, created_by_member_id) VALUES
('Emergency Fund', 200000, (date_trunc('month', CURRENT_DATE) + INTERVAL '7 months')::DATE,
 (SELECT member_id FROM member WHERE email = 'ayesha@example.com')),
('Vacation Fund', 100000, (date_trunc('month', CURRENT_DATE) + INTERVAL '4 months')::DATE,
 (SELECT member_id FROM member WHERE email = 'bilal@example.com'));

INSERT INTO income (member_id, account_id, category_id, income_source_id, amount, transaction_date, description)
VALUES
((SELECT member_id FROM member WHERE email = 'bilal@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Salary' AND category_type = 'Income'),
 (SELECT income_source_id FROM income_source WHERE source_name = 'Employer'), 180000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '1 day')::DATE, 'Salary - month 1'),
((SELECT member_id FROM member WHERE email = 'sara@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Freelancing' AND category_type = 'Income'),
 (SELECT income_source_id FROM income_source WHERE source_name = 'Client'), 45000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '5 days')::DATE, 'Freelance payment - month 2'),
((SELECT member_id FROM member WHERE email = 'bilal@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Business' AND category_type = 'Income'),
 (SELECT income_source_id FROM income_source WHERE source_name = 'Family Business'), 60000,
 LEAST(CURRENT_DATE, (date_trunc('month', CURRENT_DATE) + INTERVAL '3 days')::DATE), 'Business income - month 3');

INSERT INTO expense (member_id, account_id, category_id, amount, transaction_date, description)
VALUES
((SELECT member_id FROM member WHERE email = 'bilal@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Food' AND category_type = 'Expense'), 25000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '10 days')::DATE, 'Groceries'),
((SELECT member_id FROM member WHERE email = 'ayesha@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'), 12000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '15 days')::DATE, 'Electricity payment'),
((SELECT member_id FROM member WHERE email = 'sara@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Transport' AND category_type = 'Expense'), 9000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '8 days')::DATE, 'Commute'),
((SELECT member_id FROM member WHERE email = 'ayesha@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'), 20000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '25 days')::DATE, 'Internet and utilities'),
((SELECT member_id FROM member WHERE email = 'hamza@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Entertainment' AND category_type = 'Expense'), 5000,
 LEAST(CURRENT_DATE, (date_trunc('month', CURRENT_DATE) + INTERVAL '7 days')::DATE), 'Family activity'),
((SELECT member_id FROM member WHERE email = 'sara@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'),
 (SELECT category_id FROM category WHERE category_name = 'Education' AND category_type = 'Expense'), 18000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '10 days')::DATE, 'School fee payment');

INSERT INTO bill_payment (bill_id, expense_id, period_month)
SELECT b.bill_id, e.expense_id, date_trunc('month', CURRENT_DATE - INTERVAL '2 months')::DATE
FROM bill b CROSS JOIN expense e
WHERE b.bill_name = 'Electricity' AND e.description = 'Electricity payment';

INSERT INTO bill_payment (bill_id, expense_id, period_month)
SELECT b.bill_id, e.expense_id, date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE
FROM bill b CROSS JOIN expense e
WHERE b.bill_name = 'Internet' AND e.description = 'Internet and utilities';

INSERT INTO bill_payment (bill_id, expense_id, period_month)
SELECT b.bill_id, e.expense_id, date_trunc('month', CURRENT_DATE - INTERVAL '2 months')::DATE
FROM bill b CROSS JOIN expense e
WHERE b.bill_name = 'School Fee' AND e.description = 'School fee payment';

INSERT INTO savings_contribution (goal_id, member_id, account_id, amount, contribution_date, description)
VALUES
((SELECT goal_id FROM savings_goal WHERE goal_name = 'Emergency Fund'),
 (SELECT member_id FROM member WHERE email = 'bilal@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'), 20000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '20 days')::DATE, 'Monthly contribution'),
((SELECT goal_id FROM savings_goal WHERE goal_name = 'Emergency Fund'),
 (SELECT member_id FROM member WHERE email = 'sara@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'), 10000,
 (date_trunc('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '20 days')::DATE, 'Monthly contribution'),
((SELECT goal_id FROM savings_goal WHERE goal_name = 'Vacation Fund'),
 (SELECT member_id FROM member WHERE email = 'bilal@example.com'),
 (SELECT account_id FROM account WHERE account_name = 'Household Bank'), 15000,
 LEAST(CURRENT_DATE, (date_trunc('month', CURRENT_DATE) + INTERVAL '12 days')::DATE), 'Vacation savings');

UPDATE account a
SET balance = r.computed_balance
FROM v_account_reconciliation r
WHERE r.account_id = a.account_id;

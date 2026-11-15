INSERT INTO member (full_name, email, password_hash, role) VALUES
('Ayesha Khan', 'ayesha@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Admin'),
('Bilal Khan', 'bilal@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Earning Member'),
('Sara Khan', 'sara@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Earning Member'),
('Hamza Khan', 'hamza@example.com', '$argon2id$v=19$m=65536,t=3,p=4$seed$seed', 'Dependent');

INSERT INTO category (category_name, category_type) VALUES
('Salary', 'Income'), ('Freelancing', 'Income'), ('Business', 'Income'), ('Food', 'Expense'),
('Utilities', 'Expense'), ('Transport', 'Expense'), ('Education', 'Expense'), ('Entertainment', 'Expense');

INSERT INTO income_source (source_name) VALUES ('Employer'), ('Client'), ('Family Business');

INSERT INTO account (account_name, account_type, owner_member_id, balance) VALUES
('Household Bank', 'Bank', 1, 250000), ('Cash Wallet', 'Cash', NULL, 15000), ('Bilal Mobile Wallet', 'Mobile Wallet', 2, 25000);

INSERT INTO budget (category_id, budget_month, limit_amount) VALUES
((SELECT category_id FROM category WHERE category_name = 'Food' AND category_type = 'Expense'), '2026-09-01', 30000),
((SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'), '2026-09-01', 20000),
((SELECT category_id FROM category WHERE category_name = 'Transport' AND category_type = 'Expense'), '2026-10-01', 15000);

INSERT INTO bill (bill_name, amount_due, due_date, recurrence, category_id) VALUES
('Electricity', 12000, '2026-09-15', 'Monthly', (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense')),
('Internet', 5000, '2026-10-10', 'Monthly', (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'));

INSERT INTO savings_goal (goal_name, target_amount, target_date, created_by_member_id) VALUES
('Emergency Fund', 200000, '2027-06-01', 1), ('Vacation Fund', 100000, '2027-03-01', 2);

INSERT INTO income (member_id, account_id, category_id, income_source_id, amount, transaction_date, description)
VALUES (2, 1, (SELECT category_id FROM category WHERE category_name = 'Salary' AND category_type = 'Income'), 1, 180000, '2026-09-01', 'September salary'),
       (3, 1, (SELECT category_id FROM category WHERE category_name = 'Freelancing' AND category_type = 'Income'), 2, 45000, '2026-10-05', 'Client payment');

INSERT INTO expense (member_id, account_id, category_id, amount, transaction_date, description)
VALUES (2, 1, (SELECT category_id FROM category WHERE category_name = 'Food' AND category_type = 'Expense'), 25000, '2026-09-10', 'Groceries'),
       (1, 1, (SELECT category_id FROM category WHERE category_name = 'Utilities' AND category_type = 'Expense'), 12000, '2026-09-15', 'Electricity'),
       (3, 1, (SELECT category_id FROM category WHERE category_name = 'Transport' AND category_type = 'Expense'), 9000, '2026-10-08', 'Commute');

INSERT INTO bill_payment (bill_id, expense_id, period_month)
VALUES (1, 2, '2026-09-01');

INSERT INTO savings_contribution (goal_id, member_id, account_id, amount, contribution_date, description)
VALUES (1, 2, 1, 20000, '2026-09-20', 'Monthly contribution'),
       (1, 3, 1, 10000, '2026-10-20', 'Monthly contribution');

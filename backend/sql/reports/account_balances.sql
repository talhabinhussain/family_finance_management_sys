SELECT account_id, account_name, account_type, owner_member_id,
       opening_balance, stored_balance, computed_balance, difference, is_reconciled
FROM v_account_reconciliation
ORDER BY account_id;

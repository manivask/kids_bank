-- Restore guardian read access removed by the banking write-permission
-- migration. RLS continues to scope rows to the signed-in guardian, and pin
-- remains intentionally excluded from every client-visible grant.

grant select (
    id, parent_id, child_name, balance, created_at,
    first_name, last_name, school, email, date_of_birth, avatar,
    checking_balance, savings_balance, savings_goal, allowance,
    parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
) on public.children to authenticated;

grant select (
    id, child_id, amount, type, notes, created_at, account, category, title,
    reverses_transaction_id
) on public.transactions to authenticated;

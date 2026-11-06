-- Create a child and its initial balance ledger entries as one transaction.
-- The guardian owner is derived from the authenticated user's existing link.

create or replace function public.create_kids_bank_child(
    p_first_name text,
    p_last_name text,
    p_school text default null,
    p_email text default null,
    p_date_of_birth date default null,
    p_parent1_first_name text default null,
    p_parent1_last_name text default null,
    p_parent2_first_name text default null,
    p_parent2_last_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_auth_id uuid := auth.uid();
    guardian_user_id uuid;
    new_child_id uuid;
begin
    if current_auth_id is null then
        raise exception 'Sign in before creating a child profile.';
    end if;

    if nullif(trim(p_first_name), '') is null
       or nullif(trim(p_last_name), '') is null then
        raise exception 'Child first and last names are required.';
    end if;

    if nullif(trim(p_parent1_first_name), '') is null
       or nullif(trim(p_parent1_last_name), '') is null then
        raise exception 'Guardian first and last names are required.';
    end if;

    select l.user_id
    into guardian_user_id
    from public.kids_bank_guardian_links l
    where l.auth_user_id = current_auth_id;

    if guardian_user_id is null then
        raise exception 'Link the confirmed guardian account before creating a child profile.';
    end if;

    insert into public.children (
        parent_id, child_name, balance, first_name, last_name, school, email,
        date_of_birth, checking_balance, savings_balance, savings_goal, allowance,
        parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
    )
    values (
        guardian_user_id,
        trim(p_first_name) || ' ' || trim(p_last_name),
        25.00,
        trim(p_first_name),
        trim(p_last_name),
        nullif(trim(p_school), ''),
        nullif(trim(p_email), ''),
        p_date_of_birth,
        25.00,
        50.00,
        '{"title":"First Savings Goal","targetAmount":75,"icon":"🎯"}'::jsonb,
        '{"amount":10,"frequency":"monthly","savingsRatioPercent":30,"lastPaid":null}'::jsonb,
        trim(p_parent1_first_name),
        trim(p_parent1_last_name),
        nullif(trim(p_parent2_first_name), ''),
        nullif(trim(p_parent2_last_name), '')
    )
    returning id into new_child_id;

    insert into public.transactions (child_id, amount, type, notes, account, category, title)
    values
        (new_child_id, 25.00, 'deposit', 'Welcome gift', 'checking', 'bonus', 'Welcome Gift'),
        (new_child_id, 50.00, 'deposit', 'Welcome gift', 'savings', 'bonus', 'Welcome Gift');

    return new_child_id;
end;
$$;

revoke all on function public.create_kids_bank_child(
    text, text, text, text, date, text, text, text, text
) from public, anon;
grant execute on function public.create_kids_bank_child(
    text, text, text, text, date, text, text, text, text
) to authenticated;

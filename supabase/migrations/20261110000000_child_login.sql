-- Child username/PIN access with bcrypt hashes and short-lived, scoped sessions.
-- Child sessions use dedicated RPCs and never grant direct table access.

create extension if not exists pgcrypto with schema extensions;

alter table public.children
    add column if not exists kid_username text,
    add column if not exists kid_pin_hash text;

create unique index if not exists kids_bank_children_kid_username_idx
    on public.children (lower(kid_username))
    where kid_username is not null;

create table if not exists public.kids_bank_child_login_attempts (
    username text primary key,
    failed_attempts integer not null default 0,
    window_started_at timestamptz not null default now(),
    locked_until timestamptz
);

create table if not exists public.kids_bank_child_sessions (
    token_hash text primary key,
    child_id uuid not null references public.children (id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    last_used_at timestamptz not null default now()
);

create index if not exists kids_bank_child_sessions_expiry_idx
    on public.kids_bank_child_sessions (expires_at);

alter table public.kids_bank_child_login_attempts enable row level security;
alter table public.kids_bank_child_sessions enable row level security;
revoke all on public.kids_bank_child_login_attempts, public.kids_bank_child_sessions
    from public, anon, authenticated;

grant select (kid_username) on public.children to authenticated;

create or replace function public.kids_bank_set_child_login(
    p_child_id uuid,
    p_username text,
    p_pin text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_auth_id uuid := auth.uid();
    normalized_username text := lower(trim(coalesce(p_username, '')));
begin
    if current_auth_id is null then
        raise exception 'Sign in as the guardian before setting child login.';
    end if;

    if normalized_username !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
        raise exception 'Username must be 3 to 24 characters: letters, numbers, dot, underscore, or hyphen.';
    end if;

    if p_pin is null or p_pin !~ '^[0-9]{6}$' then
        raise exception 'Child PIN must contain exactly 6 digits.';
    end if;

    update public.children c
    set kid_username = normalized_username,
        kid_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 12))
    where c.id = p_child_id
      and exists (
          select 1 from public.kids_bank_guardian_links l
          where l.auth_user_id = current_auth_id
            and l.user_id = c.parent_id
      );

    if not found then
        raise exception 'Child profile not found or not owned by this guardian.';
    end if;

    delete from public.kids_bank_child_sessions s where s.child_id = p_child_id;
    return normalized_username;
exception
    when unique_violation then
        raise exception 'That username is already in use. Choose another one.';
end;
$$;

create or replace function public.kids_bank_child_sign_in(
    p_username text,
    p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    normalized_username text := lower(trim(coalesce(p_username, '')));
    current_attempts integer;
    window_start timestamptz;
    current_lock timestamptz;
    matched_child_id uuid;
    stored_pin_hash text;
    session_token text;
    session_expiry timestamptz := now() + interval '12 hours';
begin
    if normalized_username = '' or length(normalized_username) > 24
       or p_pin is null or p_pin !~ '^[0-9]{6}$' then
        return jsonb_build_object('ok', false, 'message', 'Username or PIN is incorrect.');
    end if;

    insert into public.kids_bank_child_login_attempts (username)
    values (normalized_username)
    on conflict (username) do nothing;

    select a.failed_attempts, a.window_started_at, a.locked_until
    into current_attempts, window_start, current_lock
    from public.kids_bank_child_login_attempts a
    where a.username = normalized_username
    for update;

    if current_lock is not null and current_lock > now() then
        return jsonb_build_object('ok', false, 'message', 'Too many attempts. Try again in 15 minutes.');
    end if;

    if window_start < now() - interval '15 minutes' then
        current_attempts := 0;
        update public.kids_bank_child_login_attempts
        set failed_attempts = 0, window_started_at = now(), locked_until = null
        where username = normalized_username;
    end if;

    select c.id, c.kid_pin_hash
    into matched_child_id, stored_pin_hash
    from public.children c
    where lower(c.kid_username) = normalized_username
      and c.kid_pin_hash is not null;

    if matched_child_id is null
       or extensions.crypt(p_pin, stored_pin_hash) is distinct from stored_pin_hash then
        current_attempts := current_attempts + 1;
        update public.kids_bank_child_login_attempts
        set failed_attempts = current_attempts,
            locked_until = case when current_attempts >= 5
                then now() + interval '15 minutes' else null end
        where username = normalized_username;
        return jsonb_build_object('ok', false, 'message', 'Username or PIN is incorrect.');
    end if;

    delete from public.kids_bank_child_login_attempts
    where username = normalized_username;

    session_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.kids_bank_child_sessions (token_hash, child_id, expires_at)
    values (
        encode(extensions.digest(session_token, 'sha256'), 'hex'),
        matched_child_id,
        session_expiry
    );

    return jsonb_build_object(
        'ok', true,
        'session_token', session_token,
        'expires_at', session_expiry,
        'child_id', matched_child_id
    );
end;
$$;

create or replace function public.kids_bank_child_dashboard(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    session_child_id uuid;
    child_data jsonb;
    activity jsonb;
begin
    if p_session_token is null or length(p_session_token) <> 64 then
        raise exception 'Child session expired. Sign in again.';
    end if;

    update public.kids_bank_child_sessions s
    set last_used_at = now()
    where s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
      and s.expires_at > now()
    returning s.child_id into session_child_id;

    if session_child_id is null then
        raise exception 'Child session expired. Sign in again.';
    end if;

    select jsonb_build_object(
        'id', c.id,
        'firstName', c.first_name,
        'lastName', c.last_name,
        'name', c.child_name,
        'school', c.school,
        'avatar', c.avatar,
        'parent1FirstName', c.parent1_first_name,
        'parent1LastName', c.parent1_last_name,
        'parent2FirstName', c.parent2_first_name,
        'parent2LastName', c.parent2_last_name,
        'checkingBalance', c.checking_balance,
        'savingsBalance', c.savings_balance,
        'savingsGoal', c.savings_goal
    )
    into child_data
    from public.children c
    where c.id = session_child_id;

    select coalesce(
        jsonb_agg(jsonb_build_object(
            'id', recent.id,
            'amount', recent.amount,
            'type', recent.type,
            'account', recent.account,
            'category', recent.category,
            'title', recent.title,
            'notes', recent.notes,
            'createdAt', recent.created_at,
            'reversesTransactionId', recent.reverses_transaction_id
        ) order by recent.created_at desc),
        '[]'::jsonb
    )
    into activity
    from (
        select t.id, t.amount, t.type, t.account, t.category, t.title, t.notes,
               t.created_at, t.reverses_transaction_id
        from public.transactions t
        where t.child_id = session_child_id
        order by t.created_at desc
        limit 100
    ) recent;

    return jsonb_build_object('child', child_data, 'transactions', activity);
end;
$$;

create or replace function public.kids_bank_child_transaction(
    p_session_token text,
    p_operation text,
    p_request_id uuid,
    p_amount numeric,
    p_account text default null,
    p_from_account text default null,
    p_to_account text default null,
    p_title text default null,
    p_category text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    session_child_id uuid;
    current_checking numeric(12, 2);
    current_savings numeric(12, 2);
    next_checking numeric(12, 2);
    next_savings numeric(12, 2);
    transaction_id uuid;
begin
    if p_session_token is null or length(p_session_token) <> 64 then
        raise exception 'Child session expired. Sign in again.';
    end if;

    update public.kids_bank_child_sessions s
    set last_used_at = now()
    where s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
      and s.expires_at > now()
    returning s.child_id into session_child_id;

    if session_child_id is null then
        raise exception 'Child session expired. Sign in again.';
    end if;

    if p_request_id is null then
        raise exception 'Transaction request ID is required.';
    end if;

    select c.checking_balance, c.savings_balance
    into current_checking, current_savings
    from public.children c
    where c.id = session_child_id
    for update;

    select t.id into transaction_id
    from public.transactions t
    where t.child_id = session_child_id and t.operation_id = p_request_id
    order by t.created_at, t.id
    limit 1;
    if transaction_id is not null then
        return transaction_id;
    end if;

    if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
        raise exception 'Amount must be positive and have at most two decimal places.';
    end if;

    next_checking := coalesce(current_checking, 0);
    next_savings := coalesce(current_savings, 0);

    if p_operation = 'spend' then
        if p_account is null or p_account not in ('checking', 'savings') then
            raise exception 'Choose a valid spending account.';
        end if;
        if p_account = 'checking' then
            if next_checking < p_amount then
                raise exception 'Insufficient funds in the Wallet.';
            end if;
            next_checking := next_checking - p_amount;
        else
            if next_savings < p_amount then
                raise exception 'Insufficient funds in the Piggy Bank.';
            end if;
            next_savings := next_savings - p_amount;
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title, operation_id
        )
        values (
            session_child_id, p_amount, 'spend', null,
            p_account, coalesce(nullif(trim(p_category), ''), 'spending'),
            coalesce(nullif(trim(p_title), ''), 'Purchase'), p_request_id
        )
        returning id into transaction_id;
    elsif p_operation = 'transfer' then
        if p_from_account is null or p_to_account is null
           or p_from_account not in ('checking', 'savings')
           or p_to_account not in ('checking', 'savings')
           or p_from_account = p_to_account then
            raise exception 'Choose two different valid accounts for the transfer.';
        end if;
        if p_from_account = 'checking' then
            if next_checking < p_amount then
                raise exception 'Insufficient funds in the Wallet.';
            end if;
            next_checking := next_checking - p_amount;
            next_savings := next_savings + p_amount;
        else
            if next_savings < p_amount then
                raise exception 'Insufficient funds in the Piggy Bank.';
            end if;
            next_savings := next_savings - p_amount;
            next_checking := next_checking + p_amount;
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title, operation_id
        )
        values (
            session_child_id, p_amount, 'transfer', null,
            p_from_account || '_to_' || p_to_account, 'transfer',
            'Moved between Wallet and Piggy Bank', p_request_id
        )
        returning id into transaction_id;
    else
        raise exception 'Unsupported child banking operation.';
    end if;

    update public.children c
    set balance = next_checking,
        checking_balance = next_checking,
        savings_balance = next_savings
    where c.id = session_child_id;

    return transaction_id;
end;
$$;

create or replace function public.kids_bank_child_sign_out(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_session_token is null or length(p_session_token) <> 64 then
        return false;
    end if;

    delete from public.kids_bank_child_sessions s
    where s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex');
    return found;
end;
$$;

revoke all on function public.kids_bank_set_child_login(uuid, text, text)
    from public, anon;
grant execute on function public.kids_bank_set_child_login(uuid, text, text)
    to authenticated;

revoke all on function public.kids_bank_child_sign_in(text, text)
    from public;
grant execute on function public.kids_bank_child_sign_in(text, text)
    to anon, authenticated;

revoke all on function public.kids_bank_child_dashboard(text)
    from public;
grant execute on function public.kids_bank_child_dashboard(text)
    to anon, authenticated;

revoke all on function public.kids_bank_child_transaction(
    text, text, uuid, numeric, text, text, text, text, text
) from public;
grant execute on function public.kids_bank_child_transaction(
    text, text, uuid, numeric, text, text, text, text, text
) to anon, authenticated;

revoke all on function public.kids_bank_child_sign_out(text)
    from public;
grant execute on function public.kids_bank_child_sign_out(text)
    to anon, authenticated;

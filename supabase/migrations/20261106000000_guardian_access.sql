-- Kids Bank guardian access foundation.
-- This migration preserves existing rows and never reads or copies the legacy
-- children.pin values. Review and apply through Supabase before enabling the app.

alter table public.users
    add column if not exists first_name text,
    add column if not exists last_name text;

alter table public.children
    add column if not exists first_name text,
    add column if not exists last_name text,
    add column if not exists school text,
    add column if not exists email text,
    add column if not exists date_of_birth date,
    add column if not exists avatar text,
    add column if not exists checking_balance numeric(12, 2),
    add column if not exists savings_balance numeric(12, 2) not null default 0,
    add column if not exists savings_goal jsonb,
    add column if not exists allowance jsonb,
    add column if not exists parent1_first_name text,
    add column if not exists parent1_last_name text,
    add column if not exists parent2_first_name text,
    add column if not exists parent2_last_name text;

alter table public.children
    alter column pin drop not null,
    alter column pin set default null;

alter table public.transactions
    add column if not exists account text,
    add column if not exists category text,
    add column if not exists title text;

create table if not exists public.kids_bank_guardian_links (
    auth_user_id uuid primary key references auth.users (id) on delete cascade,
    user_id uuid not null references public.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists kids_bank_guardian_links_user_id_idx
    on public.kids_bank_guardian_links (user_id);

alter table public.kids_bank_guardian_links enable row level security;

create policy "Guardians can read their own Kids Bank link"
    on public.kids_bank_guardian_links
    for select
    to authenticated
    using (auth_user_id = (select auth.uid()));

create or replace function public.link_kids_bank_guardian()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_auth_id uuid := auth.uid();
    confirmed_email text;
    linked_user_id uuid;
    guardian_first_name text;
    guardian_last_name text;
    existing_role text;
    matching_user_count integer;
begin
    if current_auth_id is null then
        raise exception 'Sign in before linking a guardian account.';
    end if;

    select au.email, au.raw_user_meta_data ->> 'first_name',
           au.raw_user_meta_data ->> 'last_name'
    into confirmed_email, guardian_first_name, guardian_last_name
    from auth.users au
    where au.id = current_auth_id
      and au.email_confirmed_at is not null;

    if confirmed_email is null then
        raise exception 'Confirm your email before linking a guardian account.';
    end if;

    select count(*)
    into matching_user_count
    from public.users u
    where lower(u.email) = lower(confirmed_email);

    if matching_user_count > 1 then
        raise exception 'Multiple Kids Bank users match this confirmed email; an administrator must resolve the account link.';
    end if;

    select u.id, u.role
    into linked_user_id, existing_role
    from public.users u
    where lower(u.email) = lower(confirmed_email);

    if linked_user_id is not null then
        if existing_role is distinct from 'parent'
           and existing_role is distinct from 'guardian' then
            raise exception 'The matching Kids Bank user is not a guardian account.';
        end if;
    else
        insert into public.users (id, email, role, first_name, last_name)
        values (
            current_auth_id,
            confirmed_email,
            'parent',
            guardian_first_name,
            guardian_last_name
        )
        returning id into linked_user_id;
    end if;

    insert into public.kids_bank_guardian_links (auth_user_id, user_id)
    values (current_auth_id, linked_user_id)
    on conflict (auth_user_id) do nothing;

    if not exists (
        select 1
        from public.kids_bank_guardian_links l
        where l.auth_user_id = current_auth_id
          and l.user_id = linked_user_id
    ) then
        raise exception 'This Auth account is already linked to a different Kids Bank user.';
    end if;

    return linked_user_id;
end;
$$;

revoke all on function public.link_kids_bank_guardian() from public, anon;
grant execute on function public.link_kids_bank_guardian() to authenticated;

alter table public.users enable row level security;
alter table public.children enable row level security;
alter table public.transactions enable row level security;

create policy "Guardians can read their linked user profile"
    on public.users
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.kids_bank_guardian_links l
            where l.auth_user_id = (select auth.uid())
              and l.user_id = users.id
        )
    );

create policy "Guardians can manage their children"
    on public.children
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.kids_bank_guardian_links l
            where l.auth_user_id = (select auth.uid())
              and l.user_id = children.parent_id
        )
    )
    with check (
        exists (
            select 1
            from public.kids_bank_guardian_links l
            where l.auth_user_id = (select auth.uid())
              and l.user_id = children.parent_id
        )
    );

create policy "Guardians can manage their children's transactions"
    on public.transactions
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.children c
            join public.kids_bank_guardian_links l on l.user_id = c.parent_id
            where c.id = transactions.child_id
              and l.auth_user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1
            from public.children c
            join public.kids_bank_guardian_links l on l.user_id = c.parent_id
            where c.id = transactions.child_id
              and l.auth_user_id = (select auth.uid())
        )
    );

-- Replace table-wide API grants with safe column grants. In particular,
-- authenticated and anonymous clients cannot read the legacy children.pin.
revoke all on table public.users, public.children, public.transactions
    from public, anon, authenticated;
revoke all on table public.kids_bank_guardian_links
    from public, anon, authenticated;

grant select (
    id, email, role, first_name, last_name, created_at
) on public.users to authenticated;

grant select (
    id, parent_id, child_name, balance, created_at,
    first_name, last_name, school, email, date_of_birth, avatar,
    checking_balance, savings_balance, savings_goal, allowance,
    parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
) on public.children to authenticated;

grant insert (
    id, parent_id, child_name, balance,
    first_name, last_name, school, email, date_of_birth, avatar,
    checking_balance, savings_balance, savings_goal, allowance,
    parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
) on public.children to authenticated;

grant update (
    child_name, balance, first_name, last_name, school, email,
    date_of_birth, avatar, checking_balance, savings_balance,
    savings_goal, allowance, parent1_first_name, parent1_last_name,
    parent2_first_name, parent2_last_name
) on public.children to authenticated;

grant delete on public.children to authenticated;

grant select (
    id, child_id, amount, type, notes, created_at, account, category, title
) on public.transactions to authenticated;

grant insert (
    id, child_id, amount, type, notes, created_at, account, category, title
) on public.transactions to authenticated;

grant update (
    amount, type, notes, created_at, account, category, title
) on public.transactions to authenticated;

grant delete on public.transactions to authenticated;

grant select (auth_user_id, user_id, created_at)
    on public.kids_bank_guardian_links to authenticated;

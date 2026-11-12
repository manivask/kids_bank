-- Guardian-authorized banking operations. All balance and ledger changes are
-- serialized per child and committed together by SECURITY DEFINER functions.

alter table public.children
    alter column checking_balance set default 0;

update public.children
set checking_balance = coalesce(checking_balance, balance, 0)
where checking_balance is null;

alter table public.children
    alter column checking_balance set not null;

alter table public.transactions
    add column if not exists operation_id uuid,
    add column if not exists reverses_transaction_id uuid
        references public.transactions (id);

create index if not exists kids_bank_transactions_operation_idx
    on public.transactions (child_id, operation_id)
    where operation_id is not null;

create unique index if not exists kids_bank_transactions_reversal_idx
    on public.transactions (reverses_transaction_id)
    where reverses_transaction_id is not null;

-- Clients may read their own profiles and ledgers, but every mutation must go
-- through the validated atomic RPCs below.
revoke all on public.children, public.transactions from anon, authenticated;
revoke insert, update, delete on public.children from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
revoke insert (
    id, parent_id, child_name, balance, first_name, last_name, school, email,
    date_of_birth, avatar, checking_balance, savings_balance, savings_goal, allowance,
    parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
) on public.children from anon, authenticated;
revoke update (
    child_name, balance, first_name, last_name, school, email, date_of_birth, avatar,
    checking_balance, savings_balance, savings_goal, allowance,
    parent1_first_name, parent1_last_name, parent2_first_name, parent2_last_name
) on public.children from anon, authenticated;
revoke insert (
    id, child_id, amount, type, notes, created_at, account, category, title
) on public.transactions from anon, authenticated;
revoke update (
    amount, type, notes, created_at, account, category, title
) on public.transactions from anon, authenticated;
grant select (reverses_transaction_id) on public.transactions to authenticated;

create or replace function public.kids_bank_set_allowance(
    p_child_id uuid,
    p_amount numeric,
    p_savings_percent integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_auth_id uuid := auth.uid();
    allowance_settings jsonb;
begin
    if current_auth_id is null then
        raise exception 'Sign in before changing allowance settings.';
    end if;

    if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
        raise exception 'Allowance must be a positive amount with at most two decimal places.';
    end if;

    if p_savings_percent is null or p_savings_percent < 0 or p_savings_percent > 100 then
        raise exception 'Savings percentage must be between 0 and 100.';
    end if;

    update public.children c
    set allowance = jsonb_build_object(
        'amount', p_amount,
        'frequency', 'monthly',
        'savingsRatioPercent', p_savings_percent,
        'lastPaid', c.allowance -> 'lastPaid'
    )
    where c.id = p_child_id
      and exists (
          select 1
          from public.kids_bank_guardian_links l
          where l.auth_user_id = current_auth_id
            and l.user_id = c.parent_id
      )
    returning c.allowance into allowance_settings;

    if allowance_settings is null then
        raise exception 'Child profile not found or not owned by this guardian.';
    end if;

    return allowance_settings;
end;
$$;

create or replace function public.kids_bank_apply_transaction(
    p_child_id uuid,
    p_operation text,
    p_request_id uuid,
    p_amount numeric default null,
    p_account text default null,
    p_from_account text default null,
    p_to_account text default null,
    p_title text default null,
    p_note text default null,
    p_category text default null,
    p_transaction_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_auth_id uuid := auth.uid();
    current_checking numeric(12, 2);
    current_savings numeric(12, 2);
    next_checking numeric(12, 2);
    next_savings numeric(12, 2);
    configured_allowance jsonb;
    operation_amount numeric(12, 2);
    savings_percent integer;
    savings_part numeric(12, 2);
    checking_part numeric(12, 2);
    result_transaction_id uuid;
    existing_transaction_id uuid;
    reversal_type text;
    reversal_account text;
    original_transaction public.transactions%rowtype;
begin
    if current_auth_id is null then
        raise exception 'Sign in before making a banking transaction.';
    end if;

    if p_request_id is null then
        raise exception 'A transaction request ID is required.';
    end if;

    select c.checking_balance, c.savings_balance, c.allowance
    into current_checking, current_savings, configured_allowance
    from public.children c
    join public.kids_bank_guardian_links l on l.user_id = c.parent_id
    where c.id = p_child_id
      and l.auth_user_id = current_auth_id
    for update of c;

    if not found then
        raise exception 'Child profile not found or not owned by this guardian.';
    end if;

    select t.id
    into existing_transaction_id
    from public.transactions t
    where t.child_id = p_child_id
      and t.operation_id = p_request_id
    order by t.created_at, t.id
    limit 1;

    if existing_transaction_id is not null then
        return existing_transaction_id;
    end if;

    next_checking := coalesce(current_checking, 0);
    next_savings := coalesce(current_savings, 0);

    if p_operation in ('spend', 'credit', 'bonus', 'transfer') then
        if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
            raise exception 'Amount must be positive and have at most two decimal places.';
        end if;
        operation_amount := p_amount;
    end if;

    if p_operation = 'spend' then
        if p_account is null or p_account not in ('checking', 'savings') then
            raise exception 'Choose a valid spending account.';
        elsif p_account = 'checking' then
            if next_checking < operation_amount then
                raise exception 'Insufficient funds in the Wallet.';
            end if;
            next_checking := next_checking - operation_amount;
        else
            if next_savings < operation_amount then
                raise exception 'Insufficient funds in the Piggy Bank.';
            end if;
            next_savings := next_savings - operation_amount;
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title, operation_id
        )
        values (
            p_child_id, operation_amount, 'spend', nullif(trim(p_note), ''),
            p_account, coalesce(nullif(trim(p_category), ''), 'spending'),
            coalesce(nullif(trim(p_title), ''), 'Purchase'), p_request_id
        )
        returning id into result_transaction_id;

    elsif p_operation = 'transfer' then
        if p_from_account is null
           or p_to_account is null
           or p_from_account not in ('checking', 'savings')
           or p_to_account not in ('checking', 'savings')
           or p_from_account = p_to_account then
            raise exception 'Choose two different valid accounts for the transfer.';
        end if;

        if p_from_account = 'checking' then
            if next_checking < operation_amount then
                raise exception 'Insufficient funds in the Wallet.';
            end if;
            next_checking := next_checking - operation_amount;
            next_savings := next_savings + operation_amount;
        else
            if next_savings < operation_amount then
                raise exception 'Insufficient funds in the Piggy Bank.';
            end if;
            next_savings := next_savings - operation_amount;
            next_checking := next_checking + operation_amount;
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title, operation_id
        )
        values (
            p_child_id, operation_amount, 'transfer', nullif(trim(p_note), ''),
            p_from_account || '_to_' || p_to_account, 'transfer',
            coalesce(nullif(trim(p_title), ''), 'Account transfer'), p_request_id
        )
        returning id into result_transaction_id;

    elsif p_operation in ('credit', 'bonus') then
        if p_account is null or p_account not in ('checking', 'savings') then
            raise exception 'Choose a valid destination account.';
        elsif p_account = 'checking' then
            next_checking := next_checking + operation_amount;
        else
            next_savings := next_savings + operation_amount;
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title, operation_id
        )
        values (
            p_child_id, operation_amount,
            case when p_operation = 'bonus' then 'bonus' else 'deposit' end,
            nullif(trim(p_note), ''), p_account,
            coalesce(nullif(trim(p_category), ''), p_operation),
            coalesce(nullif(trim(p_title), ''),
                case when p_operation = 'bonus' then 'Guardian bonus' else 'Guardian credit' end),
            p_request_id
        )
        returning id into result_transaction_id;

    elsif p_operation = 'allowance' then
        operation_amount := coalesce(
            nullif(configured_allowance ->> 'amount', '')::numeric, 10
        );
        savings_percent := coalesce(
            nullif(configured_allowance ->> 'savingsRatioPercent', '')::integer, 30
        );

        if operation_amount <= 0 or operation_amount <> round(operation_amount, 2) then
            raise exception 'Set a valid allowance amount before paying an allowance.';
        end if;
        if savings_percent < 0 or savings_percent > 100 then
            raise exception 'The saved allowance savings percentage is invalid.';
        end if;

        savings_part := round(operation_amount * savings_percent / 100, 2);
        checking_part := operation_amount - savings_part;
        next_checking := next_checking + checking_part;
        next_savings := next_savings + savings_part;

        if checking_part > 0 then
            insert into public.transactions (
                child_id, amount, type, notes, account, category, title, operation_id
            )
            values (
                p_child_id, checking_part, 'deposit', nullif(trim(p_note), ''),
                'checking', 'allowance', 'Monthly allowance (Wallet)', p_request_id
            )
            returning id into result_transaction_id;
        end if;

        if savings_part > 0 then
            insert into public.transactions (
                child_id, amount, type, notes, account, category, title, operation_id
            )
            values (
                p_child_id, savings_part, 'deposit', nullif(trim(p_note), ''),
                'savings', 'allowance', 'Monthly allowance (Piggy Bank)', p_request_id
            )
            returning id into result_transaction_id;
        end if;

        update public.children c
        set allowance = jsonb_set(
            coalesce(c.allowance, '{}'::jsonb),
            '{lastPaid}',
            to_jsonb(now()),
            true
        )
        where c.id = p_child_id;

    elsif p_operation = 'reverse' then
        if p_transaction_id is null then
            raise exception 'Choose a transaction to reverse.';
        end if;

        select t.*
        into original_transaction
        from public.transactions t
        where t.id = p_transaction_id
          and t.child_id = p_child_id
        for update;

        if not found then
            raise exception 'Transaction not found for this child.';
        end if;

        if original_transaction.type = 'reversal'
           or original_transaction.reverses_transaction_id is not null then
            raise exception 'A reversal cannot itself be reversed.';
        end if;

        if exists (
            select 1 from public.transactions t
            where t.reverses_transaction_id = original_transaction.id
        ) then
            raise exception 'This transaction has already been reversed.';
        end if;

        operation_amount := original_transaction.amount;
        if operation_amount is null or operation_amount <= 0 then
            raise exception 'This transaction cannot be reversed.';
        end if;

        if original_transaction.type = 'spend' then
            reversal_type := 'deposit';
            reversal_account := original_transaction.account;
            if original_transaction.account = 'checking' then
                next_checking := next_checking + operation_amount;
            elsif original_transaction.account = 'savings' then
                next_savings := next_savings + operation_amount;
            else
                raise exception 'This spending transaction has an invalid account.';
            end if;
        elsif original_transaction.type = 'transfer' then
            reversal_type := 'transfer';
            if original_transaction.account = 'checking_to_savings' then
                if next_savings < operation_amount then
                    raise exception 'The transferred funds are no longer available to reverse.';
                end if;
                reversal_account := 'savings_to_checking';
                next_checking := next_checking + operation_amount;
                next_savings := next_savings - operation_amount;
            elsif original_transaction.account = 'savings_to_checking' then
                if next_checking < operation_amount then
                    raise exception 'The transferred funds are no longer available to reverse.';
                end if;
                reversal_account := 'checking_to_savings';
                next_savings := next_savings + operation_amount;
                next_checking := next_checking - operation_amount;
            else
                raise exception 'This transfer has an invalid account direction.';
            end if;
        elsif original_transaction.type in ('deposit', 'bonus') then
            reversal_type := 'spend';
            reversal_account := original_transaction.account;
            if original_transaction.account = 'checking' then
                if next_checking < operation_amount then
                    raise exception 'The credited funds are no longer available to reverse.';
                end if;
                next_checking := next_checking - operation_amount;
            elsif original_transaction.account = 'savings' then
                if next_savings < operation_amount then
                    raise exception 'The credited funds are no longer available to reverse.';
                end if;
                next_savings := next_savings - operation_amount;
            else
                raise exception 'This credit has an invalid account.';
            end if;
        else
            raise exception 'This transaction type cannot be reversed.';
        end if;

        insert into public.transactions (
            child_id, amount, type, notes, account, category, title,
            operation_id, reverses_transaction_id
        )
        values (
            p_child_id, operation_amount, reversal_type,
            coalesce(nullif(trim(p_note), ''), 'Reversed by guardian'),
            reversal_account, 'reversal',
            'Reversal: ' || coalesce(original_transaction.title, original_transaction.type),
            p_request_id, original_transaction.id
        )
        returning id into result_transaction_id;
    else
        raise exception 'Unsupported banking operation.';
    end if;

    update public.children c
    set balance = next_checking,
        checking_balance = next_checking,
        savings_balance = next_savings
    where c.id = p_child_id;

    return result_transaction_id;
end;
$$;

revoke all on function public.kids_bank_set_allowance(uuid, numeric, integer)
    from public, anon;
grant execute on function public.kids_bank_set_allowance(uuid, numeric, integer)
    to authenticated;

revoke all on function public.kids_bank_apply_transaction(
    uuid, text, uuid, numeric, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.kids_bank_apply_transaction(
    uuid, text, uuid, numeric, text, text, text, text, text, text, uuid
) to authenticated;

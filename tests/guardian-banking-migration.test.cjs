const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(
    path.join(root, 'supabase', 'migrations', '20261108000000_guardian_banking.sql'),
    'utf8'
);
const readGrantsMigration = fs.readFileSync(
    path.join(root, 'supabase', 'migrations', '20261109000000_restore_guardian_banking_reads.sql'),
    'utf8'
);
const childLoginMigration = fs.readFileSync(
    path.join(root, 'supabase', 'migrations', '20261110000000_child_login.sql'),
    'utf8'
);

test('banking RPCs serialize on the owned child and write balances with the ledger', () => {
    assert.match(migration, /for update of c/i);
    assert.match(migration, /join public\.kids_bank_guardian_links/i);
    assert.match(migration, /set balance = next_checking,\s*checking_balance = next_checking,\s*savings_balance = next_savings/i);
    assert.match(migration, /operation_id uuid/i);
    assert.match(migration, /where t\.child_id = p_child_id\s+and t\.operation_id = p_request_id/i);
});

test('direct API writes are revoked and reversals are one-to-one', () => {
    assert.match(migration, /revoke insert, update, delete on public\.children from anon, authenticated/i);
    assert.match(migration, /revoke insert, update, delete on public\.transactions from anon, authenticated/i);
    assert.match(migration, /p_account is null or p_account not in \('checking', 'savings'\)/i);
    assert.match(migration, /revoke insert \([\s\S]*?\) on public\.children from anon, authenticated/i);
    assert.match(migration, /revoke update \([\s\S]*?\) on public\.children from anon, authenticated/i);
    assert.match(migration, /create unique index if not exists kids_bank_transactions_reversal_idx/i);
    assert.match(migration, /where t\.reverses_transaction_id = original_transaction\.id/i);
});

test('guardian read access is restored for required columns without PIN access or writes', () => {
    const childGrant = readGrantsMigration.match(/grant select \(([\s\S]*?)\) on public\.children to authenticated/i);
    const transactionGrant = readGrantsMigration.match(/grant select \(([\s\S]*?)\) on public\.transactions to authenticated/i);
    assert.ok(childGrant);
    assert.match(childGrant[1], /checking_balance/i);
    assert.match(childGrant[1], /allowance/i);
    assert.doesNotMatch(childGrant[1], /\bpin\b/i);
    assert.ok(transactionGrant);
    assert.match(transactionGrant[1], /reverses_transaction_id/i);
    assert.doesNotMatch(readGrantsMigration, /\bgrant\s+(insert|update|delete)\b/i);
});

test('guardian portal references existing unique markup IDs', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const portal = fs.readFileSync(path.join(root, 'js', 'guardian-portal.js'), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const missingIds = [...portal.matchAll(/getElementById\('([^']+)'\)/g)]
        .map((match) => match[1])
        .filter((id) => !ids.includes(id));

    assert.deepEqual([...new Set(duplicateIds)], []);
    assert.deepEqual([...new Set(missingIds)], []);
});

test('child PINs are hashed and child RPCs expose only scoped data and actions', () => {
    assert.match(childLoginMigration, /kid_pin_hash\s*=\s*extensions\.crypt\(p_pin,\s*extensions\.gen_salt\('bf'/i);
    assert.match(childLoginMigration, /lower\(c\.kid_username\)\s*=\s*normalized_username/i);
    assert.match(childLoginMigration, /kids_bank_child_login_attempts/i);
    assert.match(childLoginMigration, /current_attempts\s*>=\s*5/i);
    assert.match(childLoginMigration, /kids_bank_child_sessions[\s\S]*?token_hash text primary key/i);
    assert.match(childLoginMigration, /digest\(session_token,\s*'sha256'\)/i);
    assert.match(childLoginMigration, /session_expiry timestamptz := now\(\) \+ interval '12 hours'/i);
    assert.match(childLoginMigration, /from public\.kids_bank_guardian_links l/i);
    assert.match(childLoginMigration, /l\.auth_user_id = current_auth_id/i);
    assert.match(childLoginMigration, /'checkingBalance', c\.checking_balance[\s\S]*?'savingsBalance', c\.savings_balance/i);
    const childDashboard = childLoginMigration.match(/create or replace function public\.kids_bank_child_dashboard[\s\S]*?create or replace function public\.kids_bank_child_transaction/i)?.[0] || '';
    assert.match(childDashboard, /'parent1FirstName', c\.parent1_first_name/i);
    assert.match(childDashboard, /'parent2LastName', c\.parent2_last_name/i);
    assert.doesNotMatch(childDashboard, /kid_pin_hash|parent_id|email|auth_user_id/i);
    assert.match(childLoginMigration, /if p_operation = 'spend'[\s\S]*?elsif p_operation = 'transfer'/i);
    assert.doesNotMatch(childLoginMigration, /p_operation\s*=\s*'(credit|bonus|allowance|reverse)'/i);
    assert.match(childLoginMigration, /grant execute on function public\.kids_bank_child_sign_in\(text, text\)\s+to anon, authenticated/i);
    assert.match(childLoginMigration, /grant execute on function public\.kids_bank_child_transaction\([\s\S]*?\)\s+to anon, authenticated/i);
    assert.match(childLoginMigration, /revoke all on public\.kids_bank_child_login_attempts, public\.kids_bank_child_sessions\s+from public, anon, authenticated/i);
    assert.doesNotMatch(childLoginMigration, /grant select \([^)]*kid_pin_hash/i);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const { createBankingApi } = require('../js/banking-client.js');

function createRpcClient() {
    const calls = [];
    return {
        calls,
        client: {
            async rpc(name, args) {
                calls.push({ name, args });
                return { data: 'transaction-id', error: null };
            }
        }
    };
}

test('spending requests an atomic server transaction with an idempotency key', async () => {
    const { calls, client } = createRpcClient();
    const api = createBankingApi(client, () => 'request-1');

    const transactionId = await api.spend('child-1', {
        amount: '3.50',
        account: 'checking',
        category: 'snacks',
        title: 'Apple',
        note: 'After school'
    });

    assert.equal(transactionId, 'transaction-id');
    assert.equal(calls[0].name, 'kids_bank_apply_transaction');
    assert.deepEqual(calls[0].args, {
        p_child_id: 'child-1',
        p_operation: 'spend',
        p_request_id: 'request-1',
        p_amount: 3.5,
        p_account: 'checking',
        p_from_account: null,
        p_to_account: null,
        p_title: 'Apple',
        p_note: 'After school',
        p_category: 'snacks',
        p_transaction_id: null
    });
});

test('rejects invalid amounts and same-account transfers before calling Supabase', async () => {
    const { calls, client } = createRpcClient();
    const api = createBankingApi(client, () => 'request-2');

    assert.throws(() => api.spend('child-1', { amount: 0, account: 'checking' }), /greater than zero/);
    assert.throws(() => api.spend('child-1', { amount: 1.234, account: 'checking' }), /two decimal places/);
    assert.throws(
        () => api.transfer('child-1', { amount: 1, fromAccount: 'checking', toAccount: 'checking' }),
        /different source and destination/
    );
    assert.equal(calls.length, 0);
});

test('allowance settings and reversal use dedicated authenticated RPCs', async () => {
    const { calls, client } = createRpcClient();
    const api = createBankingApi(client, () => 'request-3');

    await api.setAllowance('child-1', '12.50', 25);
    await api.payAllowance('child-1', 'Monthly allowance');
    await api.reverse('child-1', 'transaction-to-reverse');

    assert.equal(calls[0].name, 'kids_bank_set_allowance');
    assert.deepEqual(calls[0].args, {
        p_child_id: 'child-1',
        p_amount: 12.5,
        p_savings_percent: 25
    });
    assert.equal(calls[1].args.p_operation, 'allowance');
    assert.equal(calls[1].args.p_note, 'Monthly allowance');
    assert.equal(calls[2].args.p_operation, 'reverse');
    assert.equal(calls[2].args.p_transaction_id, 'transaction-to-reverse');
});

test('preserves a caller-supplied request ID for safe retries', async () => {
    const { calls, client } = createRpcClient();
    const api = createBankingApi(client, () => 'generated-request');
    const values = {
        amount: 1,
        account: 'checking',
        title: 'Retryable purchase',
        requestId: 'stable-request'
    };

    await api.spend('child-1', values);
    await api.spend('child-1', values);

    assert.equal(calls[0].args.p_request_id, 'stable-request');
    assert.equal(calls[1].args.p_request_id, 'stable-request');
});

test('surfaces Supabase operation failures', async () => {
    const api = createBankingApi({
        async rpc() {
            return { data: null, error: new Error('Insufficient funds') };
        }
    }, () => 'request-4');

    await assert.rejects(
        api.spend('child-1', { amount: 1, account: 'checking' }),
        /Insufficient funds/
    );
});

test('child sign-in validates credentials and sends them to the scoped login RPC', async () => {
    const calls = [];
    const api = createBankingApi({
        async rpc(name, args) {
            calls.push({ name, args });
            return {
                data: { ok: true, session_token: 'session-token', expires_at: 'later' },
                error: null
            };
        }
    });

    const result = await api.signInChild('Maya.Kid', '123456');
    assert.equal(result.session_token, 'session-token');
    assert.deepEqual(calls[0], {
        name: 'kids_bank_child_sign_in',
        args: { p_username: 'maya.kid', p_pin: '123456' }
    });
    await assert.rejects(api.signInChild('x', '1234'), /valid username/);
    await assert.rejects(api.signInChild('maya', 'abc123'), /exactly 6 digits/);
    assert.equal(calls.length, 1);
});

test('child dashboard, sign-out, credential setup, spending, and transfers use child-scoped RPCs', async () => {
    const calls = [];
    const api = createBankingApi({
        async rpc(name, args) {
            calls.push({ name, args });
            if (name === 'kids_bank_child_dashboard') {
                return { data: { child: { id: 'child-1' }, transactions: [] }, error: null };
            }
            return { data: 'transaction-id', error: null };
        }
    }, () => 'child-request');

    await api.childDashboard('session-token');
    await api.childSignOut('session-token');
    await api.setChildLogin('child-1', 'maya.kid', '654321');
    await api.childSpend('session-token', {
        amount: 2,
        account: 'checking',
        title: 'Book',
        requestId: 'spend-request'
    });
    await api.childTransfer('session-token', {
        amount: 3,
        fromAccount: 'checking',
        toAccount: 'savings',
        requestId: 'transfer-request'
    });

    assert.deepEqual(calls.map(({ name }) => name), [
        'kids_bank_child_dashboard',
        'kids_bank_child_sign_out',
        'kids_bank_set_child_login',
        'kids_bank_child_transaction',
        'kids_bank_child_transaction'
    ]);
    assert.equal(calls[2].args.p_pin, '654321');
    assert.equal(calls[3].args.p_operation, 'spend');
    assert.equal(calls[3].args.p_request_id, 'spend-request');
    assert.equal(calls[4].args.p_operation, 'transfer');
    assert.equal(calls[4].args.p_from_account, 'checking');
    assert.equal(calls[4].args.p_to_account, 'savings');
    await assert.rejects(
        api.childTransfer('session-token', {
            amount: 1,
            fromAccount: 'checking',
            toAccount: 'checking'
        }),
        /different source and destination/
    );
    assert.equal(calls.length, 5);
});

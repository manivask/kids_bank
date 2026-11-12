((root, factory) => {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.KidsBankingClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const accounts = new Set(['checking', 'savings']);

    function requireId(value, label) {
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error(`${label} is required.`);
        }
        return value;
    }

    function positiveAmount(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Enter an amount greater than zero.');
        }
        const rounded = Math.round(amount * 100) / 100;
        if (Math.abs(amount - rounded) > Number.EPSILON * Math.max(1, amount)) {
            throw new Error('Amounts can have at most two decimal places.');
        }
        return rounded;
    }

    function requireAccount(value, label = 'Account') {
        if (!accounts.has(value)) throw new Error(`Choose a valid ${label.toLowerCase()}.`);
        return value;
    }

    function createBankingApi(client, createRequestId = () => globalThis.crypto.randomUUID()) {
        async function childTransaction(sessionToken, operation, values) {
            if (!['spend', 'transfer'].includes(operation)) {
                throw new Error('Unsupported child banking operation.');
            }
            if (operation === 'spend') requireAccount(values.account);
            if (operation === 'transfer') {
                requireAccount(values.fromAccount, 'Source account');
                requireAccount(values.toAccount, 'Destination account');
                if (values.fromAccount === values.toAccount) {
                    throw new Error('Choose different source and destination accounts.');
                }
            }

            const { data, error } = await client.rpc('kids_bank_child_transaction', {
                p_session_token: requireId(sessionToken, 'Child session'),
                p_operation: operation,
                p_request_id: requireId(values.requestId || createRequestId(), 'Transaction request'),
                p_amount: positiveAmount(values.amount),
                p_account: values.account ?? null,
                p_from_account: values.fromAccount ?? null,
                p_to_account: values.toAccount ?? null,
                p_title: values.title?.trim() || null,
                p_category: values.category?.trim() || null
            });
            if (error) throw error;
            if (!data) throw new Error('The banking operation returned no transaction ID.');
            return data;
        }

        async function apply(childId, operation, values = {}) {
            const { data, error } = await client.rpc('kids_bank_apply_transaction', {
                p_child_id: requireId(childId, 'Child profile'),
                p_operation: operation,
                p_request_id: requireId(values.requestId || createRequestId(), 'Transaction request'),
                p_amount: values.amount ?? null,
                p_account: values.account ?? null,
                p_from_account: values.fromAccount ?? null,
                p_to_account: values.toAccount ?? null,
                p_title: values.title?.trim() || null,
                p_note: values.note?.trim() || null,
                p_category: values.category?.trim() || null,
                p_transaction_id: values.transactionId ?? null
            });
            if (error) throw error;
            if (!data) throw new Error('The banking operation returned no transaction ID.');
            return data;
        }

        return {
            async signInChild(username, pin) {
                const normalizedUsername = String(username || '').trim().toLowerCase();
                if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalizedUsername)) {
                    throw new Error('Enter a valid username.');
                }
                if (!/^[0-9]{6}$/.test(String(pin || ''))) {
                    throw new Error('PIN must contain exactly 6 digits.');
                }
                const { data, error } = await client.rpc('kids_bank_child_sign_in', {
                    p_username: normalizedUsername,
                    p_pin: String(pin)
                });
                if (error) throw error;
                if (!data?.ok || !data.session_token) {
                    throw new Error(data?.message || 'Username or PIN is incorrect.');
                }
                return data;
            },
            childDashboard(sessionToken) {
                return client.rpc('kids_bank_child_dashboard', {
                    p_session_token: requireId(sessionToken, 'Child session')
                }).then(({ data, error }) => {
                    if (error) throw error;
                    if (!data?.child) throw new Error('Child dashboard data is unavailable.');
                    return data;
                });
            },
            childSignOut(sessionToken) {
                return client.rpc('kids_bank_child_sign_out', {
                    p_session_token: requireId(sessionToken, 'Child session')
                }).then(({ data, error }) => {
                    if (error) throw error;
                    return data;
                });
            },
            setChildLogin(childId, username, pin) {
                const normalizedUsername = String(username || '').trim().toLowerCase();
                if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalizedUsername)) {
                    throw new Error('Username must be 3 to 24 letters, numbers, dots, underscores, or hyphens.');
                }
                if (!/^[0-9]{6}$/.test(String(pin || ''))) {
                    throw new Error('Child PIN must contain exactly 6 digits.');
                }
                return client.rpc('kids_bank_set_child_login', {
                    p_child_id: requireId(childId, 'Child profile'),
                    p_username: normalizedUsername,
                    p_pin: String(pin)
                }).then(({ data, error }) => {
                    if (error) throw error;
                    return data;
                });
            },
            childSpend(sessionToken, values) {
                return childTransaction(sessionToken, 'spend', values);
            },
            childTransfer(sessionToken, values) {
                return childTransaction(sessionToken, 'transfer', values);
            },
            spend(childId, values) {
                requireAccount(values.account);
                return apply(childId, 'spend', {
                    ...values,
                    amount: positiveAmount(values.amount)
                });
            },
            transfer(childId, values) {
                requireAccount(values.fromAccount, 'Source account');
                requireAccount(values.toAccount, 'Destination account');
                if (values.fromAccount === values.toAccount) {
                    throw new Error('Choose different source and destination accounts.');
                }
                return apply(childId, 'transfer', {
                    ...values,
                    amount: positiveAmount(values.amount)
                });
            },
            credit(childId, values) {
                requireAccount(values.account, 'Destination account');
                return apply(childId, values.bonus ? 'bonus' : 'credit', {
                    ...values,
                    amount: positiveAmount(values.amount)
                });
            },
            payAllowance(childId, note = '', requestId) {
                return apply(childId, 'allowance', { note, requestId });
            },
            reverse(childId, transactionId, requestId) {
                return apply(childId, 'reverse', {
                    transactionId: requireId(transactionId, 'Transaction'),
                    requestId
                });
            },
            async setAllowance(childId, amount, savingsPercent) {
                const percent = Number(savingsPercent);
                if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
                    throw new Error('Savings percentage must be a whole number from 0 to 100.');
                }
                const { data, error } = await client.rpc('kids_bank_set_allowance', {
                    p_child_id: requireId(childId, 'Child profile'),
                    p_amount: positiveAmount(amount),
                    p_savings_percent: percent
                });
                if (error) throw error;
                return data;
            }
        };
    }

    return { createBankingApi };
});

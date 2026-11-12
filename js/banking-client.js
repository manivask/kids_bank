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

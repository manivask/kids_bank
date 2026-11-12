(() => {
    const config = window.KIDS_BANK_SUPABASE_CONFIG;
    const supabaseSdk = window.supabase;
    const cloudApp = document.getElementById('cloud-app');
    const authPanel = document.getElementById('cloud-auth-panel');
    const kidAuthPanel = document.getElementById('cloud-kid-auth-panel');
    const kidPanel = document.getElementById('cloud-kid-panel');
    const familyPanel = document.getElementById('cloud-family-panel');
    const authForm = document.getElementById('cloud-auth-form');
    const kidAuthForm = document.getElementById('cloud-kid-auth-form');
    const childForm = document.getElementById('cloud-child-form');

    if (!config || !config.url || !config.publishableKey) return;

    document.documentElement.dataset.appMode = 'supabase';
    cloudApp.hidden = false;

    const authMessage = document.getElementById('cloud-auth-message');
    const familyMessage = document.getElementById('cloud-family-message');
    const childError = document.getElementById('cloud-child-error');
    const nameFields = document.getElementById('cloud-name-fields');
    const passwordInput = document.getElementById('cloud-password');
    const authTitle = document.getElementById('cloud-auth-title');
    const authSubmit = document.getElementById('cloud-auth-submit');
    const authToggle = document.getElementById('cloud-auth-toggle');
    const signOutButton = document.getElementById('cloud-signout');
    const childList = document.getElementById('cloud-child-list');
    const guardianEmail = document.getElementById('cloud-guardian-email');
    const bankingPanel = document.getElementById('cloud-banking-panel');
    const transactionList = document.getElementById('cloud-transaction-list');
    const kidTransactionList = document.getElementById('cloud-kid-transaction-list');

    if (!supabaseSdk || typeof supabaseSdk.createClient !== 'function') {
        authPanel.hidden = false;
        familyPanel.hidden = true;
        authToggle.hidden = true;
        authSubmit.disabled = true;
        showMessage(authMessage, 'The Supabase client library failed to load. Reload the page or try again later.', true);
        return;
    }

    const client = supabaseSdk.createClient(config.url, config.publishableKey);
    if (!window.KidsBankingClient || typeof window.KidsBankingClient.createBankingApi !== 'function') {
        throw new Error('The banking client did not load.');
    }
    const banking = window.KidsBankingClient.createBankingApi(client);

    let isSignUp = false;
    let currentUser = null;
    let children = [];
    let selectedChildId = null;
    let childLoginMigrationApplied = true;
    let childSessionToken = null;
    let childDashboardData = null;
    let isEnteringKidMode = false;
    let isBusy = false;
    const pendingRequestIds = new Map();

    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle('cloud-error', isError);
    }

    function bankingErrorMessage(error) {
        const message = error?.message || String(error);
        if (/kids_bank_(child_sign_in|child_dashboard|child_transaction|child_sign_out|set_child_login)|kid_username/i.test(message)) {
            return `${message} Apply supabase/migrations/20261110000000_child_login.sql in the Supabase SQL Editor, then retry.`;
        }
        if (/kids_bank_(apply_transaction|set_allowance)|schema cache|reverses_transaction_id|operation_id/i.test(message)) {
            return `${message} Apply supabase/migrations/20261108000000_guardian_banking.sql in the Supabase SQL Editor, then retry.`;
        }
        return message;
    }

    function setBusy(busy) {
        isBusy = busy;
        document.querySelectorAll('#cloud-auth-form button, #cloud-kid-auth-form button, #cloud-family-panel button, #cloud-kid-panel button')
            .forEach((button) => { button.disabled = busy; });
    }

    function setChildLoginAvailability(available) {
        childLoginMigrationApplied = available;
        document.getElementById('cloud-child-login-form').hidden = !available;
        document.getElementById('cloud-new-kid-credentials').hidden = !available;
        document.getElementById('cloud-new-kid-username').required = available;
        document.getElementById('cloud-new-kid-pin').required = available;
    }

    function setAuthMode(signUp) {
        isSignUp = signUp;
        nameFields.hidden = !signUp;
        document.getElementById('cloud-first-name').required = signUp;
        document.getElementById('cloud-last-name').required = signUp;
        authTitle.textContent = signUp ? 'Create a Guardian Account' : 'Parent / Guardian Sign In';
        authSubmit.textContent = signUp ? 'Create Account' : 'Sign In';
        authToggle.textContent = signUp ? 'Already have an account? Sign in' : 'Create a guardian account';
        passwordInput.autocomplete = signUp ? 'new-password' : 'current-password';
        showMessage(authMessage, '');
    }

    function showSignedOut() {
        currentUser = null;
        authPanel.hidden = false;
        kidAuthPanel.hidden = true;
        kidPanel.hidden = true;
        familyPanel.hidden = true;
        signOutButton.hidden = true;
        signOutButton.textContent = 'Sign out';
        bankingPanel.hidden = true;
        children = [];
        selectedChildId = null;
        pendingRequestIds.clear();
        childList.replaceChildren();
        transactionList.replaceChildren();
        kidTransactionList.replaceChildren();
        showMessage(document.getElementById('cloud-banking-message'), '');
    }

    function showKidSignIn(message = '', isError = false) {
        authPanel.hidden = true;
        familyPanel.hidden = true;
        kidPanel.hidden = true;
        kidAuthPanel.hidden = false;
        signOutButton.hidden = true;
        signOutButton.textContent = 'Sign out';
        showMessage(document.getElementById('cloud-kid-auth-message'), message, isError);
    }

    function showGuardianSignIn() {
        childSessionToken = null;
        childDashboardData = null;
        sessionStorage.removeItem('kidsBankChildSession');
        showSignedOut();
    }

    function renderKidTransactions(transactions) {
        kidTransactionList.replaceChildren();
        if (!transactions.length) {
            addText(kidTransactionList, 'p', 'cloud-help', 'No banking activity yet.');
            return;
        }

        transactions.forEach((transaction) => {
            const row = document.createElement('article');
            row.className = 'cloud-transaction-row';
            const details = document.createElement('div');
            addText(details, 'strong', '', transaction.title || transaction.type || 'Banking activity');
            const date = transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '';
            const account = transaction.account ? ` · ${transaction.account.replaceAll('_', ' ')}` : '';
            addText(details, 'p', 'cloud-help', `${date}${account}`);
            if (transaction.notes) addText(details, 'p', 'cloud-transaction-note', transaction.notes);
            row.appendChild(details);

            const amount = document.createElement('strong');
            const isDebit = transaction.type === 'spend';
            amount.className = `cloud-transaction-amount ${isDebit ? 'is-debit' : 'is-credit'}`;
            amount.textContent = `${isDebit ? '−' : '+'}${money(transaction.amount)}`;
            row.appendChild(amount);
            kidTransactionList.appendChild(row);
        });
    }

    async function loadKidDashboard(sessionToken) {
        const data = await banking.childDashboard(sessionToken);
        childSessionToken = sessionToken;
        childDashboardData = data;
        sessionStorage.setItem('kidsBankChildSession', sessionToken);
        const child = data.child;
        const name = [child.firstName, child.lastName].filter(Boolean).join(' ') || child.name || 'friend';
        document.getElementById('cloud-kid-name').textContent = name;
        document.getElementById('cloud-kid-school').textContent = child.school || '';
        document.getElementById('cloud-kid-avatar').textContent = child.avatar || '';
        const parentNames = [
            [child.parent1FirstName, child.parent1LastName].filter(Boolean).join(' '),
            [child.parent2FirstName, child.parent2LastName].filter(Boolean).join(' ')
        ].filter(Boolean);
        const parentMessage = document.getElementById('cloud-kid-parents');
        parentMessage.hidden = parentNames.length === 0;
        parentMessage.textContent = parentNames.length ? `My family: ${parentNames.join(' and ')}` : '';
        document.getElementById('cloud-kid-checking-balance').textContent = money(child.checkingBalance);
        document.getElementById('cloud-kid-savings-balance').textContent = money(child.savingsBalance);
        renderKidTransactions(data.transactions || []);
        authPanel.hidden = true;
        kidAuthPanel.hidden = true;
        familyPanel.hidden = true;
        kidPanel.hidden = false;
        signOutButton.hidden = false;
        signOutButton.textContent = 'Kid sign out';
        showMessage(document.getElementById('cloud-kid-message'), '');
    }

    async function runKidAction(action, successMessage, requestKey) {
        if (isBusy || !childSessionToken) return false;
        setBusy(true);
        showMessage(document.getElementById('cloud-kid-message'), '');
        try {
            await action();
            if (requestKey) pendingRequestIds.delete(requestKey);
            await loadKidDashboard(childSessionToken);
            showMessage(document.getElementById('cloud-kid-message'), successMessage);
            return true;
        } catch (error) {
            if (/child session expired/i.test(error?.message || '')) {
                sessionStorage.removeItem('kidsBankChildSession');
                childSessionToken = null;
                childDashboardData = null;
                showKidSignIn('Your session expired. Please sign in again.');
            } else {
                showMessage(document.getElementById('cloud-kid-message'), bankingErrorMessage(error), true);
            }
            return false;
        } finally {
            setBusy(false);
        }
    }

    function addText(parent, tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = text;
        parent.appendChild(element);
        return element;
    }

    function renderChildren(children) {
        childList.replaceChildren();
        if (!children.length) {
            bankingPanel.hidden = true;
            addText(childList, 'p', 'cloud-help', 'No child profiles yet. Add one below to get started.');
            return;
        }

        children.forEach((child) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `cloud-child-card cloud-child-select${child.id === selectedChildId ? ' selected' : ''}`;
            card.dataset.childId = child.id;
            const fullName = [child.first_name, child.last_name].filter(Boolean).join(' ')
                || child.child_name || 'Child profile';
            addText(card, 'h2', '', fullName);
            if (child.school) addText(card, 'p', 'cloud-help', child.school);
            addText(
                card,
                'p',
                'cloud-balance',
                `Wallet: $${Number(child.checking_balance || 0).toFixed(2)} · Piggy Bank: $${Number(child.savings_balance || 0).toFixed(2)}`
            );
            addText(card, 'p', 'cloud-help', child.kid_username
                ? `Kid username: ${child.kid_username}`
                : childLoginMigrationApplied
                    ? 'Kid sign-in is not set up yet'
                    : 'Apply the child-login migration to enable kid sign-in');
            addText(card, 'span', 'cloud-child-select-hint',
                child.id === selectedChildId ? 'Selected account' : 'Manage account');
            childList.appendChild(card);
        });
    }

    function selectedChild() {
        return children.find((child) => child.id === selectedChildId) || null;
    }

    function money(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function requestIdFor(actionName) {
        const key = `${selectedChildId}:${actionName}`;
        if (!pendingRequestIds.has(key)) {
            pendingRequestIds.set(key, window.crypto.randomUUID());
        }
        return { key, id: pendingRequestIds.get(key) };
    }

    async function refreshBanking() {
        const child = selectedChild();
        if (!child) {
            bankingPanel.hidden = true;
            return;
        }

        const [childResult, transactionResult] = await Promise.all([
            client.from('children')
                .select(`id, child_name, first_name, last_name, school, checking_balance, savings_balance, allowance${childLoginMigrationApplied ? ', kid_username' : ''}`)
                .eq('id', child.id)
                .single(),
            client.from('transactions')
                .select('id, child_id, amount, type, notes, created_at, account, category, title, reverses_transaction_id')
                .eq('child_id', child.id)
                .order('created_at', { ascending: false })
                .limit(100)
        ]);
        if (childResult.error) throw childResult.error;
        if (transactionResult.error) throw transactionResult.error;

        Object.assign(child, childResult.data);
        document.getElementById('cloud-selected-child-name').textContent =
            [child.first_name, child.last_name].filter(Boolean).join(' ') || child.child_name || 'Child profile';
        document.getElementById('cloud-selected-child-school').textContent = child.school || '';
        document.getElementById('cloud-login-username').value = child.kid_username || '';
        document.getElementById('cloud-checking-balance').textContent = money(child.checking_balance);
        document.getElementById('cloud-savings-balance').textContent = money(child.savings_balance);
        const allowance = child.allowance || {};
        document.getElementById('cloud-allowance-amount').value = allowance.amount || 10;
        document.getElementById('cloud-allowance-savings').value =
            Number.isInteger(Number(allowance.savingsRatioPercent)) ? allowance.savingsRatioPercent : 30;
        renderTransactions(transactionResult.data || []);
        bankingPanel.hidden = false;
        renderChildren(children);
    }

    function renderTransactions(transactions) {
        transactionList.replaceChildren();
        if (!transactions.length) {
            addText(transactionList, 'p', 'cloud-help', 'No banking activity yet.');
            return;
        }

        const reversedIds = new Set(
            transactions.map((item) => item.reverses_transaction_id).filter(Boolean)
        );
        transactions.forEach((transaction) => {
            const row = document.createElement('article');
            row.className = 'cloud-transaction-row';
            const details = document.createElement('div');
            const title = transaction.title || transaction.type || 'Banking activity';
            addText(details, 'strong', '', title);
            const date = transaction.created_at
                ? new Date(transaction.created_at).toLocaleString()
                : '';
            const account = transaction.account ? ` · ${transaction.account.replaceAll('_', ' ')}` : '';
            addText(details, 'p', 'cloud-help', `${date}${account}`);
            if (transaction.notes) addText(details, 'p', 'cloud-transaction-note', transaction.notes);
            row.appendChild(details);

            const amount = document.createElement('strong');
            const prefix = `${transaction.reverses_transaction_id ? '↩ ' : ''}${
                transaction.type === 'spend' ? '−' :
                    transaction.type === 'deposit' || transaction.type === 'bonus' ? '+' : ''
            }`;
            amount.className = `cloud-transaction-amount ${transaction.type === 'spend' ? 'is-debit' : 'is-credit'}`;
            amount.textContent = `${prefix}${money(transaction.amount)}`;
            row.appendChild(amount);

            const canReverse = ['spend', 'transfer', 'deposit', 'bonus'].includes(transaction.type)
                && !transaction.reverses_transaction_id
                && !reversedIds.has(transaction.id);
            if (canReverse) {
                const reverseButton = document.createElement('button');
                reverseButton.type = 'button';
                reverseButton.className = 'btn-secondary-action cloud-reverse-button';
                reverseButton.textContent = 'Undo';
                reverseButton.dataset.transactionId = transaction.id;
                reverseButton.setAttribute('aria-label', `Undo ${title}`);
                row.appendChild(reverseButton);
            }
            transactionList.appendChild(row);
        });
    }

    async function runBankingAction(action, successMessage, requestKey = null) {
        if (isBusy || !selectedChildId) return;
        setBusy(true);
        showMessage(document.getElementById('cloud-banking-message'), '');
        try {
            await action(selectedChildId);
        } catch (error) {
            showMessage(document.getElementById('cloud-banking-message'), bankingErrorMessage(error), true);
            setBusy(false);
            return false;
        }

        if (requestKey) pendingRequestIds.delete(requestKey);
        try {
            await refreshBanking();
            showMessage(document.getElementById('cloud-banking-message'), successMessage);
            return true;
        } catch (error) {
            showMessage(
                document.getElementById('cloud-banking-message'),
                `${successMessage} The operation was saved, but the latest balances could not be refreshed: ${bankingErrorMessage(error)} Use Refresh to reload.`,
                true
            );
            return true;
        } finally {
            setBusy(false);
        }
    }

    async function linkGuardian() {
        const { data: result, error } = await client.rpc('link_kids_bank_guardian');
        if (error) throw error;
        if (!result) throw new Error('Guardian account could not be linked.');
    }

    async function loadFamily(user) {
        setBusy(true);
        showMessage(familyMessage, '');
        try {
            await linkGuardian();
            let { data: familyChildren, error } = await client
                .from('children')
                .select('id, child_name, first_name, last_name, school, checking_balance, savings_balance, allowance, kid_username')
                .order('created_at', { ascending: true });
            if (error && /kid_username|42703/i.test(`${error.code || ''} ${error.message || ''}`)) {
                setChildLoginAvailability(false);
                ({ data: familyChildren, error } = await client
                    .from('children')
                    .select('id, child_name, first_name, last_name, school, checking_balance, savings_balance, allowance')
                    .order('created_at', { ascending: true }));
                if (!error) {
                    showMessage(
                        familyMessage,
                        'Kid sign-in is unavailable until supabase/migrations/20261110000000_child_login.sql is applied.',
                        true
                    );
                }
            } else if (!error) {
                setChildLoginAvailability(true);
            }
            if (error) throw error;

            currentUser = user;
            children = familyChildren || [];
            if (!children.some((child) => child.id === selectedChildId)) {
                selectedChildId = children[0]?.id || null;
            }
            guardianEmail.textContent = user.email || '';
            renderChildren(children);
            authPanel.hidden = true;
            familyPanel.hidden = false;
            signOutButton.hidden = false;
            signOutButton.textContent = 'Sign out';
            try {
                await refreshBanking();
            } catch (error) {
                bankingPanel.hidden = true;
                showMessage(
                    familyMessage,
                    `Family profiles loaded, but banking is not ready: ${bankingErrorMessage(error)}`,
                    true
                );
            }
            return true;
        } catch (error) {
            showSignedOut();
            showMessage(
                authMessage,
                `${error.message} Check email confirmation and the applied Supabase migrations.`,
                true
            );
            return false;
        } finally {
            setBusy(false);
        }
    }

    document.getElementById('cloud-show-child-login').addEventListener('click', async () => {
        if (isBusy) return;
        setBusy(true);
        isEnteringKidMode = true;
        try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            if (data.session) {
                const { error: signOutError } = await client.auth.signOut();
                if (signOutError) throw signOutError;
            }
            showKidSignIn();
        } catch (error) {
            showMessage(authMessage, error.message, true);
        } finally {
            isEnteringKidMode = false;
            setBusy(false);
        }
    });

    document.getElementById('cloud-show-guardian-login').addEventListener('click', async () => {
        if (isBusy) return;
        setBusy(true);
        try {
            if (childSessionToken) await banking.childSignOut(childSessionToken);
            showGuardianSignIn();
        } catch (error) {
            showMessage(document.getElementById('cloud-kid-auth-message'), bankingErrorMessage(error), true);
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('cloud-family-kid-login').addEventListener('click', async () => {
        if (isBusy) return;
        setBusy(true);
        isEnteringKidMode = true;
        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;
            showKidSignIn();
        } catch (error) {
            showMessage(familyMessage, error.message, true);
        } finally {
            isEnteringKidMode = false;
            setBusy(false);
        }
    });

    kidAuthForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isBusy) return;
        setBusy(true);
        showMessage(document.getElementById('cloud-kid-auth-message'), '');
        try {
            const username = document.getElementById('cloud-kid-username').value;
            const pin = document.getElementById('cloud-kid-pin').value;
            const result = await banking.signInChild(username, pin);
            kidAuthForm.reset();
            await loadKidDashboard(result.session_token);
        } catch (error) {
            showMessage(document.getElementById('cloud-kid-auth-message'), bankingErrorMessage(error), true);
        } finally {
            setBusy(false);
        }
    });

    authToggle.addEventListener('click', () => setAuthMode(!isSignUp));

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isBusy) return;
        setBusy(true);
        showMessage(authMessage, '');
        try {
            const email = document.getElementById('cloud-email').value.trim();
            const password = passwordInput.value;
            if (isSignUp) {
                const firstName = document.getElementById('cloud-first-name').value.trim();
                const lastName = document.getElementById('cloud-last-name').value.trim();
                const { data, error } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { first_name: firstName, last_name: lastName },
                        emailRedirectTo: window.location.href
                    }
                });
                if (error) throw error;
                if (!data.session) {
                    showMessage(authMessage, 'Account created. Confirm your email, then sign in to continue.');
                    return;
                }
                await loadFamily(data.user);
                return;
            }

            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await loadFamily(data.user);
        } catch (error) {
            showMessage(authMessage, error.message, true);
        } finally {
            setBusy(false);
        }
    });

    childForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isBusy || !currentUser) return;
        setBusy(true);
        showMessage(childError, '');
        const values = (id) => document.getElementById(id).value.trim();
        const dob = values('cloud-child-dob');
        try {
            const { data: childId, error } = await client.rpc('create_kids_bank_child', {
                p_first_name: values('cloud-child-first'),
                p_last_name: values('cloud-child-last'),
                p_school: values('cloud-child-school') || null,
                p_email: values('cloud-child-email') || null,
                p_date_of_birth: dob || null,
                p_parent1_first_name: values('cloud-parent1-first'),
                p_parent1_last_name: values('cloud-parent1-last'),
                p_parent2_first_name: values('cloud-parent2-first') || null,
                p_parent2_last_name: values('cloud-parent2-last') || null
            });
            if (error) throw error;
            selectedChildId = childId;
            const username = values('cloud-new-kid-username');
            const pin = values('cloud-new-kid-pin');
            childForm.reset();
            if (childLoginMigrationApplied) {
                try {
                    await banking.setChildLogin(childId, username, pin);
                } catch (loginError) {
                    const familyLoaded = await loadFamily(currentUser);
                    if (familyLoaded) {
                        showMessage(
                            familyMessage,
                            `Child profile created, but kid sign-in could not be saved: ${loginError.message}`,
                            true
                        );
                    }
                    return;
                }
            }
            const familyLoaded = await loadFamily(currentUser);
            if (!familyLoaded) return;
            if (childLoginMigrationApplied) {
                showMessage(familyMessage, 'Child profile and kid sign-in created.');
            } else {
                showMessage(
                    familyMessage,
                    'Child profile created. Apply supabase/migrations/20261110000000_child_login.sql to set up kid sign-in.'
                );
            }
        } catch (error) {
            showMessage(childError, error.message, true);
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('cloud-child-login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isBusy || !currentUser || !selectedChildId) return;
        setBusy(true);
        showMessage(document.getElementById('cloud-banking-message'), '');
        try {
            await banking.setChildLogin(
                selectedChildId,
                document.getElementById('cloud-login-username').value,
                document.getElementById('cloud-login-pin').value
            );
            document.getElementById('cloud-login-pin').value = '';
            const child = selectedChild();
            if (child) child.kid_username = document.getElementById('cloud-login-username').value.trim().toLowerCase();
            renderChildren(children);
            showMessage(
                document.getElementById('cloud-banking-message'),
                'Kid sign-in saved. Any previous kid session has been signed out.'
            );
        } catch (error) {
            showMessage(document.getElementById('cloud-banking-message'), bankingErrorMessage(error), true);
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('cloud-kid-spend-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const childId = childDashboardData?.child?.id;
        const key = `${childId}:kid-spend`;
        if (!pendingRequestIds.has(key)) pendingRequestIds.set(key, window.crypto.randomUUID());
        runKidAction(() => banking.childSpend(childSessionToken, {
            amount: document.getElementById('cloud-kid-spend-amount').value,
            account: document.getElementById('cloud-kid-spend-account').value,
            category: 'spending',
            title: document.getElementById('cloud-kid-spend-title').value,
            requestId: pendingRequestIds.get(key)
        }), 'Purchase recorded.', key).then((success) => { if (success) form.reset(); });
    });

    document.getElementById('cloud-kid-transfer-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const childId = childDashboardData?.child?.id;
        const key = `${childId}:kid-transfer`;
        if (!pendingRequestIds.has(key)) pendingRequestIds.set(key, window.crypto.randomUUID());
        runKidAction(() => banking.childTransfer(childSessionToken, {
            amount: document.getElementById('cloud-kid-transfer-amount').value,
            fromAccount: document.getElementById('cloud-kid-transfer-from').value,
            toAccount: document.getElementById('cloud-kid-transfer-to').value,
            requestId: pendingRequestIds.get(key)
        }), 'Transfer completed.', key).then((success) => { if (success) form.reset(); });
    });

    document.getElementById('cloud-kid-refresh').addEventListener('click', () => {
        runKidAction(async () => {}, 'Balances and activity refreshed.');
    });

    childList.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-child-id]');
        if (!button || isBusy || button.dataset.childId === selectedChildId) return;
        selectedChildId = button.dataset.childId;
        renderChildren(children);
        setBusy(true);
        showMessage(document.getElementById('cloud-banking-message'), '');
        try {
            await refreshBanking();
        } catch (error) {
            showMessage(document.getElementById('cloud-banking-message'), error.message, true);
        } finally {
            setBusy(false);
        }
    });

    document.getElementById('cloud-refresh-bank').addEventListener('click', () => {
        runBankingAction(async () => {}, 'Balances and activity refreshed.');
    });

    document.getElementById('cloud-spend-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const request = requestIdFor('spend');
        runBankingAction((childId) => banking.spend(childId, {
            amount: document.getElementById('cloud-spend-amount').value,
            account: document.getElementById('cloud-spend-account').value,
            category: document.getElementById('cloud-spend-category').value,
            title: document.getElementById('cloud-spend-title').value,
            requestId: request.id
        }), 'Purchase recorded.', request.key).then((success) => { if (success) form.reset(); });
    });

    document.getElementById('cloud-transfer-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const request = requestIdFor('transfer');
        runBankingAction((childId) => banking.transfer(childId, {
            amount: document.getElementById('cloud-transfer-amount').value,
            fromAccount: document.getElementById('cloud-transfer-from').value,
            toAccount: document.getElementById('cloud-transfer-to').value,
            requestId: request.id
        }), 'Transfer completed.', request.key).then((success) => { if (success) form.reset(); });
    });

    document.getElementById('cloud-credit-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const request = requestIdFor('credit');
        runBankingAction((childId) => banking.credit(childId, {
            amount: document.getElementById('cloud-credit-amount').value,
            account: document.getElementById('cloud-credit-account').value,
            bonus: document.getElementById('cloud-credit-kind').value === 'bonus',
            title: document.getElementById('cloud-credit-title').value,
            requestId: request.id
        }), 'Guardian credit added.', request.key).then((success) => { if (success) form.reset(); });
    });

    document.getElementById('cloud-allowance-config-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = document.getElementById('cloud-allowance-amount').value;
        const savingsPercent = document.getElementById('cloud-allowance-savings').value;
        await runBankingAction(async (childId) => {
            await banking.setAllowance(childId, amount, savingsPercent);
        }, 'Allowance settings saved.');
    });

    document.getElementById('cloud-allowance-pay-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const note = document.getElementById('cloud-allowance-note').value;
        const request = requestIdFor('allowance');
        runBankingAction(
            (childId) => banking.payAllowance(childId, note, request.id),
            'Monthly allowance paid.',
            request.key
        );
    });

    transactionList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-transaction-id]');
        if (!button || isBusy) return;
        const confirmed = window.confirm('Undo this transaction? This will create a reversal entry in the ledger.');
        if (!confirmed) return;
        const request = requestIdFor(`reverse:${button.dataset.transactionId}`);
        runBankingAction(
            (childId) => banking.reverse(childId, button.dataset.transactionId, request.id),
            'Transaction reversed.',
            request.key
        );
    });

    signOutButton.addEventListener('click', async () => {
        if (isBusy) return;
        setBusy(true);
        try {
            if (childSessionToken) {
                await banking.childSignOut(childSessionToken);
                sessionStorage.removeItem('kidsBankChildSession');
                childSessionToken = null;
                childDashboardData = null;
                pendingRequestIds.clear();
                showKidSignIn('You are signed out.');
                return;
            }
            const { error } = await client.auth.signOut();
            if (error) throw error;
            showSignedOut();
            setAuthMode(false);
        } catch (error) {
            showMessage(childSessionToken ? document.getElementById('cloud-kid-message') : familyMessage, error.message, true);
        } finally {
            setBusy(false);
        }
    });

    const storedChildSession = sessionStorage.getItem('kidsBankChildSession');
    if (storedChildSession) {
        loadKidDashboard(storedChildSession).catch((error) => {
            sessionStorage.removeItem('kidsBankChildSession');
            childSessionToken = null;
            childDashboardData = null;
            const message = /child session expired/i.test(error?.message || '')
                ? 'Your session ended. Sign in again.'
                : bankingErrorMessage(error);
            showKidSignIn(message, true);
        });
    } else client.auth.getSession().then(({ data, error }) => {
        if (error) {
            showMessage(authMessage, error.message, true);
            return;
        }
        if (data.session) loadFamily(data.session.user);
    }).catch((error) => showMessage(authMessage, error.message, true));

    client.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_OUT' || !session) && !isEnteringKidMode && !childSessionToken) {
            showSignedOut();
        }
    });
})();

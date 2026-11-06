(() => {
    const config = window.KIDS_BANK_SUPABASE_CONFIG;
    const supabaseSdk = window.supabase;
    const cloudApp = document.getElementById('cloud-app');
    const authPanel = document.getElementById('cloud-auth-panel');
    const familyPanel = document.getElementById('cloud-family-panel');
    const authForm = document.getElementById('cloud-auth-form');
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

    if (!supabaseSdk || typeof supabaseSdk.createClient !== 'function') {
        authPanel.hidden = false;
        familyPanel.hidden = true;
        authToggle.hidden = true;
        authSubmit.disabled = true;
        showMessage(authMessage, 'The Supabase client library failed to load. Reload the page or try again later.', true);
        return;
    }

    const client = supabaseSdk.createClient(config.url, config.publishableKey);

    let isSignUp = false;
    let currentUser = null;
    let isBusy = false;

    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle('cloud-error', isError);
    }

    function setBusy(busy) {
        isBusy = busy;
        [authSubmit, signOutButton, document.getElementById('cloud-child-submit')].forEach((button) => {
            button.disabled = busy;
        });
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
        familyPanel.hidden = true;
        signOutButton.hidden = true;
        childList.replaceChildren();
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
            addText(childList, 'p', 'cloud-help', 'No child profiles yet. Add one below to get started.');
            return;
        }

        children.forEach((child) => {
            const card = document.createElement('article');
            card.className = 'cloud-child-card';
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
            childList.appendChild(card);
        });
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
            const { data: children, error } = await client
                .from('children')
                .select('id, child_name, first_name, last_name, school, checking_balance, savings_balance')
                .order('created_at', { ascending: true });
            if (error) throw error;

            currentUser = user;
            guardianEmail.textContent = user.email || '';
            renderChildren(children || []);
            authPanel.hidden = true;
            familyPanel.hidden = false;
            signOutButton.hidden = false;
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
            const { error } = await client.rpc('create_kids_bank_child', {
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
            childForm.reset();
            const familyLoaded = await loadFamily(currentUser);
            if (!familyLoaded) return;
            showMessage(familyMessage, 'Child profile created.');
        } catch (error) {
            showMessage(childError, error.message, true);
        } finally {
            setBusy(false);
        }
    });

    signOutButton.addEventListener('click', async () => {
        if (isBusy) return;
        setBusy(true);
        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;
            showSignedOut();
            setAuthMode(false);
        } catch (error) {
            showMessage(familyMessage, error.message, true);
        } finally {
            setBusy(false);
        }
    });

    client.auth.getSession().then(({ data, error }) => {
        if (error) {
            showMessage(authMessage, error.message, true);
            return;
        }
        if (data.session) loadFamily(data.session.user);
    }).catch((error) => showMessage(authMessage, error.message, true));

    client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) showSignedOut();
    });
})();

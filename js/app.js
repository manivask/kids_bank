/**
 * Kids Banking App Main UI Controller (v2.0)
 * 
 * Scaled for 50+ kids in parallel, full registration & login with (username + 4-digit PIN),
 * auto-logout after 5 minutes of inactivity, in-app parent credit/job bonus authorization.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Application State
    const state = {
        kids: [],
        currentKid: null,
        parentModeActive: false,
        activeAuthTab: 'login', // 'login' | 'register' | 'directory'
        selectedRegisterAvatar: '🦁',
        parentPinBuffer: '',
        activeDashFilter: 'all',
        selectedSpendCategory: null,
        soundEnabled: true,
        // Inactivity Timer State (5 minutes default)
        sessionTimeoutMinutes: 5,
        sessionSecondsRemaining: 300,
        inactivityInterval: null
    };

    // DOM Elements Cache
    const el = {
        // App Views
        viewChildLogin: document.getElementById('view-child-login'),
        viewChildDashboard: document.getElementById('view-child-dashboard'),
        viewParentPortal: document.getElementById('view-parent-portal'),

        // Top Navigation & Session Bar
        btnBrandHome: document.getElementById('btn-brand-home'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnParentZone: document.getElementById('btn-parent-zone'),
        navModeLabel: document.getElementById('nav-mode-label'),
        btnSessionLogout: document.getElementById('btn-session-logout'),
        sessionTimerPill: document.getElementById('session-timer-pill'),
        sessionTimeLeft: document.getElementById('session-time-left'),

        // Auth Tabs & Switcher
        tabLoginBtn: document.getElementById('tab-login-btn'),
        tabRegisterBtn: document.getElementById('tab-register-btn'),
        tabDirectoryBtn: document.getElementById('tab-directory-btn'),
        authBoxLogin: document.getElementById('auth-box-login'),
        authBoxRegister: document.getElementById('auth-box-register'),
        authBoxDirectory: document.getElementById('auth-box-directory'),

        // Form: Kid Login
        formKidLogin: document.getElementById('form-kid-login'),
        loginUsername: document.getElementById('login-username'),
        loginPin: document.getElementById('login-pin'),
        loginErrorMsg: document.getElementById('login-error-msg'),

        // Form: Kid Register
        formKidRegister: document.getElementById('form-kid-register'),
        regFirstName: document.getElementById('reg-first-name'),
        regLastName: document.getElementById('reg-last-name'),
        regSchool: document.getElementById('reg-school'),
        regParent1FirstName: document.getElementById('reg-parent1-first-name'),
        regParent1LastName: document.getElementById('reg-parent1-last-name'),
        regParent2FirstName: document.getElementById('reg-parent2-first-name'),
        regParent2LastName: document.getElementById('reg-parent2-last-name'),
        regEmail: document.getElementById('reg-email'),
        regDob: document.getElementById('reg-dob'),
        regUsername: document.getElementById('reg-username'),
        regPin: document.getElementById('reg-pin'),
        registerErrorMsg: document.getElementById('register-error-msg'),
        avatarPickerOptions: document.getElementById('avatar-picker-options'),

        // Directory
        directoryKidsGrid: document.getElementById('directory-kids-grid'),
        directorySearchInput: document.getElementById('directory-search-input'),
        directoryTotalBadge: document.getElementById('directory-total-badge'),

        // Child Dashboard Elements
        dashAvatar: document.getElementById('dash-avatar'),
        dashName: document.getElementById('dash-name'),
        dashUsernameBadge: document.getElementById('dash-username-badge'),
        dashSchoolName: document.getElementById('dash-school-name'),
        dashParentName: document.getElementById('dash-parent-name'),
        dashCheckingBalance: document.getElementById('dash-checking-balance'),
        dashSavingsBalance: document.getElementById('dash-savings-balance'),
        dashGoalTitle: document.getElementById('dash-goal-title'),
        dashGoalProgressText: document.getElementById('dash-goal-progress-text'),
        dashGoalProgressFill: document.getElementById('dash-goal-progress-fill'),
        dashTransactionsList: document.getElementById('dash-transactions-list'),
        btnDashLogout: document.getElementById('btn-dash-logout'),
        btnOpenSpend: document.getElementById('btn-open-spend'),
        btnOpenTransfer: document.getElementById('btn-open-transfer'),
        btnEditGoal: document.getElementById('btn-edit-goal'),

        // In-App Parent Credit inside Kid View
        btnOpenParentCreditModal: document.getElementById('btn-open-parent-credit-modal'),
        modalKidParentCredit: document.getElementById('modal-kid-parent-credit'),
        formKidParentCredit: document.getElementById('form-kid-parent-credit'),
        pCreditKidName: document.getElementById('p-credit-kid-name'),
        pCreditTypeSelect: document.getElementById('p-credit-type-select'),
        pCreditChorePickerGroup: document.getElementById('p-credit-chore-picker-group'),
        pCreditChoreSelect: document.getElementById('p-credit-chore-select'),
        pCreditAmountInput: document.getElementById('p-credit-amount-input'),
        pCreditNoteInput: document.getElementById('p-credit-note-input'),
        pCreditParentPin: document.getElementById('p-credit-parent-pin'),
        pCreditErrorMsg: document.getElementById('p-credit-error-msg'),
        btnCloseKidParentCredit: document.getElementById('btn-close-kid-parent-credit'),
        btnCancelKidParentCredit: document.getElementById('btn-cancel-kid-parent-credit'),

        // Parent Portal
        btnExitParentMode: document.getElementById('btn-exit-parent-mode'),
        parentKidsList: document.getElementById('parent-kids-list'),
        parentKidsSearch: document.getElementById('parent-kids-search'),
        parentKidsCountBadge: document.getElementById('parent-kids-count-badge'),
        parentChoresGrid: document.getElementById('parent-chores-grid'),
        awardTargetKid: document.getElementById('award-target-kid'),
        auditFilterKid: document.getElementById('audit-filter-kid'),
        auditTableBody: document.getElementById('audit-table-body'),
        btnAwardCustomBonus: document.getElementById('btn-award-custom-bonus'),
        customBonusTitle: document.getElementById('custom-bonus-title'),
        customBonusAmount: document.getElementById('custom-bonus-amount'),
        customBonusAccount: document.getElementById('custom-bonus-account'),
        inputNewParentPin: document.getElementById('input-new-parent-pin'),
        btnSaveParentPin: document.getElementById('btn-save-parent-pin'),
        selectSessionTimeout: document.getElementById('select-session-timeout'),
        btnExportJson: document.getElementById('btn-export-json'),
        btnTriggerImport: document.getElementById('btn-trigger-import'),
        fileImportInput: document.getElementById('file-import-input'),
        btnResetDefaults: document.getElementById('btn-reset-defaults'),

        // Parent PIN Modal
        modalParentGate: document.getElementById('modal-parent-gate'),
        btnCloseParentGate: document.getElementById('btn-close-parent-gate'),
        parentGateDots: document.getElementById('parent-gate-dots'),
        btnSubmitParentPin: document.getElementById('btn-submit-parent-pin'),
        btnQuickParentDemo: document.getElementById('btn-quick-parent-demo'),

        // Spend & Transfer Modals
        modalSpend: document.getElementById('modal-spend'),
        formSpend: document.getElementById('form-spend'),
        spendAccountSelect: document.getElementById('spend-account-select'),
        spendCategoryGrid: document.getElementById('spend-category-grid'),
        spendAmountInput: document.getElementById('spend-amount-input'),
        spendNoteInput: document.getElementById('spend-note-input'),
        spendErrorMsg: document.getElementById('spend-error-msg'),
        btnCloseSpend: document.getElementById('btn-close-spend'),
        btnCancelSpend: document.getElementById('btn-cancel-spend'),

        modalTransfer: document.getElementById('modal-transfer'),
        formTransfer: document.getElementById('form-transfer'),
        transferFrom: document.getElementById('transfer-from'),
        transferTo: document.getElementById('transfer-to'),
        transferAmount: document.getElementById('transfer-amount'),
        transferNote: document.getElementById('transfer-note'),
        transferErrorMsg: document.getElementById('transfer-error-msg'),
        btnTransferAll: document.getElementById('btn-transfer-all'),
        btnCloseTransfer: document.getElementById('btn-close-transfer'),
        btnCancelTransfer: document.getElementById('btn-cancel-transfer'),

        modalGoal: document.getElementById('modal-goal'),
        formGoal: document.getElementById('form-goal'),
        goalTitleInput: document.getElementById('goal-title-input'),
        goalTargetInput: document.getElementById('goal-target-input'),
        btnCloseGoal: document.getElementById('btn-close-goal'),
        btnCancelGoal: document.getElementById('btn-cancel-goal'),

        modalParentDeposit: document.getElementById('modal-parent-deposit'),
        formParentDeposit: document.getElementById('form-parent-deposit'),
        pDepositKidId: document.getElementById('p-deposit-kid-id'),
        pDepositAmount: document.getElementById('p-deposit-amount'),
        pDepositType: document.getElementById('p-deposit-type'),
        btnClosePDeposit: document.getElementById('btn-close-p-deposit'),
        btnCancelPDeposit: document.getElementById('btn-cancel-p-deposit'),

        toastContainer: document.getElementById('toast-container')
    };

    // Initialize Store
    await window.kidsBankStore.init();
    await refreshState();
    initInactivityTimer();

    // =========================================================================
    // Inactivity Session Engine (5-Minute Auto-Logout)
    // =========================================================================
    function initInactivityTimer() {
        // Reset timer on any user activity
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        activityEvents.forEach(evt => {
            window.addEventListener(evt, () => resetInactivityTimer(), { passive: true });
        });

        // Start countdown tick every second
        if (state.inactivityInterval) clearInterval(state.inactivityInterval);
        state.inactivityInterval = setInterval(handleInactivityTick, 1000);
    }

    function resetInactivityTimer() {
        state.sessionSecondsRemaining = state.sessionTimeoutMinutes * 60;
        updateTimerDisplay();
    }

    function handleInactivityTick() {
        const isSessionActive = Boolean(state.currentKid || state.parentModeActive);
        if (!isSessionActive) {
            el.sessionTimerPill.style.display = 'none';
            return;
        }

        el.sessionTimerPill.style.display = 'inline-flex';
        state.sessionSecondsRemaining--;

        updateTimerDisplay();

        // 30-Second Warning Toast
        if (state.sessionSecondsRemaining === 30) {
            window.soundFX.playError();
            showToast('⚠️ Inactivity Warning: Session will auto-logout in 30 seconds!', 'error');
            el.sessionTimerPill.classList.add('warning');
        }

        // Time Expired -> Automatic Logout
        if (state.sessionSecondsRemaining <= 0) {
            performAutoLogout();
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(Math.max(0, state.sessionSecondsRemaining) / 60);
        const seconds = Math.max(0, state.sessionSecondsRemaining) % 60;
        el.sessionTimeLeft.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

        if (state.sessionSecondsRemaining > 30) {
            el.sessionTimerPill.classList.remove('warning');
        }
    }

    function performAutoLogout() {
        const whoWasLoggedIn = state.currentKid ? state.currentKid.name : 'Parent';
        state.currentKid = null;
        state.parentModeActive = false;
        closeAllModals();
        switchView('login');
        window.soundFX.playSpend();
        showToast(`🔒 Auto-Logged Out due to 5 minutes of inactivity. Safe banking!`, 'info');
        console.log(`[KidsBank] Auto-logout triggered for ${whoWasLoggedIn}`);
    }

    function manualLogout() {
        state.currentKid = null;
        state.parentModeActive = false;
        closeAllModals();
        switchView('login');
        window.soundFX.playTap();
        showToast('You have safely logged out. See you soon! 👋', 'info');
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    // Header Logout Button
    el.btnSessionLogout.addEventListener('click', manualLogout);
    el.btnDashLogout.addEventListener('click', manualLogout);

    // =========================================================================
    // UI Helpers & Notifications
    // =========================================================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-bubble toast-${type}`;
        toast.innerHTML = message;
        el.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 320);
        }, 3200);
    }

    function formatMoney(amount) {
        const num = parseFloat(amount) || 0;
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function switchView(viewName) {
        el.viewChildLogin.classList.remove('active');
        el.viewChildDashboard.classList.remove('active');
        el.viewParentPortal.classList.remove('active');

        if (viewName === 'login') {
            el.viewChildLogin.classList.add('active');
            state.parentModeActive = false;
            el.btnParentZone.style.display = 'none';
            el.btnParentZone.classList.remove('active');
            el.navModeLabel.textContent = 'Parent Zone';
            el.btnSessionLogout.style.display = 'none';
            el.sessionTimerPill.style.display = 'none';
        } else if (viewName === 'dashboard') {
            el.viewChildDashboard.classList.add('active');
            state.parentModeActive = false;
            el.btnParentZone.style.display = 'inline-flex';
            el.btnParentZone.classList.remove('active');
            el.navModeLabel.textContent = 'Parent Zone';
            el.btnSessionLogout.style.display = 'inline-flex';
            resetInactivityTimer();
        } else if (viewName === 'parent') {
            el.viewParentPortal.classList.add('active');
            state.parentModeActive = true;
            el.btnParentZone.style.display = 'inline-flex';
            el.btnParentZone.classList.add('active');
            el.navModeLabel.textContent = 'Kids View';
            el.btnSessionLogout.style.display = 'inline-flex';
            resetInactivityTimer();
        }
    }

    async function refreshState() {
        state.kids = await window.kidsBankStore.getKids();
        const settings = await window.kidsBankStore.getSettings();
        state.soundEnabled = settings.soundEnabled !== false;
        state.sessionTimeoutMinutes = settings.inactivityTimeoutMinutes || 5;
        window.soundFX.setEnabled(state.soundEnabled);
        el.btnSoundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';

        if (state.currentKid) {
            state.currentKid = state.kids.find(k => k.id === state.currentKid.id) || null;
        }

        renderKidsDirectory();
        if (state.currentKid && el.viewChildDashboard.classList.contains('active')) {
            renderChildDashboard();
        }
        if (el.viewParentPortal.classList.contains('active')) {
            renderParentDashboard();
        }
    }

    // Brand Logo Click -> Return to Home or Dashboard
    el.btnBrandHome.addEventListener('click', () => {
        window.soundFX.playTap();
        if (state.currentKid) {
            switchView('dashboard');
        } else if (state.parentModeActive) {
            switchView('parent');
        } else {
            switchView('login');
        }
    });

    // Sound FX Toggle
    el.btnSoundToggle.addEventListener('click', async () => {
        state.soundEnabled = !state.soundEnabled;
        window.soundFX.setEnabled(state.soundEnabled);
        await window.kidsBankStore.updateSettings({ soundEnabled: state.soundEnabled });
        el.btnSoundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
        if (state.soundEnabled) {
            window.soundFX.playCoin();
            showToast('🔊 Sound Effects Enabled', 'info');
        } else {
            showToast('🔇 Sound Effects Muted', 'info');
        }
    });

    // =========================================================================
    // AUTH TABS: LOGIN vs REGISTER vs DIRECTORY
    // =========================================================================
    function setAuthTab(tab) {
        state.activeAuthTab = tab;
        el.tabLoginBtn.classList.toggle('active', tab === 'login');
        el.tabRegisterBtn.classList.toggle('active', tab === 'register');
        el.tabDirectoryBtn.classList.toggle('active', tab === 'directory');

        el.authBoxLogin.style.display = tab === 'login' ? 'block' : 'none';
        el.authBoxRegister.style.display = tab === 'register' ? 'block' : 'none';
        el.authBoxDirectory.style.display = tab === 'directory' ? 'block' : 'none';

        if (tab === 'login') {
            el.loginUsername.focus();
        } else if (tab === 'directory') {
            renderKidsDirectory();
        }
    }

    el.tabLoginBtn.addEventListener('click', () => { window.soundFX.playTap(); setAuthTab('login'); });
    el.tabRegisterBtn.addEventListener('click', () => { window.soundFX.playTap(); setAuthTab('register'); });
    el.tabDirectoryBtn.addEventListener('click', () => { window.soundFX.playTap(); setAuthTab('directory'); });

    // Quick Demo Pills on Login Form
    document.querySelectorAll('.btn-demo-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            el.loginUsername.value = btn.getAttribute('data-demouser');
            el.loginPin.value = btn.getAttribute('data-demopin');
            el.formKidLogin.dispatchEvent(new Event('submit'));
        });
    });

    // =========================================================================
    // 1. KID LOGIN HANDLER (Username & 4-Digit PIN)
    // =========================================================================
    el.formKidLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.loginErrorMsg.style.display = 'none';

        const username = el.loginUsername.value.trim();
        const pin = el.loginPin.value.trim();

        if (!username) {
            showLoginError('Please enter your login username.');
            return;
        }
        if (!pin || pin.length < 4) {
            showLoginError('Please enter your 4-digit PIN.');
            return;
        }

        const authResult = await window.kidsBankStore.authenticateKid(username, pin);
        if (authResult.success) {
            state.currentKid = authResult.kid;
            window.soundFX.playCoin();
            window.confettiFX.burst({ count: 60 });
            showToast(`Welcome back, ${state.currentKid.name}! 🌟 Logged in successfully.`, 'success');
            el.loginPin.value = '';
            switchView('dashboard');
            renderChildDashboard();
        } else {
            window.soundFX.playError();
            showLoginError(authResult.message);
        }
    });

    function showLoginError(msg) {
        el.loginErrorMsg.textContent = msg;
        el.loginErrorMsg.style.display = 'block';
    }

    // =========================================================================
    // 2. KID REGISTRATION HANDLER
    // =========================================================================
    // Avatar selection choices
    document.querySelectorAll('.btn-avatar-choice').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            document.querySelectorAll('.btn-avatar-choice').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedRegisterAvatar = btn.getAttribute('data-av');
        });
    });

    el.formKidRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.registerErrorMsg.style.display = 'none';

        const firstName = el.regFirstName.value.trim();
        const lastName = el.regLastName.value.trim();
        const school = el.regSchool.value.trim();
        const parent1FirstName = el.regParent1FirstName.value.trim();
        const parent1LastName = el.regParent1LastName.value.trim();
        const parent2FirstName = el.regParent2FirstName.value.trim();
        const parent2LastName = el.regParent2LastName.value.trim();
        const email = el.regEmail.value.trim();
        const dob = el.regDob.value;
        const username = el.regUsername.value.trim().toLowerCase();
        const pin = el.regPin.value.trim();

        try {
            const newKid = await window.kidsBankStore.registerKid({
                firstName,
                lastName,
                school,
                parent1FirstName,
                parent1LastName,
                parent2FirstName,
                parent2LastName,
                email,
                dob,
                username,
                pin,
                avatar: state.selectedRegisterAvatar
            });

            window.soundFX.playFanfare();
            window.confettiFX.burst({ count: 90 });
            showToast(`🎉 Account Created for ${newKid.name}! You received a $25 bonus!`, 'success');

            // Automatically login as the newly registered kid!
            state.currentKid = newKid;
            el.formKidRegister.reset();
            await refreshState();
            switchView('dashboard');
            renderChildDashboard();
        } catch (err) {
            window.soundFX.playError();
            el.registerErrorMsg.textContent = err.message;
            el.registerErrorMsg.style.display = 'block';
        }
    });

    // =========================================================================
    // 3. KIDS DIRECTORY (Scalable to 50+ kids in parallel)
    // =========================================================================
    function renderKidsDirectory(filterQuery = '') {
        const query = (filterQuery || el.directorySearchInput.value || '').trim().toLowerCase();
        const filtered = state.kids.filter(k => {
            if (!query) return true;
            return (
                (k.name && k.name.toLowerCase().includes(query)) ||
                (k.username && k.username.toLowerCase().includes(query)) ||
                (k.school && k.school.toLowerCase().includes(query)) ||
                (k.parentName && k.parentName.toLowerCase().includes(query))
            );
        });

        el.directoryTotalBadge.textContent = `${state.kids.length} Registered Kids (${filtered.length} shown)`;
        el.directoryKidsGrid.innerHTML = '';

        if (filtered.length === 0) {
            el.directoryKidsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
                    No kid accounts matched "${query}".
                </div>
            `;
            return;
        }

        filtered.forEach(kid => {
            const tile = document.createElement('div');
            tile.className = 'directory-kid-tile';
            tile.innerHTML = `
                <div class="dir-tile-left">
                    <div class="dir-avatar">${kid.avatar || '🦁'}</div>
                    <div>
                        <div class="dir-name">${kid.name}</div>
                        <div class="dir-username">@${kid.username}</div>
                        <div class="dir-school">${kid.school || 'School'}</div>
                    </div>
                </div>
                <button type="button" class="btn-dir-select" data-user="${kid.username}" data-pin="${kid.pin}">
                    Select 🔑
                </button>
            `;

            tile.querySelector('.btn-dir-select').addEventListener('click', () => {
                window.soundFX.playTap();
                setAuthTab('login');
                el.loginUsername.value = kid.username;
                el.loginPin.value = kid.pin;
                el.loginPin.focus();
                showToast(`Filled credentials for ${kid.name} (@${kid.username})! Press Sign In.`, 'info');
            });

            el.directoryKidsGrid.appendChild(tile);
        });
    }

    el.directorySearchInput.addEventListener('input', (e) => {
        renderKidsDirectory(e.target.value);
    });

    // =========================================================================
    // CHILD DASHBOARD RENDERING
    // =========================================================================
    function renderChildDashboard() {
        if (!state.currentKid) return;
        const kid = state.currentKid;

        el.dashAvatar.textContent = kid.avatar || '🦁';
        el.dashName.textContent = kid.name;
        el.dashUsernameBadge.textContent = `@${kid.username || 'kid'}`;
        el.dashSchoolName.textContent = kid.school || 'Elementary School';
        el.dashParentName.textContent = kid.parentName || 'Parent / Guardian';

        el.dashCheckingBalance.textContent = formatMoney(kid.checkingBalance);
        el.dashSavingsBalance.textContent = formatMoney(kid.savingsBalance);

        // Savings Goal
        const goal = kid.savingsGoal || { title: 'New Goal', targetAmount: 50 };
        const target = Math.max(1, goal.targetAmount);
        const percent = Math.min(100, Math.round((kid.savingsBalance / target) * 100));

        el.dashGoalTitle.textContent = goal.title;
        el.dashGoalProgressText.textContent = `${formatMoney(kid.savingsBalance)} / ${formatMoney(target)} (${percent}%)`;
        el.dashGoalProgressFill.style.width = `${percent}%`;

        renderTransactionsList();
    }

    function renderTransactionsList() {
        if (!state.currentKid) return;
        const txns = state.currentKid.transactions || [];
        const filter = state.activeDashFilter;

        const filtered = txns.filter(t => {
            if (filter === 'all') return true;
            if (filter === 'spend') return t.type === 'spend';
            if (filter === 'allowance') return t.category === 'allowance';
            if (filter === 'chore') return t.category === 'chore' || t.type === 'bonus';
            if (filter === 'transfer') return t.type === 'transfer';
            return true;
        });

        el.dashTransactionsList.innerHTML = '';

        if (filtered.length === 0) {
            el.dashTransactionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <p style="font-weight: 700;">No transactions yet!</p>
                    <p style="font-size: 0.9rem;">Transactions will appear here when you spend, save, or receive allowances & bonuses.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(txn => {
            const item = document.createElement('div');
            item.className = 'txn-item';

            let icon = '💵';
            let amountClass = 'positive';
            let sign = '+';

            if (txn.type === 'spend') {
                icon = '🛍️';
                amountClass = 'negative';
                sign = '-';
            } else if (txn.type === 'transfer') {
                icon = '🔄';
                amountClass = 'transfer';
                sign = '';
            } else if (txn.type === 'bonus') {
                icon = '🌟';
            }

            const formattedDate = new Date(txn.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="txn-left">
                    <div class="txn-icon">${icon}</div>
                    <div>
                        <div class="txn-title">${txn.title}</div>
                        <div class="txn-meta">${formattedDate} • ${txn.note || (txn.account === 'savings' ? 'Piggy Bank' : 'Wallet')}</div>
                    </div>
                </div>
                <div class="txn-amount ${amountClass}">
                    ${sign}${formatMoney(txn.amount)}
                </div>
            `;

            el.dashTransactionsList.appendChild(item);
        });
    }

    // Dashboard Transaction Filter Pills
    document.querySelectorAll('.btn-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            document.querySelectorAll('.btn-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeDashFilter = btn.getAttribute('data-filter');
            renderTransactionsList();
        });
    });

    // =========================================================================
    // IN-APP PARENT CREDIT & BONUS (Authorized inside Kid's view)
    // =========================================================================
    el.btnOpenParentCreditModal.addEventListener('click', async () => {
        if (!state.currentKid) return;
        window.soundFX.playTap();
        el.pCreditErrorMsg.style.display = 'none';
        el.pCreditParentPin.value = '';
        el.pCreditKidName.textContent = `${state.currentKid.name} (@${state.currentKid.username})`;
        el.pCreditAmountInput.value = '10.00';
        el.pCreditNoteInput.value = '';

        // Populate chores in dropdown
        const chores = await window.kidsBankStore.getChores();
        el.pCreditChoreSelect.innerHTML = '';
        chores.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.icon} ${c.title} (+$${c.reward.toFixed(2)})`;
            el.pCreditChoreSelect.appendChild(opt);
        });

        el.pCreditTypeSelect.dispatchEvent(new Event('change'));
        el.modalKidParentCredit.classList.add('active');
    });

    el.pCreditTypeSelect.addEventListener('change', () => {
        const val = el.pCreditTypeSelect.value;
        el.pCreditChorePickerGroup.style.display = val === 'job_bonus' ? 'block' : 'none';
        if (val === 'monthly_credit') {
            el.pCreditAmountInput.value = (state.currentKid && state.currentKid.allowance ? state.currentKid.allowance.amount : 10).toFixed(2);
        } else if (val === 'job_bonus') {
            el.pCreditAmountInput.value = '5.00';
        }
    });

    el.pCreditChoreSelect.addEventListener('change', async () => {
        const choreId = el.pCreditChoreSelect.value;
        const chores = await window.kidsBankStore.getChores();
        const chore = chores.find(c => c.id === choreId);
        if (chore) {
            el.pCreditAmountInput.value = chore.reward.toFixed(2);
        }
    });

    el.btnCloseKidParentCredit.addEventListener('click', () => el.modalKidParentCredit.classList.remove('active'));
    el.btnCancelKidParentCredit.addEventListener('click', () => el.modalKidParentCredit.classList.remove('active'));

    el.formKidParentCredit.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.pCreditErrorMsg.style.display = 'none';

        const parentPin = el.pCreditParentPin.value.trim();
        const isParentValid = await window.kidsBankStore.verifyParentPin(parentPin);

        if (!isParentValid) {
            window.soundFX.playError();
            el.pCreditErrorMsg.textContent = 'Incorrect Parent Password/PIN. (Default is 9999 or 1234).';
            el.pCreditErrorMsg.style.display = 'block';
            return;
        }

        const type = el.pCreditTypeSelect.value;
        const amount = parseFloat(el.pCreditAmountInput.value);
        const note = el.pCreditNoteInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            el.pCreditErrorMsg.textContent = 'Please enter a valid credit amount greater than 0.';
            el.pCreditErrorMsg.style.display = 'block';
            return;
        }

        try {
            if (type === 'monthly_credit') {
                await window.kidsBankStore.payAllowance(state.currentKid.id, amount, note);
                window.soundFX.playFanfare();
                window.confettiFX.burst({ count: 70 });
                showToast(`💵 Added ${formatMoney(amount)} Monthly Allowance Credit to ${state.currentKid.name}!`, 'success');
            } else if (type === 'job_bonus') {
                const choreId = el.pCreditChoreSelect.value;
                await window.kidsBankStore.awardBonus(state.currentKid.id, {
                    choreId,
                    rewardAmount: amount,
                    destinationAccount: 'checking',
                    note: note || 'Parent job bonus'
                });
                window.soundFX.playFanfare();
                window.confettiFX.burst({ count: 70 });
                showToast(`🌟 Awarded ${formatMoney(amount)} Job Bonus to ${state.currentKid.name}!`, 'success');
            } else {
                await window.kidsBankStore.awardBonus(state.currentKid.id, {
                    customTitle: 'Parent Direct Bonus',
                    rewardAmount: amount,
                    destinationAccount: 'checking',
                    note: note || 'Direct parent deposit'
                });
                window.soundFX.playCoin();
                window.confettiFX.burst({ count: 50 });
                showToast(`🎁 Deposited ${formatMoney(amount)} directly to ${state.currentKid.name}'s Wallet!`, 'success');
            }

            el.modalKidParentCredit.classList.remove('active');
            await refreshState();
        } catch (err) {
            window.soundFX.playError();
            el.pCreditErrorMsg.textContent = err.message;
            el.pCreditErrorMsg.style.display = 'block';
        }
    });

    // =========================================================================
    // CHILD: SPEND MONEY MODAL
    // =========================================================================
    el.btnOpenSpend.addEventListener('click', async () => {
        window.soundFX.playTap();
        el.spendErrorMsg.style.display = 'none';
        el.spendAmountInput.value = '';
        el.spendNoteInput.value = '';
        state.selectedSpendCategory = null;

        const categories = await window.kidsBankStore.getCategories();
        el.spendCategoryGrid.innerHTML = '';
        categories.forEach((cat, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `cat-pick-btn ${idx === 0 ? 'selected' : ''}`;
            btn.innerHTML = `<span class="cat-pick-icon">${cat.icon}</span><span>${cat.name}</span>`;
            if (idx === 0) state.selectedSpendCategory = cat.id;

            btn.addEventListener('click', () => {
                window.soundFX.playTap();
                document.querySelectorAll('.cat-pick-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedSpendCategory = cat.id;
            });
            el.spendCategoryGrid.appendChild(btn);
        });

        el.modalSpend.classList.add('active');
    });

    document.querySelectorAll('.btn-quick-amount[data-qval]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            const addVal = parseFloat(btn.getAttribute('data-qval')) || 0;
            const current = parseFloat(el.spendAmountInput.value) || 0;
            el.spendAmountInput.value = (current + addVal).toFixed(2);
        });
    });

    el.btnCloseSpend.addEventListener('click', () => el.modalSpend.classList.remove('active'));
    el.btnCancelSpend.addEventListener('click', () => el.modalSpend.classList.remove('active'));

    el.formSpend.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(el.spendAmountInput.value);
        const account = el.spendAccountSelect.value;
        const note = el.spendNoteInput.value.trim();

        try {
            await window.kidsBankStore.addSpendingTransaction(state.currentKid.id, {
                account,
                amount,
                categoryId: state.selectedSpendCategory || 'other',
                note
            });

            window.soundFX.playSpend();
            el.modalSpend.classList.remove('active');
            showToast(`Spent ${formatMoney(amount)} successfully! 🛍️`, 'info');
            await refreshState();
        } catch (err) {
            window.soundFX.playError();
            el.spendErrorMsg.textContent = err.message;
            el.spendErrorMsg.style.display = 'block';
        }
    });

    // =========================================================================
    // CHILD: MOVE MONEY (TRANSFER) MODAL
    // =========================================================================
    el.btnOpenTransfer.addEventListener('click', () => {
        window.soundFX.playTap();
        el.transferErrorMsg.style.display = 'none';
        el.transferAmount.value = '';
        el.transferNote.value = '';
        el.modalTransfer.classList.add('active');
    });

    el.transferFrom.addEventListener('change', () => {
        el.transferTo.value = el.transferFrom.value === 'checking' ? 'savings' : 'checking';
    });
    el.transferTo.addEventListener('change', () => {
        el.transferFrom.value = el.transferTo.value === 'checking' ? 'savings' : 'checking';
    });

    document.querySelectorAll('.btn-quick-amount[data-tval]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            const addVal = parseFloat(btn.getAttribute('data-tval')) || 0;
            const current = parseFloat(el.transferAmount.value) || 0;
            el.transferAmount.value = (current + addVal).toFixed(2);
        });
    });

    el.btnTransferAll.addEventListener('click', () => {
        window.soundFX.playTap();
        if (!state.currentKid) return;
        const sourceField = el.transferFrom.value === 'savings' ? 'savingsBalance' : 'checkingBalance';
        el.transferAmount.value = (state.currentKid[sourceField] || 0).toFixed(2);
    });

    el.btnCloseTransfer.addEventListener('click', () => el.modalTransfer.classList.remove('active'));
    el.btnCancelTransfer.addEventListener('click', () => el.modalTransfer.classList.remove('active'));

    el.formTransfer.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(el.transferAmount.value);
        const fromAccount = el.transferFrom.value;
        const toAccount = el.transferTo.value;
        const note = el.transferNote.value.trim();

        try {
            await window.kidsBankStore.transferFunds(state.currentKid.id, fromAccount, toAccount, amount, note);
            window.soundFX.playCoin();
            el.modalTransfer.classList.remove('active');
            showToast(`Moved ${formatMoney(amount)} to ${toAccount === 'savings' ? 'Piggy Bank' : 'Wallet'}! 🔄`, 'success');
            await refreshState();
        } catch (err) {
            window.soundFX.playError();
            el.transferErrorMsg.textContent = err.message;
            el.transferErrorMsg.style.display = 'block';
        }
    });

    // =========================================================================
    // CHILD: SAVINGS GOAL EDIT MODAL
    // =========================================================================
    el.btnEditGoal.addEventListener('click', () => {
        window.soundFX.playTap();
        if (!state.currentKid) return;
        const goal = state.currentKid.savingsGoal || { title: 'New Toy', targetAmount: 50 };
        el.goalTitleInput.value = goal.title;
        el.goalTargetInput.value = goal.targetAmount;
        el.modalGoal.classList.add('active');
    });

    el.btnCloseGoal.addEventListener('click', () => el.modalGoal.classList.remove('active'));
    el.btnCancelGoal.addEventListener('click', () => el.modalGoal.classList.remove('active'));

    el.formGoal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = el.goalTitleInput.value.trim();
        const targetAmount = parseFloat(el.goalTargetInput.value) || 50;

        state.currentKid.savingsGoal = { title, targetAmount };
        await window.kidsBankStore.saveKidProfile(state.currentKid);

        window.soundFX.playCoin();
        el.modalGoal.classList.remove('active');
        showToast('Savings goal updated! 🎯 Keep saving!', 'success');
        await refreshState();
    });

    // =========================================================================
    // PARENT ZONE PIN GATE
    // =========================================================================
    function openParentPinModal() {
        state.parentPinBuffer = '';
        updatePinDots(el.parentGateDots, 0);
        el.modalParentGate.classList.add('active');
    }

    el.btnParentZone.addEventListener('click', () => {
        window.soundFX.playTap();
        if (state.parentModeActive) {
            switchView('login');
        } else {
            openParentPinModal();
        }
    });

    el.btnExitParentMode.addEventListener('click', () => {
        window.soundFX.playTap();
        switchView('login');
    });

    el.btnCloseParentGate.addEventListener('click', () => {
        el.modalParentGate.classList.remove('active');
        state.parentPinBuffer = '';
    });

    function updatePinDots(container, count) {
        if (!container) return;
        const dots = container.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < count) dot.classList.add('filled');
            else dot.classList.remove('filled');
        });
    }

    document.querySelectorAll('#parent-gate-keypad .btn-keypad[data-pdigit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-pdigit');
            handleParentPinInput(digit);
        });
    });

    document.getElementById('btn-pgate-clear').addEventListener('click', () => {
        window.soundFX.playTap();
        state.parentPinBuffer = '';
        updatePinDots(el.parentGateDots, 0);
    });

    document.getElementById('btn-pgate-back').addEventListener('click', () => {
        window.soundFX.playTap();
        if (state.parentPinBuffer.length > 0) {
            state.parentPinBuffer = state.parentPinBuffer.slice(0, -1);
            updatePinDots(el.parentGateDots, state.parentPinBuffer.length);
        }
    });

    async function submitParentPin() {
        if (!state.parentPinBuffer || state.parentPinBuffer.length === 0) {
            showToast('Please enter the 4-digit parent passcode.', 'error');
            return;
        }

        const isValid = await window.kidsBankStore.verifyParentPin(state.parentPinBuffer);
        if (isValid) {
            window.soundFX.playSuccessFanfare();
            el.modalParentGate.classList.remove('active');
            state.parentPinBuffer = '';
            updatePinDots(el.parentGateDots, 0);
            showToast('Parent Zone Unlocked 🔑', 'success');
            switchView('parent');
            try {
                renderParentDashboard();
            } catch (err) {
                console.error('[KidsBank] Error rendering parent dashboard', err);
            }
        } else {
            window.soundFX.playError();
            const dots = el.parentGateDots.querySelectorAll('.pin-dot');
            dots.forEach(d => d.classList.add('shake'));
            showToast('Incorrect Parent PIN. (Default: 9999 or 1234)', 'error');
            setTimeout(() => {
                dots.forEach(d => d.classList.remove('shake'));
                state.parentPinBuffer = '';
                updatePinDots(el.parentGateDots, 0);
            }, 400);
        }
    }

    async function handleParentPinInput(digit) {
        if (state.parentPinBuffer.length >= 4) return;
        window.soundFX.playTap();
        state.parentPinBuffer += String(digit);
        updatePinDots(el.parentGateDots, state.parentPinBuffer.length);

        if (state.parentPinBuffer.length === 4) {
            await submitParentPin();
        }
    }

    if (el.btnSubmitParentPin) {
        el.btnSubmitParentPin.addEventListener('click', async () => {
            window.soundFX.playTap();
            await submitParentPin();
        });
    }

    if (el.btnQuickParentDemo) {
        el.btnQuickParentDemo.addEventListener('click', async () => {
            window.soundFX.playTap();
            state.parentPinBuffer = '9999';
            updatePinDots(el.parentGateDots, 4);
            await submitParentPin();
        });
    }

    // Hardware keyboard support for Parent Gate
    window.addEventListener('keydown', (e) => {
        let keyChar = e.key;
        if (/^Numpad[0-9]$/.test(e.code)) {
            keyChar = e.code.replace('Numpad', '');
        }

        if (el.modalParentGate && el.modalParentGate.classList.contains('active')) {
            if (/^[0-9]$/.test(keyChar)) {
                e.preventDefault();
                handleParentPinInput(keyChar);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                document.getElementById('btn-pgate-back').click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                document.getElementById('btn-pgate-clear').click();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                submitParentPin();
            }
        }
    });

    // =========================================================================
    // PARENT PORTAL RENDERING & TABS
    // =========================================================================
    document.querySelectorAll('.parent-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.soundFX.playTap();
            document.querySelectorAll('.parent-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.getAttribute('data-ptab');
            document.querySelectorAll('.parent-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(targetTab).style.display = 'block';
        });
    });

    function renderParentDashboard() {
        populateKidDropdowns();
        renderParentKidsList();
        renderParentChoresCenter();
        renderAuditTable();
    }

    function populateKidDropdowns() {
        el.awardTargetKid.innerHTML = '';
        el.auditFilterKid.innerHTML = '<option value="all">All Children</option>';

        state.kids.forEach(k => {
            const opt1 = document.createElement('option');
            opt1.value = k.id;
            opt1.textContent = `${k.avatar || '🦁'} ${k.name} (@${k.username})`;
            el.awardTargetKid.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = k.id;
            opt2.textContent = `${k.avatar || '🦁'} ${k.name} (@${k.username})`;
            el.auditFilterKid.appendChild(opt2);
        });
    }

    function renderParentKidsList(filterText = '') {
        const query = (filterText || el.parentKidsSearch.value || '').trim().toLowerCase();
        el.parentKidsList.innerHTML = '';

        const filteredKids = state.kids.filter(k => {
            if (!query) return true;
            return (
                (k.name && k.name.toLowerCase().includes(query)) ||
                (k.username && k.username.toLowerCase().includes(query)) ||
                (k.school && k.school.toLowerCase().includes(query)) ||
                (k.parentName && k.parentName.toLowerCase().includes(query))
            );
        });

        el.parentKidsCountBadge.textContent = `${filteredKids.length} / ${state.kids.length} Kids`;

        filteredKids.forEach(kid => {
            const card = document.createElement('div');
            card.className = 'parent-kid-card';
            card.innerHTML = `
                <div class="parent-kid-card-header">
                    <div class="parent-kid-info">
                        <div class="parent-kid-avatar">${kid.avatar || '🦁'}</div>
                        <div>
                            <div class="parent-kid-name">${kid.name} <span style="font-size: 0.85rem; color: var(--primary);">@${kid.username}</span></div>
                            <div class="parent-kid-pin">Child PIN: <strong>${kid.pin}</strong> • DOB: ${kid.dob || 'N/A'}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${kid.school || 'School'} • Parents: ${kid.parentName || 'Parent'}</div>
                        </div>
                    </div>
                </div>

                <div class="parent-kid-balances">
                    <div>
                        <div class="p-bal-label">👛 Wallet (Checking)</div>
                        <div class="p-bal-val">${formatMoney(kid.checkingBalance)}</div>
                    </div>
                    <div>
                        <div class="p-bal-label">🐷 Piggy (Savings)</div>
                        <div class="p-bal-val">${formatMoney(kid.savingsBalance)}</div>
                    </div>
                </div>

                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    Allowance: <strong>${formatMoney(kid.allowance ? kid.allowance.amount : 10)}</strong> (${kid.allowance ? kid.allowance.frequency : 'monthly'})
                    • ${kid.allowance ? kid.allowance.savingsRatioPercent : 30}% to Savings
                </div>

                <div class="parent-kid-card-actions">
                    <button type="button" class="btn-p-action primary btn-pay-allowance" data-kidid="${kid.id}">
                        💵 Pay Monthly Credit
                    </button>
                    <button type="button" class="btn-p-action btn-custom-deposit" data-kidid="${kid.id}">
                        ➕ Add Deposit
                    </button>
                </div>
            `;

            card.querySelector('.btn-pay-allowance').addEventListener('click', async () => {
                window.soundFX.playTap();
                try {
                    await window.kidsBankStore.payAllowance(kid.id);
                    window.soundFX.playFanfare();
                    window.confettiFX.burst({ count: 70 });
                    showToast(`Paid monthly allowance to ${kid.name}: ${formatMoney(kid.allowance ? kid.allowance.amount : 10)}! 💵`, 'success');
                    await refreshState();
                } catch (e) {
                    showToast(e.message, 'error');
                }
            });

            card.querySelector('.btn-custom-deposit').addEventListener('click', () => {
                window.soundFX.playTap();
                el.pDepositKidId.value = kid.id;
                document.getElementById('p-deposit-modal-title').textContent = `Deposit Funds for ${kid.name} 💰`;
                el.pDepositAmount.value = '10.00';
                el.modalParentDeposit.classList.add('active');
            });

            el.parentKidsList.appendChild(card);
        });
    }

    el.parentKidsSearch.addEventListener('input', (e) => {
        renderParentKidsList(e.target.value);
    });

    // Parent Deposit Modal
    el.btnClosePDeposit.addEventListener('click', () => el.modalParentDeposit.classList.remove('active'));
    el.btnCancelPDeposit.addEventListener('click', () => el.modalParentDeposit.classList.remove('active'));

    el.formParentDeposit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const kidId = el.pDepositKidId.value;
        const amount = parseFloat(el.pDepositAmount.value);
        const depType = el.pDepositType.value;

        try {
            if (depType === 'allowance') {
                await window.kidsBankStore.payAllowance(kidId, amount);
            } else {
                const targetAccount = depType === 'savings_only' ? 'savings' : 'checking';
                await window.kidsBankStore.awardBonus(kidId, {
                    customTitle: 'Parent Direct Deposit',
                    rewardAmount: amount,
                    destinationAccount: targetAccount,
                    note: 'Added by parent'
                });
            }

            window.soundFX.playCoin();
            window.confettiFX.burst({ count: 50 });
            el.modalParentDeposit.classList.remove('active');
            showToast(`Deposited ${formatMoney(amount)} successfully!`, 'success');
            await refreshState();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Parent Chore Bonuses Center
    async function renderParentChoresCenter() {
        const chores = await window.kidsBankStore.getChores();
        el.parentChoresGrid.innerHTML = '';

        chores.forEach(chore => {
            const card = document.createElement('div');
            card.className = 'chore-award-card';
            card.innerHTML = `
                <div class="chore-award-left">
                    <span class="chore-icon">${chore.icon}</span>
                    <div>
                        <div class="chore-name">${chore.title}</div>
                        <div class="chore-reward">+${formatMoney(chore.reward)}</div>
                    </div>
                </div>
                <button type="button" class="btn-award-chore" data-choreid="${chore.id}">
                    Award 🎁
                </button>
            `;

            card.querySelector('.btn-award-chore').addEventListener('click', async () => {
                const kidId = el.awardTargetKid.value;
                const kid = state.kids.find(k => k.id === kidId);
                if (!kid) {
                    showToast('Please select a child first.', 'error');
                    return;
                }

                try {
                    await window.kidsBankStore.awardBonus(kidId, {
                        choreId: chore.id,
                        destinationAccount: 'checking'
                    });
                    window.soundFX.playFanfare();
                    window.confettiFX.burst({ count: 60 });
                    showToast(`Awarded ${chore.icon} ${chore.title} (+${formatMoney(chore.reward)}) to ${kid.name}! 🎉`, 'success');
                    await refreshState();
                } catch (e) {
                    showToast(e.message, 'error');
                }
            });

            el.parentChoresGrid.appendChild(card);
        });
    }

    // Award Custom Bonus
    el.btnAwardCustomBonus.addEventListener('click', async () => {
        const title = el.customBonusTitle.value.trim();
        const amount = parseFloat(el.customBonusAmount.value);
        const destinationAccount = el.customBonusAccount.value;
        const kidId = el.awardTargetKid.value;

        if (!title) {
            showToast('Please enter a description for the reward.', 'error');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid reward amount.', 'error');
            return;
        }

        try {
            await window.kidsBankStore.awardBonus(kidId, {
                customTitle: title,
                rewardAmount: amount,
                destinationAccount
            });
            window.soundFX.playFanfare();
            window.confettiFX.burst({ count: 60 });
            const kid = state.kids.find(k => k.id === kidId);
            showToast(`Awarded custom bonus to ${kid ? kid.name : 'child'}! 🎉`, 'success');
            el.customBonusTitle.value = '';
            el.customBonusAmount.value = '';
            await refreshState();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // Parent Master Transaction Audit Table
    function renderAuditTable() {
        const filterKidId = el.auditFilterKid.value;
        el.auditTableBody.innerHTML = '';

        const allTxns = [];
        state.kids.forEach(kid => {
            if (filterKidId === 'all' || filterKidId === kid.id) {
                (kid.transactions || []).forEach(t => {
                    allTxns.push({ ...t, kidName: kid.name, kidAvatar: kid.avatar || '🦁', kidId: kid.id });
                });
            }
        });

        allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allTxns.length === 0) {
            el.auditTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No transactions recorded.
                    </td>
                </tr>
            `;
            return;
        }

        allTxns.slice(0, 100).forEach(txn => {
            const row = document.createElement('tr');
            const dStr = new Date(txn.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            row.innerHTML = `
                <td>${dStr}</td>
                <td><strong>${txn.kidAvatar} ${txn.kidName}</strong></td>
                <td><span style="text-transform: capitalize;">${txn.type}</span></td>
                <td>${txn.account}</td>
                <td>${txn.title} ${txn.note ? `<br><small style="color:var(--text-muted);">${txn.note}</small>` : ''}</td>
                <td style="font-weight: 700; ${txn.type === 'spend' ? 'color:#EF4444;' : 'color:#10B981;'}">
                    ${txn.type === 'spend' ? '-' : '+'}${formatMoney(txn.amount)}
                </td>
                <td>
                    <button type="button" class="btn-delete-txn" data-kidid="${txn.kidId}" data-txnid="${txn.id}">
                        Undo / Delete
                    </button>
                </td>
            `;

            row.querySelector('.btn-delete-txn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to revert transaction "${txn.title}"? This will adjust the balance back.`)) {
                    try {
                        await window.kidsBankStore.deleteTransaction(txn.kidId, txn.id);
                        showToast('Transaction undone & balance restored.', 'info');
                        await refreshState();
                    } catch (e) {
                        showToast(e.message, 'error');
                    }
                }
            });

            el.auditTableBody.appendChild(row);
        });
    }

    el.auditFilterKid.addEventListener('change', () => {
        window.soundFX.playTap();
        renderAuditTable();
    });

    // Parent Settings: Update Parent PIN
    el.btnSaveParentPin.addEventListener('click', async () => {
        const newPin = el.inputNewParentPin.value.trim();
        if (!/^\d{4}$/.test(newPin)) {
            showToast('Parent PIN must be exactly 4 digits.', 'error');
            return;
        }
        await window.kidsBankStore.updateSettings({ parentPin: newPin });
        el.inputNewParentPin.value = '';
        showToast('Parent PIN successfully updated! 🔑', 'success');
    });

    // Parent Settings: Update Inactivity Timeout
    el.selectSessionTimeout.addEventListener('change', async () => {
        const mins = parseInt(el.selectSessionTimeout.value, 10) || 5;
        state.sessionTimeoutMinutes = mins;
        await window.kidsBankStore.updateSettings({ inactivityTimeoutMinutes: mins });
        resetInactivityTimer();
        showToast(`Auto-logout set to ${mins} minutes of inactivity.`, 'info');
    });

    // JSON Export
    el.btnExportJson.addEventListener('click', async () => {
        window.soundFX.playTap();
        const jsonStr = await window.kidsBankStore.exportJson();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kidsbanking_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup JSON downloaded! 📥', 'success');
    });

    // JSON Import
    el.btnTriggerImport.addEventListener('click', () => {
        window.soundFX.playTap();
        el.fileImportInput.click();
    });

    el.fileImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                await window.kidsBankStore.importJson(evt.target.result);
                window.soundFX.playCoin();
                showToast('Data successfully imported from backup! 🚀', 'success');
                await refreshState();
            } catch (err) {
                window.soundFX.playError();
                showToast('Import failed: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    });

    // Reset Defaults
    el.btnResetDefaults.addEventListener('click', async () => {
        if (confirm('Reset Kids Banking App back to factory demo defaults with 50 kids? Current data will be replaced.')) {
            await window.kidsBankStore.resetToDefaults();
            window.soundFX.playCoin();
            showToast('Factory demo data with 50 kids restored.', 'info');
            await refreshState();
        }
    });

    // Default start view
    switchView('login');
    setAuthTab('login');
});

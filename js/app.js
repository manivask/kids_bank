/**
 * KidsBank Main UI Controller
 * Manages views, PIN authentication, animations, modals, transactions, and tablet touch UX.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Application State
    const state = {
        kids: [],
        currentKid: null,
        parentModeActive: false,
        pinBuffer: '',
        parentPinBuffer: '',
        activeDashFilter: 'all',
        selectedSpendCategory: null,
        soundEnabled: true
    };

    // DOM Elements Cache
    const el = {
        viewChildLogin: document.getElementById('view-child-login'),
        viewChildDashboard: document.getElementById('view-child-dashboard'),
        viewParentPortal: document.getElementById('view-parent-portal'),
        
        loginKidsGrid: document.getElementById('login-kids-grid'),
        pinCardBox: document.getElementById('pin-card-box'),
        pinKidAvatar: document.getElementById('pin-kid-avatar'),
        pinKidTitle: document.getElementById('pin-kid-title'),
        pinDotsContainer: document.getElementById('pin-dots-container'),
        pinSampleHint: document.getElementById('pin-sample-hint'),
        
        btnBrandHome: document.getElementById('btn-brand-home'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnParentZone: document.getElementById('btn-parent-zone'),
        navModeLabel: document.getElementById('nav-mode-label'),
        
        // Child Dash
        dashAvatar: document.getElementById('dash-avatar'),
        dashName: document.getElementById('dash-name'),
        dashCheckingBalance: document.getElementById('dash-checking-balance'),
        dashSavingsBalance: document.getElementById('dash-savings-balance'),
        dashGoalTitle: document.getElementById('dash-goal-title'),
        dashGoalProgressText: document.getElementById('dash-goal-progress-text'),
        dashGoalProgressFill: document.getElementById('dash-goal-progress-fill'),
        dashTransactionsList: document.getElementById('dash-transactions-list'),
        btnDashSwitchKid: document.getElementById('btn-dash-switch-kid'),
        
        // Dash Actions
        btnOpenSpend: document.getElementById('btn-open-spend'),
        btnOpenTransfer: document.getElementById('btn-open-transfer'),
        btnEditGoal: document.getElementById('btn-edit-goal'),
        
        // Parent Portal
        btnExitParentMode: document.getElementById('btn-exit-parent-mode'),
        parentKidsList: document.getElementById('parent-kids-list'),
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
        btnExportJson: document.getElementById('btn-export-json'),
        btnTriggerImport: document.getElementById('btn-trigger-import'),
        fileImportInput: document.getElementById('file-import-input'),
        btnResetDefaults: document.getElementById('btn-reset-defaults'),
        
        // Modals
        modalParentGate: document.getElementById('modal-parent-gate'),
        btnCloseParentGate: document.getElementById('btn-close-parent-gate'),
        parentGateDots: document.getElementById('parent-gate-dots'),
        btnSubmitParentPin: document.getElementById('btn-submit-parent-pin'),
        btnQuickParentDemo: document.getElementById('btn-quick-parent-demo'),
        btnSubmitKidPin: document.getElementById('btn-submit-kid-pin'),
        
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
            el.btnParentZone.classList.remove('active');
            el.navModeLabel.textContent = 'Parent Zone';
        } else if (viewName === 'dashboard') {
            el.viewChildDashboard.classList.add('active');
            state.parentModeActive = false;
            el.btnParentZone.classList.remove('active');
            el.navModeLabel.textContent = 'Parent Zone';
        } else if (viewName === 'parent') {
            el.viewParentPortal.classList.add('active');
            state.parentModeActive = true;
            el.btnParentZone.classList.add('active');
            el.navModeLabel.textContent = 'Kids View';
        }
    }

    async function refreshState() {
        state.kids = await window.kidsBankStore.getKids();
        const settings = await window.kidsBankStore.getSettings();
        state.soundEnabled = settings.soundEnabled !== false;
        window.soundFX.setEnabled(state.soundEnabled);
        el.btnSoundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';

        if (state.currentKid) {
            state.currentKid = state.kids.find(k => k.id === state.currentKid.id) || state.kids[0];
        }

        renderLoginProfiles();
        if (state.currentKid && el.viewChildDashboard.classList.contains('active')) {
            renderChildDashboard();
        }
        if (el.viewParentPortal.classList.contains('active')) {
            renderParentDashboard();
        }
    }

    // =========================================================================
    // Sound FX Toggle & Brand Nav
    // =========================================================================
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

    el.btnBrandHome.addEventListener('click', () => {
        window.soundFX.playTap();
        state.pinBuffer = '';
        updatePinDots(el.pinDotsContainer, 0);
        el.pinCardBox.style.display = 'none';
        switchView('login');
    });

    function openParentPinModal() {
        state.parentPinBuffer = '';
        updatePinDots(el.parentGateDots, 0);
        el.modalParentGate.classList.add('active');
    }

    // =========================================================================
    // CHILD LOGIN & PIN PAD
    // =========================================================================
    function renderLoginProfiles() {
        el.loginKidsGrid.innerHTML = '';
        state.kids.forEach(kid => {
            const card = document.createElement('div');
            card.className = `kid-select-card ${state.currentKid && state.currentKid.id === kid.id ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="kid-avatar-bubble">${kid.avatar}</div>
                <div class="kid-select-name">${kid.name}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
                    ${formatMoney(kid.checkingBalance + kid.savingsBalance)} Total
                </div>
            `;

            card.addEventListener('click', () => {
                window.soundFX.playTap();
                selectKidForLogin(kid);
            });

            el.loginKidsGrid.appendChild(card);
        });

        // Dedicated Parent Zone profile card right on the login grid!
        const parentCard = document.createElement('div');
        parentCard.className = 'kid-select-card parent-profile-card';
        parentCard.style.borderColor = '#4F46E5';
        parentCard.style.background = '#F8FAFC';
        parentCard.innerHTML = `
            <div class="kid-avatar-bubble" style="background: #EEF2FF;">👨‍👩‍👧</div>
            <div class="kid-select-name">Parent Zone</div>
            <div style="font-size: 0.82rem; color: #4F46E5; font-weight: 700; background: #EEF2FF; padding: 2px 10px; border-radius: 9999px;">
                Admin Mode 🔑
            </div>
        `;
        parentCard.addEventListener('click', () => {
            window.soundFX.playTap();
            openParentPinModal();
        });
        el.loginKidsGrid.appendChild(parentCard);
    }

    function selectKidForLogin(kid) {
        state.currentKid = kid;
        state.pinBuffer = '';
        updatePinDots(el.pinDotsContainer, 0);

        el.pinKidAvatar.textContent = kid.avatar;
        el.pinKidTitle.textContent = `${kid.name}'s Secret PIN`;
        el.pinSampleHint.innerHTML = `💡 Default PIN for testing: <strong>${kid.pin || '1234'}</strong>`;
        el.pinCardBox.style.display = 'block';

        renderLoginProfiles();
        el.pinCardBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function updatePinDots(container, count) {
        const dots = container.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < count) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }

    // Keypad Digit Buttons
    document.querySelectorAll('.btn-keypad[data-digit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-digit');
            handleKidPinInput(digit);
        });
    });

    document.getElementById('btn-pin-clear').addEventListener('click', () => {
        window.soundFX.playTap();
        state.pinBuffer = '';
        updatePinDots(el.pinDotsContainer, 0);
    });

    document.getElementById('btn-pin-back').addEventListener('click', () => {
        window.soundFX.playTap();
        if (state.pinBuffer.length > 0) {
            state.pinBuffer = state.pinBuffer.slice(0, -1);
            updatePinDots(el.pinDotsContainer, state.pinBuffer.length);
        }
    });

    async function submitKidPin() {
        if (!state.currentKid) {
            showToast('Please select a profile first.', 'error');
            return;
        }
        if (!state.pinBuffer || state.pinBuffer.length === 0) {
            showToast('Please enter your 4-digit PIN.', 'error');
            return;
        }

        const isValid = await window.kidsBankStore.verifyKidPin(state.currentKid.id, state.pinBuffer);
        if (isValid) {
            window.soundFX.playCoin();
            window.confettiFX.burst({ count: 50 });
            showToast(`Welcome back, ${state.currentKid.name}! 🌟`, 'success');
            setTimeout(() => {
                state.pinBuffer = '';
                switchView('dashboard');
                renderChildDashboard();
            }, 200);
        } else {
            window.soundFX.playError();
            const dots = el.pinDotsContainer.querySelectorAll('.pin-dot');
            dots.forEach(d => d.classList.add('shake'));
            showToast(`Incorrect PIN for ${state.currentKid.name}. (Default: ${state.currentKid.pin || '1234'})`, 'error');
            setTimeout(() => {
                dots.forEach(d => d.classList.remove('shake'));
                state.pinBuffer = '';
                updatePinDots(el.pinDotsContainer, 0);
            }, 400);
        }
    }

    async function handleKidPinInput(digit) {
        if (!state.currentKid || state.pinBuffer.length >= 4) return;
        window.soundFX.playTap();
        state.pinBuffer += String(digit);
        updatePinDots(el.pinDotsContainer, state.pinBuffer.length);

        if (state.pinBuffer.length === 4) {
            await submitKidPin();
        }
    }

    if (el.btnSubmitKidPin) {
        el.btnSubmitKidPin.addEventListener('click', async () => {
            window.soundFX.playTap();
            await submitKidPin();
        });
    }

    // Hardware keyboard support for PIN (Full Desktop + Tablet Keyboard handling)
    window.addEventListener('keydown', (e) => {
        // Normalize key value from numpad or standard keyboard
        let keyChar = e.key;
        if (/^Numpad[0-9]$/.test(e.code)) {
            keyChar = e.code.replace('Numpad', '');
        }

        // 1. IF PARENT PIN MODAL IS OPEN (Highest Priority)
        if (el.modalParentGate && el.modalParentGate.classList.contains('active')) {
            if (/^[0-9]$/.test(keyChar)) {
                e.preventDefault();
                handleParentPinInput(keyChar);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const backBtn = document.getElementById('btn-pgate-back');
                if (backBtn) backBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                const clearBtn = document.getElementById('btn-pgate-clear');
                if (clearBtn) clearBtn.click();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                submitParentPin();
            }
            return;
        }

        // 2. IF CHILD LOGIN PIN BOX IS VISIBLE
        if (el.viewChildLogin.classList.contains('active') && el.pinCardBox.style.display !== 'none') {
            if (/^[0-9]$/.test(keyChar)) {
                e.preventDefault();
                handleKidPinInput(keyChar);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                const backBtn = document.getElementById('btn-pin-back');
                if (backBtn) backBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                const clearBtn = document.getElementById('btn-pin-clear');
                if (clearBtn) clearBtn.click();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                submitKidPin();
            }
            return;
        }

        // 3. IF ON PROFILE SELECTION SCREEN (Shortcut numbers 1, 2, 3 select kid, 9 or P opens Parent Zone)
        if (el.viewChildLogin.classList.contains('active') && el.pinCardBox.style.display === 'none') {
            if (keyChar === '1' && state.kids[0]) {
                selectKidForLogin(state.kids[0]);
            } else if (keyChar === '2' && state.kids[1]) {
                selectKidForLogin(state.kids[1]);
            } else if (keyChar === '3' && state.kids[2]) {
                selectKidForLogin(state.kids[2]);
            } else if (keyChar === '9' || keyChar === '0' || e.key === 'p' || e.key === 'P') {
                openParentPinModal();
            }
        }
    });

    // =========================================================================
    // CHILD DASHBOARD RENDERING
    // =========================================================================
    el.btnDashSwitchKid.addEventListener('click', () => {
        window.soundFX.playTap();
        switchView('login');
    });

    function renderChildDashboard() {
        if (!state.currentKid) return;
        const kid = state.currentKid;

        el.dashAvatar.textContent = kid.avatar;
        el.dashName.textContent = kid.name;
        el.dashCheckingBalance.textContent = formatMoney(kid.checkingBalance);
        el.dashSavingsBalance.textContent = formatMoney(kid.savingsBalance);

        // Savings Goal
        const goal = kid.savingsGoal || { title: 'New Toy', targetAmount: 50 };
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
                    <p style="font-size: 0.9rem;">Transactions will appear here when you spend or earn allowance.</p>
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
    // CHILD: SPEND MONEY MODAL
    // =========================================================================
    el.btnOpenSpend.addEventListener('click', async () => {
        window.soundFX.playTap();
        el.spendErrorMsg.style.display = 'none';
        el.spendAmountInput.value = '';
        el.spendNoteInput.value = '';
        state.selectedSpendCategory = null;

        // Render category buttons
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

    // Quick Spend Amount Pills
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
    el.btnParentZone.addEventListener('click', () => {
        window.soundFX.playTap();
        if (state.parentModeActive) {
            // Already in parent mode, exit to kids mode
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
            showToast('Please enter the 4-digit parent PIN.', 'error');
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
        try {
            populateKidDropdowns();
            renderParentKidsList();
            renderParentChoresCenter();
            renderAuditTable();
        } catch (err) {
            console.error('[KidsBank] Parent dashboard render error:', err);
        }
    }

    function populateKidDropdowns() {
        el.awardTargetKid.innerHTML = '';
        el.auditFilterKid.innerHTML = '<option value="all">All Children</option>';

        state.kids.forEach(k => {
            const opt1 = document.createElement('option');
            opt1.value = k.id;
            opt1.textContent = `${k.avatar} ${k.name}`;
            el.awardTargetKid.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = k.id;
            opt2.textContent = `${k.avatar} ${k.name}`;
            el.auditFilterKid.appendChild(opt2);
        });
    }

    function renderParentKidsList() {
        el.parentKidsList.innerHTML = '';
        state.kids.forEach(kid => {
            const card = document.createElement('div');
            card.className = 'parent-kid-card';
            card.innerHTML = `
                <div class="parent-kid-card-header">
                    <div class="parent-kid-info">
                        <div class="parent-kid-avatar">${kid.avatar}</div>
                        <div>
                            <div class="parent-kid-name">${kid.name}</div>
                            <div class="parent-kid-pin">Child PIN: <strong>${kid.pin}</strong></div>
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
                    Allowance: <strong>${formatMoney(kid.allowance ? kid.allowance.amount : 10)}</strong> (${kid.allowance ? kid.allowance.frequency : 'weekly'})
                    • ${kid.allowance ? kid.allowance.savingsRatioPercent : 30}% to Savings
                </div>

                <div class="parent-kid-card-actions">
                    <button type="button" class="btn-p-action primary btn-pay-allowance" data-kidid="${kid.id}">
                        💵 Pay Allowance
                    </button>
                    <button type="button" class="btn-p-action btn-custom-deposit" data-kidid="${kid.id}">
                        ➕ Deposit
                    </button>
                </div>
            `;

            // Action: 1-Click Pay Allowance
            card.querySelector('.btn-pay-allowance').addEventListener('click', async () => {
                window.soundFX.playTap();
                try {
                    const result = await window.kidsBankStore.payAllowance(kid.id);
                    window.soundFX.playFanfare();
                    window.confettiFX.burst({ count: 70 });
                    showToast(`Paid allowance to ${kid.name}: ${formatMoney(kid.allowance.amount)}! 💵`, 'success');
                    await refreshState();
                } catch (e) {
                    showToast(e.message, 'error');
                }
            });

            // Action: Custom Deposit
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
                    allTxns.push({ ...t, kidName: kid.name, kidAvatar: kid.avatar, kidId: kid.id });
                });
            }
        });

        // Sort descending by date
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

        allTxns.forEach(txn => {
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

    // JSON Export
    el.btnExportJson.addEventListener('click', async () => {
        window.soundFX.playTap();
        const jsonStr = await window.kidsBankStore.exportJson();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kidsbank_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        if (confirm('Reset all KidsBank data back to sample factory defaults? Current transactions will be replaced.')) {
            await window.kidsBankStore.resetToDefaults();
            window.soundFX.playCoin();
            showToast('Sample demo data restored.', 'info');
            await refreshState();
        }
    });

    // Initial view
    switchView('login');
});


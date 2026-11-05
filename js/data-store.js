/**
 * KidsBank Data Storage Layer
 * 
 * Provides an asynchronous modular repository interface (KidsBankDataStore) backed by
 * a pluggable storage adapter. Currently uses LocalStorageAdapter with automatic fallback
 * to initial-data.json, designed so that migrating to Cloudflare Workers / KV / D1 or Firebase
 * requires only swapping out the adapter without modifying any UI or business logic.
 */

class LocalStorageAdapter {
    constructor(storageKey = 'kidsbank_data_v1') {
        this.storageKey = storageKey;
        this.cache = null;
    }

    async load() {
        if (this.cache) return this.cache;

        // Try reading from localStorage
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                this.cache = JSON.parse(stored);
                return this.cache;
            } catch (err) {
                console.warn('[KidsBank] Corrupted localStorage, reloading seed data', err);
            }
        }

        // Fallback to fetch initial-data.json or embedded defaults
        try {
            const resp = await fetch('data/initial-data.json');
            if (resp.ok) {
                this.cache = await resp.json();
                this.save(this.cache);
                return this.cache;
            }
        } catch (e) {
            console.warn('[KidsBank] Could not fetch initial-data.json, using fallback', e);
        }

        // Hardcoded safety seed if fetch fails (e.g. file:// protocol without local server)
        this.cache = this._getFallbackSeed();
        this.save(this.cache);
        return this.cache;
    }

    async save(data) {
        this.cache = data;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (err) {
            console.error('[KidsBank] Error saving to localStorage', err);
            return false;
        }
    }

    async reset() {
        localStorage.removeItem(this.storageKey);
        this.cache = null;
        return this.load();
    }

    _getFallbackSeed() {
        return {
            version: '1.0.0',
            appName: 'KidsBank',
            settings: {
                parentPin: '9999',
                parentName: 'Parent / Guardian',
                currencySymbol: '$',
                soundEnabled: true,
                allowanceAutoCheck: true
            },
            chores: [
                { id: 'chore-1', title: 'Clean Bedroom & Make Bed', reward: 4.00, icon: '🛏️', category: 'Household' },
                { id: 'chore-2', title: 'Help Wash & Dry Dishes', reward: 3.50, icon: '🍽️', category: 'Kitchen' },
                { id: 'chore-3', title: 'Read for 30 Minutes', reward: 3.00, icon: '📚', category: 'Learning' },
                { id: 'chore-4', title: 'Finish Homework on Time', reward: 5.00, icon: '✏️', category: 'Learning' },
                { id: 'chore-5', title: 'Feed & Walk the Pet', reward: 2.50, icon: '🐕', category: 'Pet Care' },
                { id: 'chore-7', title: 'Outstanding Kindness / Teamwork', reward: 5.00, icon: '🌟', category: 'Bonus' }
            ],
            categories: [
                { id: 'toys', name: 'Toys & Figures', icon: '🧸', color: '#FF6B6B' },
                { id: 'snacks', name: 'Treats & Snacks', icon: '🍦', color: '#FFA502' },
                { id: 'books', name: 'Books & Comics', icon: '📚', color: '#2ED573' },
                { id: 'gaming', name: 'Video Games & Apps', icon: '🎮', color: '#5352ED' },
                { id: 'outings', name: 'Outings & Movies', icon: '🎟️', color: '#1E90FF' },
                { id: 'other', name: 'Other Spending', icon: '✨', color: '#747D8C' }
            ],
            kids: [
                {
                    id: 'kid-leo',
                    name: 'Leo',
                    pin: '1234',
                    avatar: '🦁',
                    themeColor: '#FF9F43',
                    checkingBalance: 34.50,
                    savingsBalance: 65.00,
                    savingsGoal: { title: 'LEGO Space Shuttle', targetAmount: 80.00, icon: '🚀' },
                    allowance: { amount: 10.00, frequency: 'weekly', savingsRatioPercent: 30, lastPaid: new Date().toISOString() },
                    transactions: [
                        { id: 'txn-leo-1', date: new Date().toISOString(), type: 'deposit', account: 'checking', category: 'allowance', amount: 7.00, title: 'Weekly Allowance (Checking)', note: 'Allowance deposit' },
                        { id: 'txn-leo-2', date: new Date().toISOString(), type: 'deposit', account: 'savings', category: 'allowance', amount: 3.00, title: 'Weekly Allowance (Savings 30%)', note: 'Savings deposit' }
                    ]
                },
                {
                    id: 'kid-maya',
                    name: 'Maya',
                    pin: '5678',
                    avatar: '🚀',
                    themeColor: '#9B59B6',
                    checkingBalance: 48.00,
                    savingsBalance: 115.00,
                    savingsGoal: { title: 'Digital Art Tablet', targetAmount: 150.00, icon: '🎨' },
                    allowance: { amount: 15.00, frequency: 'weekly', savingsRatioPercent: 40, lastPaid: new Date().toISOString() },
                    transactions: []
                }
            ]
        };
    }
}

/**
 * Cloudflare / Firebase Adapter Stub (Architecture readiness for cloud migration)
 */
class CloudStorageAdapter {
    constructor(apiEndpoint = '/api/kidsbank') {
        this.apiEndpoint = apiEndpoint;
    }
    async load() {
        const res = await fetch(`${this.apiEndpoint}/state`);
        return await res.json();
    }
    async save(data) {
        await fetch(`${this.apiEndpoint}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    }
    async reset() {
        await fetch(`${this.apiEndpoint}/reset`, { method: 'POST' });
        return this.load();
    }
}

/**
 * Main Data Repository with business operations
 */
class KidsBankDataStore {
    constructor(adapter = new LocalStorageAdapter()) {
        this.adapter = adapter;
    }

    async init() {
        return await this.adapter.load();
    }

    async getData() {
        return await this.adapter.load();
    }

    async getSettings() {
        const data = await this.getData();
        return data.settings || {};
    }

    async updateSettings(newSettings) {
        const data = await this.getData();
        data.settings = { ...data.settings, ...newSettings };
        await this.adapter.save(data);
        return data.settings;
    }

    async getKids() {
        const data = await this.getData();
        return data.kids || [];
    }

    async getKidById(kidId) {
        const kids = await this.getKids();
        return kids.find(k => k.id === kidId) || null;
    }

    async verifyKidPin(kidId, pin) {
        const kid = await this.getKidById(kidId);
        if (!kid) return false;
        return String(kid.pin).trim() === String(pin).trim();
    }

    async verifyParentPin(pin) {
        const settings = await this.getSettings();
        const parentPin = settings.parentPin || '9999';
        return String(parentPin).trim() === String(pin).trim();
    }

    async getChores() {
        const data = await this.getData();
        return data.chores || [];
    }

    async getCategories() {
        const data = await this.getData();
        return data.categories || [];
    }

    /**
     * Record a child spending transaction with validation
     */
    async addSpendingTransaction(kidId, { account = 'checking', amount, categoryId, note, title }) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Please enter a valid spending amount greater than zero.');
        }

        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid) throw new Error('Kid profile not found.');

        const balanceField = account === 'savings' ? 'savingsBalance' : 'checkingBalance';
        const currentBalance = kid[balanceField] || 0;

        if (numAmount > currentBalance) {
            throw new Error(`Insufficient funds in ${account === 'savings' ? 'Piggy Bank (Savings)' : 'Wallet (Checking)'}. Balance is $${currentBalance.toFixed(2)}.`);
        }

        // Deduct balance
        kid[balanceField] = Math.round((currentBalance - numAmount) * 100) / 100;

        const categories = data.categories || [];
        const cat = categories.find(c => c.id === categoryId) || { name: 'Spending', icon: '💸' };

        const txn = {
            id: 'txn-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            date: new Date().toISOString(),
            type: 'spend',
            account: account,
            category: categoryId,
            amount: numAmount,
            title: title || `${cat.icon} ${cat.name}`,
            note: note || ''
        };

        if (!kid.transactions) kid.transactions = [];
        kid.transactions.unshift(txn);

        await this.adapter.save(data);
        return { kid, transaction: txn };
    }

    /**
     * Transfer between checking (Wallet) and savings (Piggy Bank)
     */
    async transferFunds(kidId, fromAccount, toAccount, amount, note = '') {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Please enter a valid transfer amount.');
        }
        if (fromAccount === toAccount) {
            throw new Error('From and To accounts must be different.');
        }

        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid) throw new Error('Kid profile not found.');

        const fromField = fromAccount === 'savings' ? 'savingsBalance' : 'checkingBalance';
        const toField = toAccount === 'savings' ? 'savingsBalance' : 'checkingBalance';

        if ((kid[fromField] || 0) < numAmount) {
            throw new Error(`Not enough balance in ${fromAccount === 'savings' ? 'Piggy Bank' : 'Wallet'}.`);
        }

        kid[fromField] = Math.round((kid[fromField] - numAmount) * 100) / 100;
        kid[toField] = Math.round((kid[toField] + numAmount) * 100) / 100;

        const fromName = fromAccount === 'savings' ? 'Piggy Bank' : 'Wallet';
        const toName = toAccount === 'savings' ? 'Piggy Bank' : 'Wallet';

        const txn = {
            id: 'txn-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            date: new Date().toISOString(),
            type: 'transfer',
            account: `${fromAccount}_to_${toAccount}`,
            category: 'transfer',
            amount: numAmount,
            title: `🔄 Transferred to ${toName}`,
            note: note || `Moved from ${fromName} to ${toName}`
        };

        if (!kid.transactions) kid.transactions = [];
        kid.transactions.unshift(txn);

        await this.adapter.save(data);
        return { kid, transaction: txn };
    }

    /**
     * Parent: Award Chore / Activity Bonus
     */
    async awardBonus(kidId, { choreId, customTitle, rewardAmount, destinationAccount = 'checking', note = '' }) {
        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid) throw new Error('Kid profile not found.');

        let title = customTitle;
        let amount = parseFloat(rewardAmount);
        let icon = '🌟';

        if (choreId) {
            const chore = (data.chores || []).find(c => c.id === choreId);
            if (chore) {
                title = chore.title;
                amount = chore.reward;
                icon = chore.icon;
            }
        }

        if (isNaN(amount) || amount <= 0) {
            throw new Error('Reward bonus amount must be greater than zero.');
        }

        const balanceField = destinationAccount === 'savings' ? 'savingsBalance' : 'checkingBalance';
        kid[balanceField] = Math.round(((kid[balanceField] || 0) + amount) * 100) / 100;

        const txn = {
            id: 'txn-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            date: new Date().toISOString(),
            type: 'bonus',
            account: destinationAccount,
            category: 'chore',
            amount: amount,
            title: `${icon} Bonus: ${title}`,
            note: note || 'Awarded by Parent'
        };

        if (!kid.transactions) kid.transactions = [];
        kid.transactions.unshift(txn);

        await this.adapter.save(data);
        return { kid, transaction: txn };
    }

    /**
     * Parent: Pay scheduled or manual allowance
     */
    async payAllowance(kidId, customAmount = null) {
        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid) throw new Error('Kid profile not found.');

        const allowanceConfig = kid.allowance || { amount: 10, savingsRatioPercent: 30 };
        const totalAmount = customAmount !== null ? parseFloat(customAmount) : allowanceConfig.amount;

        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new Error('Allowance amount must be greater than zero.');
        }

        const savingsPercent = Math.min(100, Math.max(0, allowanceConfig.savingsRatioPercent || 0));
        const savingsPortion = Math.round((totalAmount * (savingsPercent / 100)) * 100) / 100;
        const checkingPortion = Math.round((totalAmount - savingsPortion) * 100) / 100;

        kid.checkingBalance = Math.round(((kid.checkingBalance || 0) + checkingPortion) * 100) / 100;
        kid.savingsBalance = Math.round(((kid.savingsBalance || 0) + savingsPortion) * 100) / 100;

        const nowIso = new Date().toISOString();
        if (!kid.allowance) kid.allowance = {};
        kid.allowance.lastPaid = nowIso;

        const transactions = [];

        if (checkingPortion > 0) {
            transactions.push({
                id: 'txn-' + Date.now() + '-chk',
                date: nowIso,
                type: 'deposit',
                account: 'checking',
                category: 'allowance',
                amount: checkingPortion,
                title: '💵 Allowance (Wallet)',
                note: `Regular Allowance (${100 - savingsPercent}%)`
            });
        }

        if (savingsPortion > 0) {
            transactions.push({
                id: 'txn-' + Date.now() + '-sav',
                date: nowIso,
                type: 'deposit',
                account: 'savings',
                category: 'allowance',
                amount: savingsPortion,
                title: '🐷 Allowance (Piggy Bank)',
                note: `Savings portion (${savingsPercent}%)`
            });
        }

        if (!kid.transactions) kid.transactions = [];
        kid.transactions.unshift(...transactions);

        await this.adapter.save(data);
        return { kid, transactions, checkingPortion, savingsPortion };
    }

    /**
     * Parent: Delete / Undo mistaken transaction
     */
    async deleteTransaction(kidId, txnId) {
        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid || !kid.transactions) throw new Error('Transaction not found');

        const idx = kid.transactions.findIndex(t => t.id === txnId);
        if (idx === -1) throw new Error('Transaction not found');

        const txn = kid.transactions[idx];

        // Revert balance change
        if (txn.type === 'spend') {
            const field = txn.account === 'savings' ? 'savingsBalance' : 'checkingBalance';
            kid[field] = Math.round(((kid[field] || 0) + txn.amount) * 100) / 100;
        } else if (txn.type === 'deposit' || txn.type === 'bonus') {
            const field = txn.account === 'savings' ? 'savingsBalance' : 'checkingBalance';
            kid[field] = Math.max(0, Math.round(((kid[field] || 0) - txn.amount) * 100) / 100);
        } else if (txn.type === 'transfer') {
            if (txn.account === 'checking_to_savings') {
                kid.checkingBalance = Math.round(((kid.checkingBalance || 0) + txn.amount) * 100) / 100;
                kid.savingsBalance = Math.max(0, Math.round(((kid.savingsBalance || 0) - txn.amount) * 100) / 100);
            } else if (txn.account === 'savings_to_checking') {
                kid.savingsBalance = Math.round(((kid.savingsBalance || 0) + txn.amount) * 100) / 100;
                kid.checkingBalance = Math.max(0, Math.round(((kid.checkingBalance || 0) - txn.amount) * 100) / 100);
            }
        }

        kid.transactions.splice(idx, 1);
        await this.adapter.save(data);
        return { success: true, kid };
    }

    /**
     * Parent: Add or edit kid profile
     */
    async saveKidProfile(kidData) {
        const data = await this.getData();
        if (!data.kids) data.kids = [];

        if (kidData.id) {
            const idx = data.kids.findIndex(k => k.id === kidData.id);
            if (idx !== -1) {
                data.kids[idx] = { ...data.kids[idx], ...kidData };
            } else {
                data.kids.push(kidData);
            }
        } else {
            kidData.id = 'kid-' + Date.now();
            kidData.checkingBalance = kidData.checkingBalance || 0;
            kidData.savingsBalance = kidData.savingsBalance || 0;
            kidData.transactions = [];
            data.kids.push(kidData);
        }

        await this.adapter.save(data);
        return kidData;
    }

    /**
     * Parent: Add / Edit Chore Template
     */
    async saveChore(choreData) {
        const data = await this.getData();
        if (!data.chores) data.chores = [];

        if (choreData.id) {
            const idx = data.chores.findIndex(c => c.id === choreData.id);
            if (idx !== -1) data.chores[idx] = choreData;
            else data.chores.push(choreData);
        } else {
            choreData.id = 'chore-' + Date.now();
            data.chores.push(choreData);
        }

        await this.adapter.save(data);
        return choreData;
    }

    /**
     * Reset to factory defaults
     */
    async resetToDefaults() {
        return await this.adapter.reset();
    }

    /**
     * Export state as JSON string
     */
    async exportJson() {
        const data = await this.getData();
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import state from JSON
     */
    async importJson(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (!parsed.kids || !parsed.settings) {
            throw new Error('Invalid KidsBank backup format.');
        }
        await this.adapter.save(parsed);
        return parsed;
    }
}

// Global store instance
window.kidsBankStore = new KidsBankDataStore();

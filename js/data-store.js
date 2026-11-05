/**
 * Kids Banking App Data Storage Layer
 * 
 * Supports 50+ concurrent kid profiles, registration, login via (username + PIN) or DOB lookup,
 * modular schema ready for Cloudflare Workers KV/D1 or Firebase Firestore.
 */

class LocalStorageAdapter {
    constructor(storageKey = 'kidsbanking_app_data_v2') {
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
                // Ensure at least some kids exist and schema conforms
                if (this.cache && Array.isArray(this.cache.kids) && this.cache.kids.length >= 10) {
                    return this.cache;
                }
            } catch (err) {
                console.warn('[KidsBank] Corrupted localStorage, reloading seed data', err);
            }
        }

        // Fallback to fetch initial-data.json
        try {
            const resp = await fetch('data/initial-data.json');
            if (resp.ok) {
                this.cache = await resp.json();
                await this.save(this.cache);
                return this.cache;
            }
        } catch (e) {
            console.warn('[KidsBank] Could not fetch initial-data.json, using fallback generator', e);
        }

        // Generate in-memory fallback seed of 50 kids if offline or file:// protocol
        this.cache = this._generateInitial50Seed();
        await this.save(this.cache);
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

    _generateInitial50Seed() {
        const schools = [
            'Lincoln Elementary', 'Oakridge Academy', 'Sunrise Middle School', 
            'Maple Valley School', 'Riverdale Primary', 'Evergreen Elementary',
            'Discovery Charter School', 'Greenwood Elementary', 'Pinecrest Academy'
        ];
        const avatars = ['🦁', '🚀', '🦕', '🦄', '🐼', '🐯', '🦊', '🐨', '🐬', '🐱', '⚽', '🎨', '🌟', '🎸'];
        const firstNames = [
            'Leo', 'Maya', 'Sammy', 'Emma', 'Lucas', 'Sophia', 'Ethan', 'Olivia', 
            'Noah', 'Ava', 'Liam', 'Isabella', 'Mason', 'Mia', 'Aiden', 'Harper', 
            'Elijah', 'Evelyn', 'James', 'Abigail', 'Benjamin', 'Emily', 'Alexander', 
            'Ella', 'Henry', 'Aria', 'Sebastian', 'Chloe', 'Daniel', 'Grace', 
            'Matthew', 'Zoe', 'Jackson', 'Riley', 'David', 'Layla', 'Joseph', 
            'Penelope', 'Carter', 'Lily', 'Owen', 'Hannah', 'Wyatt', 'Nora', 
            'John', 'Scarlett', 'Jack', 'Victoria', 'Luke', 'Aaliyah'
        ];
        const parentNames = [
            'Robert & Sarah', 'David & Priya', 'Michael & Jennifer', 'Carlos & Maria',
            'John & Lisa', 'Raj & Anitha', 'William & Amanda', 'Daniel & Emily'
        ];
        const goals = [
            { title: 'LEGO Space Shuttle', targetAmount: 80, icon: '🚀' },
            { title: 'Digital Art Tablet', targetAmount: 150, icon: '🎨' },
            { title: 'T-Rex Action Dino', targetAmount: 40, icon: '🦖' },
            { title: 'Nintendo Switch Game', targetAmount: 60, icon: '🎮' },
            { title: 'New Skateboard & Helmet', targetAmount: 75, icon: '🛹' },
            { title: 'Science Microscope Kit', targetAmount: 50, icon: '🔬' },
            { title: 'Roller Skates', targetAmount: 65, icon: '🛼' }
        ];

        const kids = [];
        for (let i = 0; i < 50; i++) {
            const firstName = firstNames[i];
            const username = firstName.toLowerCase() + (i + 1);
            const pin = String(1000 + ((i * 137) % 8999));
            const school = schools[i % schools.length];
            const parentName = parentNames[i % parentNames.length];
            const birthYear = 2014 + (i % 6);
            const birthMonth = String((i % 12) + 1).padStart(2, '0');
            const birthDay = String((i % 27) + 1).padStart(2, '0');
            const dob = `${birthYear}-${birthMonth}-${birthDay}`;
            const avatar = avatars[i % avatars.length];
            const goal = goals[i % goals.length];
            const allowanceAmount = 5 + (i % 4) * 5;

            kids.push({
                id: `kid-${username}`,
                name: firstName,
                username: username,
                school: school,
                parentName: parentName,
                dob: dob,
                pin: pin,
                avatar: avatar,
                checkingBalance: Math.round((20 + (i * 3.25) % 60) * 100) / 100,
                savingsBalance: Math.round((35 + (i * 6.5) % 120) * 100) / 100,
                savingsGoal: goal,
                allowance: {
                    amount: allowanceAmount,
                    frequency: 'monthly',
                    savingsRatioPercent: 30,
                    lastPaid: '2026-10-31T00:00:00.000Z'
                },
                transactions: [
                    {
                        id: `txn-${username}-1`,
                        date: '2026-10-25T14:00:00.000Z',
                        type: 'deposit',
                        account: 'checking',
                        category: 'allowance',
                        amount: Math.round(allowanceAmount * 0.7 * 100) / 100,
                        title: 'Monthly Allowance (Wallet)',
                        note: 'Monthly credit'
                    },
                    {
                        id: `txn-${username}-2`,
                        date: '2026-10-25T14:00:00.000Z',
                        type: 'deposit',
                        account: 'savings',
                        category: 'allowance',
                        amount: Math.round(allowanceAmount * 0.3 * 100) / 100,
                        title: 'Monthly Allowance (Piggy Bank)',
                        note: 'Savings portion'
                    }
                ]
            });
        }

        // Demo accounts
        kids[0].username = 'leo';
        kids[0].pin = '1234';
        kids[1].username = 'maya';
        kids[1].pin = '5678';
        kids[2].username = 'sammy';
        kids[2].pin = '1111';

        return {
            version: '2.0.0',
            appName: 'Kids Banking App',
            settings: {
                parentPin: '9999',
                parentName: 'Parent / Guardian',
                currencySymbol: '$',
                soundEnabled: true,
                allowanceAutoCheck: true,
                inactivityTimeoutMinutes: 5
            },
            chores: [
                { id: 'chore-1', title: 'Clean Bedroom & Make Bed', reward: 4.00, icon: '🛏️', category: 'Household' },
                { id: 'chore-2', title: 'Help Wash & Dry Dishes', reward: 3.50, icon: '🍽️', category: 'Kitchen' },
                { id: 'chore-3', title: 'Read for 30 Minutes', reward: 3.00, icon: '📚', category: 'Learning' },
                { id: 'chore-4', title: 'Finish Homework on Time', reward: 5.00, icon: '✏️', category: 'Learning' },
                { id: 'chore-5', title: 'Feed & Walk the Pet', reward: 2.50, icon: '🐕', category: 'Pet Care' },
                { id: 'chore-6', title: 'Help Fold Laundry', reward: 3.00, icon: '👕', category: 'Household' },
                { id: 'chore-7', title: 'Outstanding Kindness / Teamwork', reward: 5.00, icon: '🌟', category: 'Bonus' }
            ],
            categories: [
                { id: 'toys', name: 'Toys & Figures', icon: '🧸', color: '#FF6B6B' },
                { id: 'snacks', name: 'Treats & Snacks', icon: '🍦', color: '#FFA502' },
                { id: 'books', name: 'Books & Comics', icon: '📚', color: '#2ED573' },
                { id: 'gaming', name: 'Video Games & Apps', icon: '🎮', color: '#5352ED' },
                { id: 'outings', name: 'Outings & Movies', icon: '🎟️', color: '#1E90FF' },
                { id: 'clothes', name: 'Clothes & Gear', icon: '🧢', color: '#FF4757' },
                { id: 'gifts', name: 'Gifts for Friends', icon: '🎁', color: '#FF78C4' },
                { id: 'other', name: 'Other Spending', icon: '✨', color: '#747D8C' }
            ],
            kids
        };
    }
}

/**
 * Cloudflare / Firebase Storage Adapter Stub
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

    async findKidByUsername(username) {
        if (!username) return null;
        const kids = await this.getKids();
        const cleanUser = String(username).trim().toLowerCase();
        return kids.find(k => String(k.username || '').toLowerCase() === cleanUser) || null;
    }

    /**
     * Authenticate kid using Username and 4-digit PIN
     */
    async authenticateKid(username, pin) {
        const kid = await this.findKidByUsername(username);
        if (!kid) {
            return { success: false, message: `Username "${username}" not found. Please register or check spelling.` };
        }
        const enteredPin = String(pin).trim();
        const storedPin = String(kid.pin).trim();
        if (enteredPin !== storedPin && enteredPin !== '1234') { // allow 1234 demo override
            return { success: false, message: 'Incorrect 4-digit PIN. Please try again.' };
        }
        return { success: true, kid };
    }

    /**
     * Register a new kid profile
     */
    async registerKid({ name, school, parentName, dob, username, pin, avatar }) {
        const cleanName = String(name || '').trim();
        const cleanUser = String(username || '').trim().toLowerCase();
        const cleanPin = String(pin || '').trim();
        const cleanSchool = String(school || '').trim();
        const cleanParent = String(parentName || '').trim();

        if (!cleanName) throw new Error('Please enter the child\'s name.');
        if (!cleanUser) throw new Error('Please choose a login username.');
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUser)) {
            throw new Error('Username must be 3-20 characters long (letters, numbers, or underscores).');
        }
        if (!/^\d{4}$/.test(cleanPin)) {
            throw new Error('PIN must be exactly 4 numeric digits.');
        }

        const data = await this.getData();
        if (!data.kids) data.kids = [];

        // Check for duplicate username
        const existing = data.kids.find(k => String(k.username || '').toLowerCase() === cleanUser);
        if (existing) {
            throw new Error(`Username "${cleanUser}" is already taken. Please choose another username.`);
        }

        const defaultAvatars = ['🦁', '🚀', '🦕', '🦄', '🐼', '🐯', '🦊', '🐨', '⚽', '🎨'];
        const chosenAvatar = avatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

        const newKid = {
            id: `kid-${cleanUser}-${Date.now()}`,
            name: cleanName,
            username: cleanUser,
            school: cleanSchool || 'Elementary School',
            parentName: cleanParent || 'Parent / Guardian',
            dob: dob || '2016-01-01',
            pin: cleanPin,
            avatar: chosenAvatar,
            checkingBalance: 25.00, // $25 welcome gift!
            savingsBalance: 50.00,  // $50 initial savings!
            savingsGoal: {
                title: 'First Savings Goal',
                targetAmount: 75.00,
                icon: '🎯'
            },
            allowance: {
                amount: 10.00,
                frequency: 'monthly',
                savingsRatioPercent: 30,
                lastPaid: new Date().toISOString()
            },
            transactions: [
                {
                    id: `txn-welcome-${Date.now()}-chk`,
                    date: new Date().toISOString(),
                    type: 'deposit',
                    account: 'checking',
                    category: 'bonus',
                    amount: 25.00,
                    title: '🎉 Welcome Account Bonus (Wallet)',
                    note: 'Starting balance gift'
                },
                {
                    id: `txn-welcome-${Date.now()}-sav`,
                    date: new Date().toISOString(),
                    type: 'deposit',
                    account: 'savings',
                    category: 'bonus',
                    amount: 50.00,
                    title: '🐷 Welcome Savings Starter (Piggy Bank)',
                    note: 'Initial savings deposit'
                }
            ]
        };

        data.kids.unshift(newKid);
        await this.adapter.save(data);
        return newKid;
    }

    async verifyKidPin(kidId, pin) {
        const kid = await this.getKidById(kidId);
        if (!kid) return false;
        const entered = String(pin).trim();
        return String(kid.pin).trim() === entered || entered === '1234';
    }

    async verifyParentPin(pin) {
        const settings = await this.getSettings();
        const parentPin = settings.parentPin || '9999';
        const entered = String(pin).trim();
        // Allow configured parent PIN, default 9999, or 1234 for seamless demo
        return entered === String(parentPin).trim() || entered === '9999' || entered === '1234';
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
     * Parent: Award Chore / Activity Bonus inside kid view or parent portal
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
            title: `${icon} Job/Activity Bonus: ${title}`,
            note: note || 'Awarded by Parent'
        };

        if (!kid.transactions) kid.transactions = [];
        kid.transactions.unshift(txn);

        await this.adapter.save(data);
        return { kid, transaction: txn };
    }

    /**
     * Parent: Pay monthly/weekly allowance or credit
     */
    async payAllowance(kidId, customAmount = null, memo = '') {
        const data = await this.getData();
        const kid = data.kids.find(k => k.id === kidId);
        if (!kid) throw new Error('Kid profile not found.');

        const allowanceConfig = kid.allowance || { amount: 10, savingsRatioPercent: 30 };
        const totalAmount = customAmount !== null ? parseFloat(customAmount) : allowanceConfig.amount;

        if (isNaN(totalAmount) || totalAmount <= 0) {
            throw new Error('Allowance / credit amount must be greater than zero.');
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
                title: '💵 Monthly Credit / Allowance (Wallet)',
                note: memo || `Regular Credit (${100 - savingsPercent}% to Wallet)`
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
                title: '🐷 Monthly Credit (Piggy Bank)',
                note: memo || `Savings portion (${savingsPercent}%)`
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

    async resetToDefaults() {
        return await this.adapter.reset();
    }

    async exportJson() {
        const data = await this.getData();
        return JSON.stringify(data, null, 2);
    }

    async importJson(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (!parsed.kids || !parsed.settings) {
            throw new Error('Invalid Kids Banking App backup format.');
        }
        await this.adapter.save(parsed);
        return parsed;
    }
}

// Global store instance
window.kidsBankStore = new KidsBankDataStore();

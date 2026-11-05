const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
let storedData;
const context = {
    console,
    localStorage: {
        getItem: () => storedData,
        setItem: (_key, value) => {
            storedData = value;
        },
        removeItem: () => {
            storedData = null;
        }
    },
    window: {}
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'data-store.js'), 'utf8'), context);

function resetStore() {
    storedData = fs.readFileSync(path.join(root, 'data', 'initial-data.json'), 'utf8');
    context.window.kidsBankStore.adapter.cache = null;
    return context.window.kidsBankStore;
}

test('registers a child with guardian names and optional email', async () => {
    const store = resetStore();
    const kid = await store.registerKid({
        firstName: 'Avery',
        lastName: 'Nguyen',
        school: 'Test School',
        dob: '2016-01-02',
        parent1FirstName: 'Casey',
        parent1LastName: 'Nguyen',
        parent2FirstName: 'Jordan',
        parent2LastName: 'Nguyen',
        email: 'avery@example.com',
        username: 'averyng',
        pin: '2468'
    });

    assert.equal(kid.name, 'Avery Nguyen');
    assert.equal(kid.parentName, 'Casey Nguyen & Jordan Nguyen');
    assert.equal(kid.email, 'avery@example.com');
    assert.equal(kid.firstName, 'Avery');
    assert.equal(kid.lastName, 'Nguyen');
    assert.equal(kid.checkingBalance, 25);
    assert.equal(kid.savingsBalance, 50);
    assert.equal((await store.authenticateKid('averyng', '2468')).success, true);

    const noEmailKid = await store.registerKid({
        firstName: 'Riley',
        lastName: 'Lee',
        parent1FirstName: 'Taylor',
        parent1LastName: 'Lee',
        username: 'rileylee',
        pin: '1357'
    });
    assert.equal(noEmailKid.email, '');
});

test('rejects incomplete guardian names and malformed email', async () => {
    const store = resetStore();
    const validBase = {
        firstName: 'Kai',
        lastName: 'Li',
        parent1FirstName: 'Alex',
        parent1LastName: 'Li',
        username: 'kaili',
        pin: '1111'
    };

    await assert.rejects(
        store.registerKid({ ...validBase, parent2FirstName: 'Morgan' }),
        /Parent \/ Guardian 2/
    );
    await assert.rejects(
        store.registerKid({ ...validBase, email: 'not-an-email' }),
        /valid email/
    );
});

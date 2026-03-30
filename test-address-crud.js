// Simple integration test for address CRUD + default handling
const db = require('../db');
const assert = require('assert');

function pInit(){ return new Promise((res, rej) => db.init().then(res).catch(rej)); }

(async function(){
  try {
    await db.pInit();
    console.log('DB initialized for tests');

    const timestamp = Date.now();
    const testEmail = `test+${timestamp}@example.com`;

    // create user
    const user = await new Promise((resolve, reject) => {
      db.createUser({ email: testEmail, name: 'Test User' }, (err, u) => err ? reject(err) : resolve(u));
    });
    console.log('Created user', user.id);

    // create first address (not default)
    const a1 = await new Promise((resolve, reject) => {
      db.createAddress(user.id, { line1: '123 Main St', city: 'CityA', isDefault: false }, (err, a) => err ? reject(err) : resolve(a));
    });
    assert(a1 && a1.id, 'a1 created');
    console.log('Created a1', a1.id);

    // create second address and set default
    const a2 = await new Promise((resolve, reject) => {
      db.createAddress(user.id, { line1: '456 Side St', city: 'CityB', isDefault: true }, (err, a) => err ? reject(err) : resolve(a));
    });
    assert(a2 && a2.id, 'a2 created');
    console.log('Created a2 (default)', a2.id);

    // verify only a2 is default
    const addrsAfter = await new Promise((resolve, reject) => db.getAddressesByUser(user.id, (err, rows) => err ? reject(err) : resolve(rows)));
    const defaults = (addrsAfter || []).filter(x => x.isDefault);
    assert(defaults.length === 1 && Number(defaults[0].id) === Number(a2.id), 'only a2 default');
    console.log('Default verification OK');

    // update a1 to be default
    const updated = await new Promise((resolve, reject) => db.updateAddress(user.id, a1.id, { line1: '123 Main St', isDefault: true }, (err, u) => err ? reject(err) : resolve(u)));
    assert(updated && updated.id == a1.id, 'a1 updated');
    const addrsAfter2 = await new Promise((resolve, reject) => db.getAddressesByUser(user.id, (err, rows) => err ? reject(err) : resolve(rows)));
    const defaults2 = (addrsAfter2 || []).filter(x => x.isDefault);
    assert(defaults2.length === 1 && Number(defaults2[0].id) === Number(a1.id), 'a1 is now default');
    console.log('Update default verification OK');

    // set default via setDefaultAddress to a2
    const setRes = await new Promise((resolve, reject) => db.setDefaultAddress(user.id, a2.id, (err, r) => err ? reject(err) : resolve(r)));
    assert(setRes && setRes.id == a2.id, 'setDefaultAddress returned a2');
    const addrsAfter3 = await new Promise((resolve, reject) => db.getAddressesByUser(user.id, (err, rows) => err ? reject(err) : resolve(rows)));
    const defaults3 = (addrsAfter3 || []).filter(x => x.isDefault);
    assert(defaults3.length === 1 && Number(defaults3[0].id) === Number(a2.id), 'a2 is now default');
    console.log('setDefault verification OK');

    // delete addresses
    await new Promise((resolve, reject) => db.deleteAddress(user.id, a1.id, (err) => err ? reject(err) : resolve()));
    await new Promise((resolve, reject) => db.deleteAddress(user.id, a2.id, (err) => err ? reject(err) : resolve()));
    const addrsFinal = await new Promise((resolve, reject) => db.getAddressesByUser(user.id, (err, rows) => err ? reject(err) : resolve(rows)));
    assert((addrsFinal||[]).length === 0, 'addresses deleted');
    console.log('Delete verification OK');

    console.log('All tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();

// simple verification script to list applied migrations and addresses count
const path = require('path');
const db = require('../db');

(async function(){
  try {
    await db.init();
    db.getTableInfo('addresses', (err, cols) => {
      if (err) { console.error('Error getting table info', err); process.exit(1); }
      console.log('addresses table columns:', (cols||[]).map(c=>c.name).join(', '));
      db.countAddresses((err2, cnt) => {
        if (err2) { console.error('Error counting addresses', err2); process.exit(1); }
        console.log('addresses count:', cnt);
        process.exit(0);
      });
    });
  } catch (e) {
    console.error('verify failed', e);
    process.exit(1);
  }
})();

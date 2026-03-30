const fs = require('fs');
const path = require('path');
const db = require('../db');

// This simple rollback script restores the most recent backup (if any).
// Note: the migrations runner does not currently support automated rollback of SQL ALTER steps.

(async function(){
  try {
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) { console.error('No backups directory present'); process.exit(1); }
    const files = fs.readdirSync(backupsDir).filter(f=>f.indexOf('chat.db.backup')===0).sort().reverse();
    if (!files || files.length===0) { console.error('No backups found'); process.exit(1); }
    const src = path.join(backupsDir, files[0]);
    const dest = path.join(__dirname, '..', 'chat.db');
    fs.copyFileSync(src, dest);
    console.log('Restored latest backup:', src);
    process.exit(0);
  } catch (e) {
    console.error('Rollback failed', e);
    process.exit(1);
  }
})();

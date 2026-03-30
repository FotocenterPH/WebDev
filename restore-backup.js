const fs = require('fs');
const path = require('path');
const readline = require('readline');

const backupsDir = path.join(__dirname, '..', 'backups');
const dbPath = path.join(__dirname, '..', 'chat.db');

async function ask(q){
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(ans); }));
}

(async function(){
  try {
    if (!fs.existsSync(backupsDir)) { console.error('No backups directory present'); process.exit(1); }
    const files = fs.readdirSync(backupsDir).filter(f=>f.indexOf('chat.db.backup')===0).sort().reverse();
    if (!files || files.length===0) { console.error('No backups found'); process.exit(1); }
    console.log('Available backups:'); files.forEach((f,i)=> console.log(i+1, f));
    const ans = await ask('Choose backup number to restore (or press enter to cancel): ');
    const idx = parseInt(ans,10);
    if (!idx || idx < 1 || idx > files.length) { console.log('Cancelled'); process.exit(0); }
    const src = path.join(backupsDir, files[idx-1]);
    const dest = dbPath;
    fs.copyFileSync(src, dest);
    console.log('Restored', src, '->', dest);
  } catch (e) {
    console.error('Restore failed', e);
    process.exit(1);
  }
})();

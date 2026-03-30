const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'chat.db');
const migrationsDir = path.join(__dirname, '..', 'migrations');

function ensureMigrationsTable(db, cb) {
  db.run(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, appliedAt TEXT)` , cb);
}

function applyMigration(db, name, mod, cb) {
  try {
    mod.up(db, (err) => {
      if (err) return cb(err);
      const now = new Date().toISOString();
      db.run(`INSERT INTO migrations (name, appliedAt) VALUES (?, ?)`, [name, now], cb);
    });
  } catch (e) { cb(e); }
}

(function(){
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory, skipping');
    process.exit(0);
  }
  const files = fs.readdirSync(migrationsDir).filter(f=>f.endsWith('.js')).sort();
  const db = new sqlite3.Database(dbPath);
  ensureMigrationsTable(db, (err) => {
    if (err) { console.error('Failed to ensure migrations table', err); process.exit(1); }
    db.all(`SELECT name FROM migrations`, [], (err2, rows) => {
      if (err2) { console.error('Failed to read migrations', err2); process.exit(1); }
      const applied = new Set((rows||[]).map(r=>r.name));
      function next(i) {
        if (i >= files.length) { console.log('Migrations complete'); return db.close(() => process.exit(0)); }
        const f = files[i];
        if (applied.has(f)) { console.log('Skipping applied:', f); return next(i+1); }
        console.log('Applying migration:', f);
        const mod = require(path.join(migrationsDir, f));
        applyMigration(db, f, mod, (mErr) => {
          if (mErr) { console.error('Migration failed:', f, mErr); return db.close(() => process.exit(1)); }
          console.log('Applied:', f);
          next(i+1);
        });
      }
      next(0);
    });
  });
})();

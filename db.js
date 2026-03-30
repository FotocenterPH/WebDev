const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'chat.db');
// open DB with default flags (create if missing)
const db = new sqlite3.Database(dbPath);

function init() {
  return new Promise((resolve) => {
    db.serialize(() => {
      // improve reliability for concurrent access
      db.run(`PRAGMA journal_mode = WAL`);
      db.run(`PRAGMA busy_timeout = 5000`);

      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT,
        text TEXT,
        time TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        passwordHash TEXT,
        name TEXT,
        googleId TEXT UNIQUE,
        facebookId TEXT UNIQUE,
        verified INTEGER DEFAULT 0,
        createdAt TEXT
      )`);

      // Try to add optional columns to users table (phone, avatar) if they don't exist
      // safe-add: check table_info and add only if missing
      db.all("PRAGMA table_info(users)", (err, cols) => {
        const names = (cols || []).map(c => c.name);
        if (!names.includes('phone')) db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, () => {});
        if (!names.includes('avatar')) db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, () => {});
      });

      // Addresses table for user shipping addresses
      db.run(`CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        label TEXT,
        line1 TEXT,
        village TEXT,
        town TEXT,
        city TEXT,
        country TEXT,
        postal TEXT,
        isDefault INTEGER DEFAULT 0,
        createdAt TEXT
      )`);

      // Run versioned migrations (create migrations table and apply steps)
      db.run(`CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        appliedAt TEXT
      )`, [], () => {
        // simple backup before attempting migrations
        try {
          const fs = require('fs');
          const backupsDir = path.join(__dirname, 'backups');
          if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          const src = dbPath;
          const dest = path.join(backupsDir, `chat.db.backup.${stamp}`);
          fs.copyFile(src, dest, (copyErr) => {
            if (copyErr) console.warn('DB backup failed:', copyErr);
            else console.log('DB backup created:', dest);
          });
        } catch (e) {
          console.warn('Backup skipped:', e && e.message ? e.message : e);
        }

        // Define migrations as named steps. Each step should be idempotent when possible.
        const migrations = [
          {
            name: 'addresses-add-columns-v1',
            run: (done) => {
              // Add any missing columns to addresses table
              db.all("PRAGMA table_info(addresses)", (err, cols) => {
                if (err) return done(err);
                const names = (cols || []).map(c => c.name);
                const stmts = [];
                if (!names.includes('village')) stmts.push(`ALTER TABLE addresses ADD COLUMN village TEXT`);
                if (!names.includes('town')) stmts.push(`ALTER TABLE addresses ADD COLUMN town TEXT`);
                if (!names.includes('country')) stmts.push(`ALTER TABLE addresses ADD COLUMN country TEXT`);
                if (!names.includes('isDefault')) stmts.push(`ALTER TABLE addresses ADD COLUMN isDefault INTEGER DEFAULT 0`);
                if (!names.includes('createdAt')) stmts.push(`ALTER TABLE addresses ADD COLUMN createdAt TEXT`);

                function runNext(i) {
                  if (i >= stmts.length) return done(null);
                  db.run(stmts[i], [], (sErr) => {
                    // ignore errors for ALTER if column already exists on some platforms
                    if (sErr) console.warn('Migration statement failed:', stmts[i], sErr && sErr.message ? sErr.message : sErr);
                    runNext(i + 1);
                  });
                }
                runNext(0);
              });
            }
          }
        ];

        // apply migrations sequentially
        function applyNext(i) {
          if (i >= migrations.length) return resolve();
          const m = migrations[i];
          db.get(`SELECT id FROM migrations WHERE name = ?`, [m.name], (err, row) => {
            if (err) return resolve();
            if (row) return applyNext(i + 1); // already applied
            // run migration
            m.run((runErr) => {
              const now = new Date().toISOString();
              db.run(`INSERT INTO migrations (name, appliedAt) VALUES (?, ?)`, [m.name, now], (insErr) => {
                if (runErr) console.error('Migration', m.name, 'completed with error:', runErr);
                else console.log('Migration applied:', m.name);
                // continue regardless of insert error to avoid blocking startup
                applyNext(i + 1);
              });
            });
          });
        }

        applyNext(0);
      });
    });
  });
}

// Allow external scripts to initialize and use the same API that returns a promise
function pInit() {
  return new Promise((resolve, reject) => {
    init().then(resolve).catch(reject);
  });
}

function saveMessage(msg, cb) {
  db.run(`INSERT INTO messages (sender, text, time) VALUES (?, ?, ?)`, [msg.sender, msg.text, msg.time], function(err) {
    if (cb) cb(err, this && this.lastID);
  });
}

function getHistory(limit = 200, cb) {
  db.all(`SELECT sender, text, time FROM messages ORDER BY id DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) return cb(err);
    // reverse so oldest first
    cb(null, rows.reverse());
  });
}

// ---------- User helpers ----------
function createUser(user, cb) {
  const now = new Date().toISOString();
  db.run(`INSERT INTO users (email, passwordHash, name, googleId, facebookId, verified, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.email, user.passwordHash || null, user.name || null, user.googleId || null, user.facebookId || null, user.verified ? 1 : 0, now],
    function(err) {
      if (err) return cb(err);
      db.get(`SELECT id, email, name, phone, avatar, verified, googleId, facebookId, createdAt FROM users WHERE id = ?`, [this.lastID], cb);
    }
  );
}

function findUserByEmail(email, cb) {
  db.get(`SELECT id, email, name, phone, avatar, verified, googleId, facebookId, passwordHash FROM users WHERE email = ?`, [email], cb);
}

function findUserById(id, cb) {
  db.get(`SELECT id, email, name, phone, avatar, verified, googleId, facebookId, passwordHash, createdAt FROM users WHERE id = ?`, [id], cb);
}

function findUserByGoogleId(googleId, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId FROM users WHERE googleId = ?`, [googleId], cb);
}

function findUserByFacebookId(facebookId, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId FROM users WHERE facebookId = ?`, [facebookId], cb);
}

function updateUser(userId, fields, cb) {
  const name = fields.name || null;
  const phone = fields.phone || null;
  const email = fields.email || null;
  const avatar = fields.avatar || null;
  db.run(`UPDATE users SET name = ?, phone = ?, email = ?, avatar = ? WHERE id = ?`, [name, phone, email, avatar, userId], function(err) {
    if (err) return cb(err);
    findUserById(userId, cb);
  });
}

function linkProvider(userId, provider, providerId, cb) {
  const col = provider === 'google' ? 'googleId' : 'facebookId';
  db.run(`UPDATE users SET ${col} = ? WHERE id = ?`, [providerId, userId], function(err) {
    if (err) return cb(err);
    findUserById(userId, cb);
  });
}

function setVerified(userId, cb) {
  db.run(`UPDATE users SET verified = 1 WHERE id = ?`, [userId], function(err) {
    if (err) return cb(err);
    findUserById(userId, cb);
  });
}

// ---------- Address helpers ----------
function getAddressesByUser(userId, cb) {
  db.all(`SELECT id, label, line1, village, town, city, country, postal, isDefault FROM addresses WHERE userId = ? ORDER BY id DESC`, [userId], cb);
}

function createAddress(userId, addr, cb) {
  const now = new Date().toISOString();
  const isDef = addr.isDefault ? 1 : 0;
  // if new address should be default, clear others first
  // perform as a transaction to avoid race conditions
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const clearDefaults = isDef ? db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`) : null;
    if (clearDefaults) clearDefaults.run([userId]);

    db.run(`INSERT INTO addresses (userId, label, line1, village, town, city, country, postal, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, addr.label || null, addr.line1 || null, addr.village || null, addr.town || null, addr.city || null, addr.country || null, addr.postal || null, isDef, now], function(err) {
        if (err) {
          db.run('ROLLBACK');
          if (clearDefaults) clearDefaults.finalize();
          return cb(err);
        }
        const lastId = this.lastID;
        db.run('COMMIT', (cmErr) => {
          if (clearDefaults) clearDefaults.finalize();
          if (cmErr) {
            db.run('ROLLBACK');
            return cb(cmErr);
          }
          db.get(`SELECT id, label, line1, village, town, city, country, postal, isDefault FROM addresses WHERE id = ?`, [lastId], cb);
        });
      }
    );
  });
}

function updateAddress(userId, id, addr, cb) {
  // perform update in transaction to ensure default handling is atomic
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const clearDefaults = addr.isDefault ? db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`) : null;
    if (clearDefaults) clearDefaults.run([userId]);

    db.run(`UPDATE addresses SET label = ?, line1 = ?, village = ?, town = ?, city = ?, country = ?, postal = ?, isDefault = ? WHERE id = ? AND userId = ?`,
      [addr.label || null, addr.line1 || null, addr.village || null, addr.town || null, addr.city || null, addr.country || null, addr.postal || null, addr.isDefault ? 1 : 0, id, userId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          if (clearDefaults) clearDefaults.finalize();
          return cb(err);
        }
        db.run('COMMIT', (cmErr) => {
          if (clearDefaults) clearDefaults.finalize();
          if (cmErr) {
            db.run('ROLLBACK');
            return cb(cmErr);
          }
          db.get(`SELECT id, label, line1, village, town, city, country, postal, isDefault FROM addresses WHERE id = ?`, [id], cb);
        });
      }
    );
  });
}

function deleteAddress(userId, id, cb) {
  db.run(`DELETE FROM addresses WHERE id = ? AND userId = ?`, [id, userId], function(err) {
    if (err) return cb(err);
    cb(null, { deleted: this.changes });
  });
}

function setDefaultAddress(userId, id, cb) {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`, [userId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return cb(err);
      }
      db.run(`UPDATE addresses SET isDefault = 1 WHERE id = ? AND userId = ?`, [id, userId], function(err2) {
        if (err2) {
          db.run('ROLLBACK');
          return cb(err2);
        }
        db.run('COMMIT', (cmErr) => {
          if (cmErr) {
            db.run('ROLLBACK');
            return cb(cmErr);
          }
          db.get(`SELECT id, label, line1, village, town, city, country, postal, isDefault FROM addresses WHERE id = ?`, [id], cb);
        });
      });
    });
  });
}

module.exports = {
  init,
  saveMessage,
  getHistory,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  findUserByFacebookId,
  updateUser,
  linkProvider,
  setVerified,
  // address helpers
  getAddressesByUser,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};

// simple health helpers
function countAddresses(cb) {
  db.get(`SELECT COUNT(*) AS cnt FROM addresses`, [], (err, row) => {
    if (err) return cb(err);
    cb(null, row && row.cnt ? row.cnt : 0);
  });
}

function getTableInfo(table, cb) {
  db.all(`PRAGMA table_info(${table})`, [], cb);
}

module.exports.countAddresses = countAddresses;
module.exports.getTableInfo = getTableInfo;
module.exports.pInit = pInit;


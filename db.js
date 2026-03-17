const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath);

function init() {
  db.serialize(() => {
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
      db.get(`SELECT id, email, name, verified, googleId, facebookId, createdAt FROM users WHERE id = ?`, [this.lastID], cb);
    }
  );
}

function findUserByEmail(email, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId, passwordHash FROM users WHERE email = ?`, [email], cb);
}

function findUserById(id, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId FROM users WHERE id = ?`, [id], cb);
}

function findUserByGoogleId(googleId, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId FROM users WHERE googleId = ?`, [googleId], cb);
}

function findUserByFacebookId(facebookId, cb) {
  db.get(`SELECT id, email, name, verified, googleId, facebookId FROM users WHERE facebookId = ?`, [facebookId], cb);
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

module.exports = { init, saveMessage, getHistory, createUser, findUserByEmail, findUserById, findUserByGoogleId, findUserByFacebookId, linkProvider, setVerified };


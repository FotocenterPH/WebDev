// Load environment variables from .env when present
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const db = require('./db');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// ===== ORDERS CONFIG =====
const ORDERS_PATH = 'G:\\My Drive\\C8FOCENTER\\orders';

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));

// ----- Session middleware -----
const sessionMiddleware = session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
});
app.use(sessionMiddleware);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.findUserById(id, function(err, user) {
    if (err) return done(err);
    done(null, user);
  });
});

// ===== AUTH API =====
app.post('/api/signup', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  db.findUserByEmail(email, (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const hash = bcrypt.hashSync(password, 10);
    db.createUser({ email, passwordHash: hash, name, verified: 0 }, (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      req.login(user, function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  db.findUserByEmail(email, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !user.passwordHash) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    req.login(user, function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.logout(() => {});
  req.session.destroy(err => {
    res.json({ success: !err });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

// OAuth routes (only active when passport strategies configured)


// Configure Google strategy if env vars provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || 'http://localhost:3000/auth/google/callback'
  }, function(accessToken, refreshToken, profile, done) {
    // Find or create user
    db.findUserByGoogleId(profile.id, function(err, user) {
      if (err) return done(err);
      if (user) return done(null, user);
      // create
      const newUser = { email: profile.emails && profile.emails[0] && profile.emails[0].value, name: profile.displayName, googleId: profile.id, verified: 1 };
      db.createUser(newUser, function(err, created) {
        if (err) return done(err);
        done(null, created);
      });
    });
  }));
}

// Configure Facebook strategy if env vars provided
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK || 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
  }, function(accessToken, refreshToken, profile, done) {
    db.findUserByFacebookId(profile.id, function(err, user) {
      if (err) return done(err);
      if (user) return done(null, user);
      const newUser = { email: profile.emails && profile.emails[0] && profile.emails[0].value, name: profile.displayName, facebookId: profile.id, verified: 1 };
      db.createUser(newUser, function(err, created) {
        if (err) return done(err);
        done(null, created);
      });
    });
  }));
}

// Serve frontend static files from parent directory (project root)
const publicPath = path.join(__dirname, '..');
app.use(express.static(publicPath));

// OAuth routes (only active when passport strategies configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    // successful login - respond with a small page that closes the popup and reloads the opener
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Authentication Successful</title></head><body>
      <script>
        (function(){
          try {
            if (window.opener && !window.opener.closed) {
              // reload the main window so it picks up the authenticated session
              window.opener.location.reload();
              window.close();
            } else {
              // not opened as a popup - navigate to app
              window.location = '/';
            }
          } catch (e) {
            window.location = '/';
          }
        })();
      </script>
      <p>Authentication successful. You can close this window.</p>
    </body></html>`;
    res.send(html);
  });
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
    // successful login - close popup and reload opener when used as popup
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Authentication Successful</title></head><body>
      <script>
        (function(){
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.location.reload();
              window.close();
            } else {
              window.location = '/';
            }
          } catch (e) {
            window.location = '/';
          }
        })();
      </script>
      <p>Authentication successful. You can close this window.</p>
    </body></html>`;
    res.send(html);
  });
}

const server = http.createServer(app);
const io = new Server(server);

// init DB
db.init();

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('getHistory', () => {
    db.getHistory(200, (err, rows) => {
      if (err) {
        socket.emit('history', []);
        return;
      }
      socket.emit('history', rows);
    });
  });

  socket.on('message', (msg) => {
    // msg: { sender, text, time }
    if (!msg || !msg.text) return;
    const message = {
      sender: msg.sender || 'user',
      text: msg.text,
      time: msg.time || new Date().toLocaleTimeString()
    };

    // save to DB
    db.saveMessage(message, (err) => {
      if (err) console.error('DB save error', err);
    });

    // broadcast to other clients
    socket.broadcast.emit('message', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// ===== ORDER API =====
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, username, orderCount, photos, conditionFile, endFile, receiptFile, receiptPDF } = req.body;

    if (!orderId || !photos || photos.length === 0) {
      return res.status(400).json({ error: 'Missing orderId or photos' });
    }

    const folderName = `${username}_${orderCount}_${orderId}`;
    const orderDir = path.join(ORDERS_PATH, folderName);
    const photosDir = path.join(orderDir, 'Photos');

    fs.mkdirSync(photosDir, { recursive: true });

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.data) {
        const buffer = Buffer.from(photo.data, 'base64');
        fs.writeFileSync(path.join(photosDir, `${i + 1}.jpg`), buffer);
      }
    }

    if (conditionFile) fs.writeFileSync(path.join(orderDir, 'Condition.txt'), conditionFile);
    if (endFile) fs.writeFileSync(path.join(orderDir, 'End.txt'), endFile);
    if (receiptFile) fs.writeFileSync(path.join(orderDir, 'OrderReceipt.txt'), receiptFile);
    if (receiptPDF) {
      const pdfBuffer = Buffer.from(receiptPDF, 'base64');
      fs.writeFileSync(path.join(orderDir, 'Receipt.pdf'), pdfBuffer);
    }

    console.log(`✅ Order saved: ${folderName} (${photos.length} photos)`);
    res.json({ success: true, orderId, folderName });
  } catch (error) {
    console.error('❌ Order failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

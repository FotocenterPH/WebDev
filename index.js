// Load environment variables from .env when present
require('dotenv').config();
// global crash handlers to log and avoid silent exits
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
});
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
const PDFKit = require('pdfkit');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const app = express();
// Allow CORS from the browser origin (used when accessing the site via ngrok)
app.use(cors({ origin: true, credentials: true }));
// When running behind a proxy / tunnel (ngrok) trust the first proxy so secure cookies work
app.set('trust proxy', 1);
app.use(express.json({ limit: '200mb' }));
// Parse URL-encoded bodies (facebook sends signed_request as form field)
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// ----- Session middleware -----
// Determine if we should use secure cookies and SameSite settings.
// Do not force secure cookies when running automated tests (test environment uses HTTP)
const isSecureCookie = (process.env.NODE_ENV !== 'test') && (
  (process.env.FACEBOOK_CALLBACK && process.env.FACEBOOK_CALLBACK.startsWith('https')) ||
  (process.env.GOOGLE_CALLBACK && process.env.GOOGLE_CALLBACK.startsWith('https')) ||
  (process.env.NODE_ENV === 'production')
);

const sessionMiddleware = session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !!isSecureCookie, // require HTTPS for cookie when using ngrok HTTPS or production
    httpOnly: true,
    sameSite: isSecureCookie ? 'none' : 'lax'
  }
});
app.use(sessionMiddleware);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  console.log('passport.serializeUser', user && user.id);
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.findUserById(id, function(err, user) {
    if (err) return done(err);
    console.log('passport.deserializeUser', id, !!user);
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
        // ensure session is saved before responding so test agent receives the cookie
        req.session.save(function(err4) {
          if (err4) return res.status(500).json({ error: err4.message });
          res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
        });
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
      req.session.save(function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
      });
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

app.post('/api/me', (req, res) => {
  console.log('POST /api/me - req.user:', !!req.user, req.user && req.user.id);
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
  const { name, phone, email } = req.body || {};
  db.updateUser(req.user.id, { name, phone, email }, (err, updated) => {
    if (err) {
      console.error('updateUser error', err);
      return res.status(500).json({ error: err && err.message ? err.message : 'Update failed' });
    }
    res.json({ success: true, user: updated });
  });
});

// ---------- Addresses API ----------
// Addresses API: add/get/update/delete/set-default
// Note: simple auth check uses req.user set by passport session
app.get('/api/addresses', (req, res) => {
  try {
    console.log('GET /api/addresses - req.user:', !!req.user, req.user && req.user.id);
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
    db.getAddressesByUser(req.user.id, (err, rows) => {
      if (err) {
        console.error('DB.getAddressesByUser error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ addresses: rows });
    });
  } catch (ex) {
    console.error('Exception in GET /api/addresses:', ex && ex.stack ? ex.stack : ex);
    res.status(500).json({ error: ex && ex.message ? ex.message : 'Internal error' });
  }
});

app.post('/api/addresses', (req, res) => {
  try {
    console.log('POST /api/addresses - req.user:', !!req.user, req.user && req.user.id, 'body keys:', Object.keys(req.body || {}));
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
    const { label, line1, village, town, city, country, postal, isDefault } = req.body || {};
    if (!line1) return res.status(400).json({ error: 'line1 required' });
    db.createAddress(req.user.id, { label, line1, village, town, city, country, postal, isDefault: !!isDefault }, (err, created) => {
      if (err) {
        console.error('DB.createAddress error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ address: created });
    });
  } catch (ex) {
    console.error('Exception in POST /api/addresses:', ex && ex.stack ? ex.stack : ex);
    res.status(500).json({ error: ex && ex.message ? ex.message : 'Internal error' });
  }
});

app.put('/api/addresses/:id', (req, res) => {
  try {
    console.log('PUT /api/addresses/:id - req.user:', !!req.user, req.user && req.user.id, 'id:', req.params.id, 'body keys:', Object.keys(req.body || {}));
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
    const id = req.params.id;
    const { label, line1, village, town, city, country, postal, isDefault } = req.body || {};
    db.updateAddress(req.user.id, id, { label, line1, village, town, city, country, postal, isDefault: !!isDefault }, (err, updated) => {
      if (err) {
        console.error('DB.updateAddress error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ address: updated });
    });
  } catch (ex) {
    console.error('Exception in PUT /api/addresses/:id:', ex && ex.stack ? ex.stack : ex);
    res.status(500).json({ error: ex && ex.message ? ex.message : 'Internal error' });
  }
});

app.delete('/api/addresses/:id', (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
  const id = req.params.id;
  db.deleteAddress(req.user.id, id, (err, info) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/addresses/:id/default', (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
  const id = req.params.id;
  db.setDefaultAddress(req.user.id, id, (err, updated) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ address: updated });
  });
});
// Orders endpoint - requires authentication. Saves a simple order bundle to disk.
app.post('/api/orders', async (req, res) => {
  try {
    console.log('POST /api/orders - req.user:', !!req.user, req.user && req.user.id);
    console.log('POST /api/orders - incoming cookies:', req.headers && req.headers.cookie, 'sessionID:', req.sessionID, 'session present:', !!req.session);
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });

    const { orderId, username, orderCount, photos, conditionFile, endFile, receiptFile, receiptPDF } = req.body || {};

    // Ensure orders directory exists
    try { fs.mkdirSync(ORDERS_PATH, { recursive: true }); } catch (e) { console.warn('Could not create orders dir', e); }

    const dirName = orderId || `order-${Date.now()}`;
    const orderDir = path.join(ORDERS_PATH, dirName);
    try { fs.mkdirSync(orderDir, { recursive: true }); } catch (e) { console.error('Failed to create order dir', e); }

    // Write metadata
    // Prefer authoritative server-side user identity over any client-sent `username` field
    const serverIdentity = (req.user && (req.user.name || req.user.email)) || null;
    const meta = { orderId: orderId || dirName, username: serverIdentity || username || 'unknown', orderCount: orderCount || 0, photosCount: Array.isArray(photos) ? photos.length : 0, timestamp: new Date().toISOString() };
    try { fs.writeFileSync(path.join(orderDir, 'order.json'), JSON.stringify(meta, null, 2)); } catch (e) { console.error('Failed to write order.json', e); }

    if (conditionFile) {
      try { fs.writeFileSync(path.join(orderDir, 'condition.txt'), conditionFile, 'utf8'); } catch (e) {}
    }
    if (endFile) {
      try { fs.writeFileSync(path.join(orderDir, 'end.txt'), endFile, 'utf8'); } catch (e) {}
    }
    if (receiptFile) {
      try { fs.writeFileSync(path.join(orderDir, 'receipt.txt'), receiptFile, 'utf8'); } catch (e) {}
    }

    // Save photos (if provided as base64 data)
    if (Array.isArray(photos)) {
      photos.forEach((p, idx) => {
        try {
          if (p && p.data) {
            const filename = p.filename || `photo_${idx + 1}.jpg`;
            const bin = Buffer.from(p.data, 'base64');
            fs.writeFileSync(path.join(orderDir, filename), bin);
          }
        } catch (e) {
          console.error('Failed to save photo for order', e);
        }
      });
    }

    // Produce/save receipt.pdf. If the client supplied a PDF (`receiptPDF` base64)
    // preserve that file exactly so layout/content remain unchanged for both
    // customer download and the employee copy on disk. Otherwise generate a
    // minimal authoritative PDF with the customer's name/phone/address.
    const receiptPath = path.join(orderDir, 'receipt.pdf');
    try {
      // Determine effective user id: prefer passport-populated req.user, fall back to session-stored id
      const userId = (req.user && req.user.id) || (req.session && req.session.passport && req.session.passport.user) || null;

      // lookup addresses (may be empty)
      let defaultAddr = null;
      try {
        if (userId) {
          const addrs = await new Promise((resolve, reject) => db.getAddressesByUser(userId, (err, rows) => err ? reject(err) : resolve(rows)));
          if (Array.isArray(addrs) && addrs.length) defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
        }
      } catch (e) { /* ignore address lookup errors */ }

    

        // Generate authoritative PDF for customer download
      try {
        let freshUser = null;
        try {
          if (userId) {
            freshUser = await new Promise((resolve, reject) => db.findUserById(userId, (err, u) => err ? reject(err) : resolve(u)));
          }
        } catch (e) {
          // ignore lookup errors
        }
        // fallback to any req.user provided by passport
        if (!freshUser && req.user) freshUser = req.user;

          // Debug info: log resolved identities to help troubleshoot Guest/N/A issues
        try {
            console.log('ORDER PDF GEN - userId:', userId, 'req.user.id:', req.user && req.user.id, 'sessionUser:', req.session && req.session.passport && req.session.passport.user);
            console.log('ORDER PDF GEN - freshUser:', freshUser ? { id: freshUser.id, name: freshUser.name, email: freshUser.email, phone: freshUser.phone } : null);
            console.log('ORDER PDF GEN - defaultAddr:', defaultAddr ? { id: defaultAddr.id, line1: defaultAddr.line1, city: defaultAddr.city, country: defaultAddr.country } : null);
          } catch (e) {}

        // Helper: format a long single-line address into 2-3 readable lines
        function formatAddressLines(addr) {
          if (!addr) return [];
          const parts = String(addr).split(',').map(s => s.trim()).filter(Boolean);

          // detect postal code if last part looks numeric
          let postal = null;
          if (parts.length > 1 && /^\d{3,6}$/.test(parts[parts.length - 1])) {
            postal = parts.pop();
          }

          // country is expected to be the last remaining part
          let country = parts.length ? parts.pop() : null;

          // take last two parts as city/town pair when possible
          let cityPair = null;
          if (parts.length >= 2) {
            cityPair = parts.slice(-2).join(', ');
            parts.splice(parts.length - 2, 2);
          } else if (parts.length === 1) {
            cityPair = parts.pop();
          }

          const lines = [];
          if (parts.length) lines.push(parts.join(', '));
          if (cityPair) lines.push(cityPair);
          let lastLine = '';
          if (country) lastLine += country;
          if (postal) lastLine += (lastLine ? ', ' : '') + postal;
          if (lastLine) lines.push(lastLine);
          return lines.filter(Boolean);
        }

        await new Promise((resolve, reject) => {
          try {
            const doc = new PDFKit({ size: 'A4', margin: 40 });
            const out = fs.createWriteStream(receiptPath);
            out.on('finish', resolve);
            out.on('error', reject);
            doc.pipe(out);

            // Colors and layout
            const blue = '#3aa0e0';
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            // Header
            doc.fillColor(blue).fontSize(32).text('FOTOCENTER PH', { align: 'center' });
            doc.moveDown(0.2);
            doc.fillColor('#6b7280').fontSize(12).text('Order Receipt', { align: 'center' });
            doc.moveDown(0.6);
            doc.moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).strokeColor(blue).lineWidth(3).stroke();
            doc.moveDown(0.8);

            // Customer info (left) and Order meta (right)
            const leftX = doc.x;
            const rightX = doc.x + pageWidth * 0.55;
            const infoY = doc.y;

            const userName = (freshUser && (freshUser.name || freshUser.email)) || 'Guest';
            const userPhone = (freshUser && freshUser.phone) || 'N/A';

            doc.fillColor('#0b1220').fontSize(10).text('Customer', leftX, infoY);
            doc.moveDown(0.2);
            doc.fontSize(10).text(userName, { continued: false, underline: false });
            doc.text(userPhone);
            if (defaultAddr) {
              const parts = [defaultAddr.line1, defaultAddr.village, defaultAddr.town, defaultAddr.city, defaultAddr.postal, defaultAddr.country].filter(Boolean);
              const rawAddr = parts.join(', ');
              const addrLines = formatAddressLines(rawAddr);
              if (addrLines.length) {
                addrLines.forEach(line => doc.text(line));
              } else {
                doc.text(rawAddr);
              }
            } else {
              doc.text('N/A');
            }

            // Move back up to write right column
            const afterLeftY = doc.y;
            // write order meta on the right
            doc.y = infoY;
            doc.x = rightX;
            doc.fontSize(10).text(`Order No:`, { continued: true }).font('Helvetica-Bold').text(` ${meta.orderId}`, { continued: false }).font('Helvetica');
            doc.moveDown(0.2);
            doc.text(`Date: ${new Date(meta.timestamp).toLocaleDateString()}`);
            doc.text(`Time: ${new Date(meta.timestamp).toLocaleTimeString()}`);
            doc.text(`Currency: ${process.env.CURRENCY || 'USD'}`);

            // restore x,y for further content
            doc.x = leftX;
            doc.y = Math.max(afterLeftY + 6, doc.y + 6);

            doc.moveDown(0.5);

            // Items table header
            const tableTop = doc.y;
            const tableLeft = leftX;
            const colWidths = [40, 260, 80, 80, 80, 60]; // #, description, size, paper, qty, price

            // header background
            doc.rect(tableLeft, tableTop, pageWidth, 28).fill(blue);
            doc.fillColor('#ffffff').fontSize(10).text('#', tableLeft + 8, tableTop + 8);
            doc.text('Description', tableLeft + colWidths[0] + 8, tableTop + 8);
            doc.text('Size', tableLeft + colWidths[0] + colWidths[1] + 8, tableTop + 8);
            doc.text('Paper', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 8, tableTop + 8);
            doc.text('Qty', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, tableTop + 8);
            doc.text('Price', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 8, tableTop + 8);

            // table rows
            doc.fillColor('#0b1220').fontSize(10);
            const items = Array.isArray(photos) && photos.length ? photos : (Array.isArray(req.body.items) ? req.body.items : []);
            if (items.length === 0) {
              // single summary row when no detailed items
              const rowY = tableTop + 34;
              doc.rect(tableLeft, rowY - 6, pageWidth, 24).fill('#f8fafc');
              doc.fillColor('#0b1220').text('1', tableLeft + 8, rowY);
              doc.text('Photo Book', tableLeft + colWidths[0] + 8, rowY);
              doc.text('11x8.5', tableLeft + colWidths[0] + colWidths[1] + 8, rowY);
              doc.text('Premium', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 8, rowY);
              doc.text(String(meta.photosCount || 1), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, rowY);
              doc.text('$0.00', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 8, rowY);
              doc.fillColor('#0b1220');
              doc.y = rowY + 36;
            } else {
              let rowY = tableTop + 34;
              items.forEach((it, idx) => {
                doc.rect(tableLeft, rowY - 6, pageWidth, 24).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc');
                const desc = it.description || it.filename || 'Photo';
                const size = it.size || 'N/A';
                const paper = it.paper || 'N/A';
                const qty = it.qty != null ? String(it.qty) : '1';
                const price = it.price != null ? `$${Number(it.price).toFixed(2)}` : '$0.00';
                doc.fillColor('#0b1220').text(String(idx + 1), tableLeft + 8, rowY);
                doc.text(desc, tableLeft + colWidths[0] + 8, rowY);
                doc.text(size, tableLeft + colWidths[0] + colWidths[1] + 8, rowY);
                doc.text(paper, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + 8, rowY);
                doc.text(qty, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, rowY);
                doc.text(price, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 8, rowY);
                rowY += 28;
              });
              doc.y = rowY + 8;
            }

            // draw a thin blue rule after table
            doc.moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).strokeColor(blue).lineWidth(2).stroke();
            doc.moveDown(0.8);

            // Totals and payment summary on right
            const rightBoxX = leftX + pageWidth * 0.55;
            const rightBoxY = doc.y;
            doc.fontSize(10).fillColor('#6b7280').text('Subtotal (ex. VAT):', rightBoxX, rightBoxY);
            doc.font('Helvetica-Bold').fillColor('#0b1220').text('$0.00', rightBoxX + 180, rightBoxY);
            doc.font('Helvetica').fillColor('#6b7280').text('VAT Rate:', rightBoxX, rightBoxY + 18);
            doc.fillColor('#0b1220').text('12%', rightBoxX + 180, rightBoxY + 18);
            doc.moveDown(2);

            // Payment info box
            const payBoxY = doc.y + 8;
            doc.rect(leftX, payBoxY, pageWidth, 72).fill('#f8fafc');
            doc.fillColor('#0b1220').fontSize(10).text('Payment Information', leftX + 8, payBoxY + 8);
            doc.fillColor('#475569').fontSize(10).text(`Date: ${new Date(meta.timestamp).toLocaleDateString()}`, leftX + 8, payBoxY + 28);
            doc.text(`Time: ${new Date(meta.timestamp).toLocaleTimeString()}`, leftX + 220, payBoxY + 28);
            doc.text(`Method: ${req.body.paymentMethod || 'Online Payment'}`, leftX + 8, payBoxY + 44);
            doc.text(`Amount: $${(req.body.amount || 0).toFixed ? Number(req.body.amount || 0).toFixed(2) : req.body.amount || '0.00'}`, leftX + 220, payBoxY + 44);

            // Footer
            doc.moveDown(6);
            doc.fillColor('#6b7280').fontSize(10).text('FOTOCENTER PH', { align: 'center' });
            doc.fontSize(9).fillColor('#94a3b8').text('St. Agatha Homes, Malolos, Bulacan, Philippines', { align: 'center' });
            doc.end();
          } catch (e) {
            reject(e);
          }
        });
        console.log('Generated authoritative receipt.pdf for customer for order', meta.orderId);
      } catch (e) {
        console.error('Receipt generation failed (will continue):', e && e.message ? e.message : e);
      }
    } catch (e) {
      console.error('Receipt generation/saving failed (will continue):', e && e.message ? e.message : e);
    }

    // Keep existing delivery: customers use the same download action and employees use the drive folder.
    // Append a timestamp query to avoid browser caching so the client always downloads the newly-generated PDF.
    const receiptUrl = `/orders/${path.basename(orderDir)}/receipt.pdf?ts=${Date.now()}`;
    return res.json({ success: true, orderId: meta.orderId, receiptUrl });
  } catch (err) {
    console.error('POST /api/orders error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Order processing failed' });
  }
});
// Addresses and settings endpoints removed per request

// Settings-related endpoints removed per request

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
    console.log('FacebookStrategy verify - profile id:', profile && profile.id);
    // Helpful debug logging of profile data when troubleshooting
    try { console.log('Facebook profile:', { id: profile.id, displayName: profile.displayName, emails: profile.emails }); } catch (e) {}
    db.findUserByFacebookId(profile.id, function(err, user) {
      if (err) {
        console.error('Error finding user by Facebook ID:', err);
        return done(err);
      }
      if (user) return done(null, user);
      const newUser = { email: profile.emails && profile.emails[0] && profile.emails[0].value, name: profile.displayName, facebookId: profile.id, verified: 1 };
      db.createUser(newUser, function(err, created) {
        if (err) {
          console.error('Error creating user from Facebook profile:', err);
          return done(err);
        }
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
  // Request both email and public_profile to ensure basic profile data is returned
  // Request only public_profile for testing to avoid scope errors while app is unpublished
  app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile'] }));
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
// Configure Socket.IO CORS to mirror the incoming origin and allow credentials
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// init DB and register Socket.IO handlers after DB ready
// Only start the server when this file is executed directly. When required from tests
// we export the Express `app` without starting the listener so tests can control the server lifecycle.
if (require.main === module) {
  db.init().then(() => {
    console.log('DB initialized');

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

    // start server only after DB initialized and socket handlers registered
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

  }).catch(err => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
}

// Export app for tests that require this module. Tests will start/stop the server as needed.
module.exports = app;

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// health endpoint for debugging DB/table state
app.get('/health', async (req, res) => {
  try {
    // count addresses and return schema info
    db.countAddresses((err, cnt) => {
      if (err) return res.status(500).json({ error: 'count failed', details: err.message });
      db.getTableInfo('addresses', (err2, info) => {
        if (err2) return res.status(500).json({ error: 'table info failed', details: err2.message });
        res.json({ ok: true, addressesCount: cnt, addressesTable: info });
      });
    });
  } catch (ex) {
    res.status(500).json({ ok: false, error: ex && ex.message ? ex.message : 'unknown' });
  }
});

// Serve empty favicon to avoid noisy 404 in browser console
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Simple in-memory deletion ticket store (persist to disk optionally)
const deletionStore = {};

function urlBase64Decode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function parseSignedRequest(signedRequest) {
  const parts = signedRequest.split('.');
  if (parts.length !== 2) throw new Error('Invalid signed_request format');
  const encodedSig = parts[0];
  const encodedPayload = parts[1];

  const sig = urlBase64Decode(encodedSig);
  const payload = JSON.parse(urlBase64Decode(encodedPayload).toString('utf8'));

  const appSecret = process.env.FACEBOOK_APP_SECRET || '';
  const expectedSig = crypto.createHmac('sha256', appSecret).update(encodedPayload).digest();

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
    throw new Error('Invalid signed_request signature');
  }

  return payload;
}

// Facebook Data Deletion Callback
app.post('/facebook/data-deletion', (req, res) => {
  try {
    const signed = req.body.signed_request || req.query.signed_request;
    if (!signed) return res.status(400).send('signed_request required');

    const data = parseSignedRequest(signed);
    // data.user_id contains the FB user id
    const fbUserId = data.user_id || (data.user && data.user.user_id) || null;

    // generate a ticket to track deletion
    const ticket = 'del-' + Date.now().toString(36);
    deletionStore[ticket] = { fbUserId, status: 'in_progress', createdAt: new Date().toISOString() };

    // TODO: enqueue actual deletion job here (remove user data from DB, IndexedDB references, files)
    // For demo, mark completed after short delay
    setTimeout(() => {
      deletionStore[ticket].status = 'completed';
      deletionStore[ticket].completedAt = new Date().toISOString();
    }, 3000);

    const hostBase = process.env.PUBLIC_BASE_URL || (`${req.protocol}://${req.get('host')}`);
    const statusUrl = `${hostBase.replace(/\/$/, '')}/privacy/deletion-status?ticket=${ticket}`;

    return res.json({ url: statusUrl });
  } catch (err) {
    console.error('Data deletion verify failed:', err);
    return res.status(400).send('Invalid signed_request');
  }
});

app.get('/privacy/deletion-status', (req, res) => {
  const ticket = req.query.ticket;
  if (!ticket) return res.status(400).send('ticket required');
  const entry = deletionStore[ticket];
  if (!entry) return res.status(404).send('ticket not found');

  // render simple status page
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Data Deletion Status</title></head><body style="font-family:Arial,Helvetica,sans-serif;padding:20px;line-height:1.6;color:#222;"><h1>Data Deletion Status</h1><p>Ticket: <strong>${ticket}</strong></p><p>Status: <strong>${entry.status}</strong></p><p>Requested: ${entry.createdAt}</p>${entry.completedAt ? `<p>Completed: ${entry.completedAt}</p>` : ''}<p>If you have questions contact support at <a href="mailto:kyle.baltazar@fotocenter.se">kyle.baltazar@fotocenter.se</a></p></body></html>`);
});

// server is started after DB init; do not start here to avoid duplicate listen

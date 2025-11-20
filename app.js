// backend/app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 6767);

// Optional DB service (ok if you don't have it)
let db = null;
try {
  const DbService = require('./dbService');
  db = (typeof DbService.getDbServiceInstance === 'function')
    ? DbService.getDbServiceInstance()
    : new DbService();
} catch {
  db = null;
}

/* ---------- middleware ---------- */
app.use(cors({
  origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------- health ---------- */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    port: PORT,
    db: db ? 'configured' : 'not-loaded',
  });
});

app.get('/health/db', async (_req, res) => {
  if (!db || typeof db.ping !== 'function') {
    return res.json({ ok: true, db: 'skipped (no dbService)' });
  }
  try {
    const pong = await db.ping();
    res.json({ ok: true, pong });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ---------- API routes ---------- */
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// serve uploaded photos too (backend/uploads)
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

/* ---------- static frontend (if you run `vite build`) ---------- */
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distDir));

// SPA fallback – any non-/api route goes to index.html
app.get(/^\/(?!api).*/, (req, res, next) => {
  // if dist doesn't exist yet, just go next
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

/* ---------- API 404 ---------- */
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* ---------- start ---------- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});

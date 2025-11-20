// server.js
console.log('[BOOT] server.js from', __filename);
process.on('uncaughtException',  e => { console.error('[UNCAUGHT]', e); });
process.on('unhandledRejection', e => { console.error('[UNHANDLED]', e); });

require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const { q } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // simple unique name: timestamp + original
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    // accept images only
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image files allowed'));
    cb(null, true);
  }
});

// serve static files so the browser can view them
app.use('/uploads', express.static(uploadDir));

/* ---------- health ---------- */
app.get('/health', async (_req, res) => {
  try {
    const r = await q('SELECT 1 AS ok');
    res.json({ ok: true, db: r[0].ok === 1 });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

/* ---------- clients ---------- */
app.get('/api/clients', async (_req, res) => {
  try { res.json(await q('SELECT * FROM clients ORDER BY id')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const r = await q(
      'INSERT INTO clients(name,email,phone,address) VALUES (?,?,?,?)',
      [name, email, phone, address]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- service requests ---------- */
app.get('/api/requests', async (_req, res) => {
  try {
    const sql = `SELECT sr.*, c.name AS client_name
                 FROM service_requests sr JOIN clients c ON c.id=sr.client_id
                 ORDER BY sr.created_at DESC`;
    res.json(await q(sql));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/requests', async (req, res) => {
  const { client_id, service_address, cleaning_type, rooms, preferred_start, preferred_end, proposed_budget, notes } = req.body;
  try {
    const r = await q(
      `INSERT INTO service_requests
       (client_id, service_address, cleaning_type, rooms, preferred_start, preferred_end, proposed_budget, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [client_id, service_address, cleaning_type, rooms, preferred_start, preferred_end, proposed_budget, notes]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- quotes & responses ---------- */
app.post('/api/quotes', async (req, res) => {
  const { request_id, adjusted_price, scheduled_start, scheduled_end, note } = req.body;
  try {
    const r = await q(
      `INSERT INTO quotes(request_id, adjusted_price, scheduled_start, scheduled_end, note)
       VALUES (?,?,?,?,?)`,
      [request_id, adjusted_price, scheduled_start, scheduled_end, note]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/quotes/:id/respond', async (req, res) => {
  const { id } = req.params;
  const { actor, action, message } = req.body;
  try {
    await q(`INSERT INTO quote_responses(quote_id, actor, action, message) VALUES (?,?,?,?)`,
            [id, actor, action, message]);
    if (['accepted','rejected','countered'].includes(action)) {
      await q(`UPDATE quotes SET state=? WHERE id=?`, [action === 'accepted' ? 'accepted' : action, id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- orders ---------- */
app.post('/api/orders', async (req, res) => {
  const { request_id, quote_id } = req.body;
  try {
    const r = await q(`INSERT INTO orders(request_id, quote_id) VALUES (?,?)`, [request_id, quote_id]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- invoices & payments ---------- */
app.get('/api/invoices/overdue', async (_req, res) => {
  try { res.json(await q('SELECT * FROM v_overdue_invoices')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payments', async (req, res) => {
  const { invoice_id, payment_date, amount, method, reference } = req.body;
  try {
    const r = await q(
      `INSERT INTO payments(invoice_id, payment_date, amount, method, reference)
       VALUES (?,?,?,?,?)`,
      [invoice_id, payment_date, amount, method, reference]
    );
    await q(
      `UPDATE invoices i
         JOIN (SELECT invoice_id, SUM(amount) s FROM payments WHERE invoice_id=? GROUP BY invoice_id) p
           ON p.invoice_id = i.id
       SET i.status = IF(p.s >= i.total, 'paid', i.status)
       WHERE i.id=?`,
      [invoice_id, invoice_id]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
// POST /api/requests/:id/photos  (up to 5 total per request)
app.post('/api/requests/:id/photos', upload.array('photos', 5), async (req, res) => {
  const requestId = Number(req.params.id);
  try {
    // how many already saved?
    const existing = await q('SELECT COUNT(*) AS cnt FROM request_photos WHERE request_id=?', [requestId]);
    let used = existing[0].cnt;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded (field name must be "photos")' });
    }
    if (used + req.files.length > 5) {
      return res.status(400).json({ error: `Too many photos. Already have ${used}, can only add ${5 - used} more.` });
    }

    const inserted = [];
    for (const f of req.files) {
      used += 1;
      const relPath = `uploads/${f.filename}`; // stable path you can render in the UI
      await q(
        `INSERT INTO request_photos (request_id, photo_index, file_path)
         VALUES (?,?,?)`,
        [requestId, used, relPath]
      );
      inserted.push({ photo_index: used, file_path: relPath });
    }
    res.json({ ok: true, count: inserted.length, photos: inserted });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

/* ---------- invoices ---------- */
app.post('/api/invoices', async (req, res) => {
  const { client_id, project_id = null, order_id = null, invoice_date, due_date, total, status = 'sent' } = req.body;
  try {
    const r = await q(
      `INSERT INTO invoices (client_id, project_id, order_id, invoice_date, due_date, total, status)
       VALUES (?,?,?,?,?,?,?)`,
      [client_id, project_id, order_id, invoice_date, due_date, total, status]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/invoices', async (_req, res) => {
  try {
    const sql = `SELECT i.*, c.name AS client_name
                 FROM invoices i JOIN clients c ON c.id=i.client_id
                 ORDER BY i.invoice_date DESC, i.id DESC`;
    res.json(await q(sql));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- bill responses ---------- */
app.get('/api/invoices/:id/thread', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await q(
      `SELECT br.*, i.client_id
       FROM bill_responses br JOIN invoices i ON i.id=br.invoice_id
       WHERE br.invoice_id=? ORDER BY br.created_at ASC`, [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/invoices/:id/respond', async (req, res) => {
  const { id } = req.params;
  const { actor, action, note } = req.body;
  try {
    await q(`INSERT INTO bill_responses (invoice_id, actor, action, note) VALUES (?,?,?,?)`,
            [id, actor, action, note || null]);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- list helpers ---------- */
app.get('/api/quotes', async (_req, res) => {
  try {
    const sql = `SELECT q.*, c.name AS client_name
                 FROM quotes q
                 JOIN service_requests sr ON sr.id=q.request_id
                 JOIN clients c ON c.id=sr.client_id
                 ORDER BY q.created_at DESC`;
    res.json(await q(sql));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/quotes/:id/thread', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await q(`SELECT * FROM quote_responses WHERE quote_id=? ORDER BY created_at ASC`, [id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const sql = `SELECT o.*, c.name AS client_name
                 FROM orders o
                 JOIN service_requests sr ON sr.id=o.request_id
                 JOIN clients c ON c.id=sr.client_id
                 ORDER BY o.accepted_at DESC, o.id DESC`;
    res.json(await q(sql));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ---------- reports ---------- */
app.get('/api/reports/prospects',      async (_r, res)=> res.json(await q('SELECT * FROM v_prospective_clients')));
app.get('/api/reports/uncommitted',    async (_r, res)=> res.json(await q('SELECT * FROM v_uncommitted_clients')));
app.get('/api/reports/accepted-by-mo', async (_r, res)=> res.json(await q('SELECT * FROM v_accepted_quotes_by_month')));
app.get('/api/reports/largest-job',    async (_r, res)=> res.json(await q('SELECT * FROM v_largest_completed_job')));
app.get('/api/reports/client-health',  async (_r, res)=> res.json(await q('SELECT * FROM v_client_health')));
// GET /api/requests/:id/photos
app.get('/api/requests/:id/photos', async (req, res) => {
  try {
    const rows = await q(
      'SELECT id, request_id, photo_index, file_path, uploaded_at FROM request_photos WHERE request_id=? ORDER BY photo_index',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/requests/:rid/photos/:pid  (optional)
app.delete('/api/requests/:rid/photos/:pid', async (req, res) => {
  try {
    const [{ file_path } = {}] = await q('SELECT file_path FROM request_photos WHERE id=? AND request_id=?',
                                         [req.params.pid, req.params.rid]);
    if (!file_path) return res.status(404).json({ error: 'Not found' });
    await q('DELETE FROM request_photos WHERE id=? AND request_id=?', [req.params.pid, req.params.rid]);

    // try to remove the file (ignore errors if already gone)
    fs.unlink(path.join(__dirname, file_path), () => {});
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ---------- 404 ---------- */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ---------- SINGLE listen ---------- */
const port = Number(process.env.PORT) || 6767;
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => {
  console.log(`[API] listening on http://${host}:${port}`);
});
server.on('close', () => console.log('[API] server closed'));
server.on('error', (err) => console.error('[API] server error', err));

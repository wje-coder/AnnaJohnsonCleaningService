// backend/routes/api.js
const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool, q } = require('../db'); // shared DB helper

// ===== ADMIN CONSTANTS (hardcoded for Anna) =====
const ADMIN_USER = 'anna_johnson';
const ADMIN_PASS = '2001cleaningserviceAJ';
const ADMIN_TOKEN = 'super-secret-anna-token'; // frontend sends this in x-admin-token

// 1) Stripe setup (optional)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn(
    '[API] STRIPE_SECRET_KEY is not set in .env – /api/register (with card) will not work'
  );
}

// 2) uploads dir + multer  (max 5 photos)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  dest: uploadDir,
  limits: { files: 5 }, // up to 5 images per request
});

// 3) Health check
router.get('/ping', (_req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

// 4) Username helpers
function generateUsername(name = '') {
  const adjectives = ['bright', 'quick', 'brave', 'calm', 'mighty', 'kind', 'sharp', 'sage'];
  const animals = ['fox', 'owl', 'hare', 'puma', 'otter', 'raven', 'lynx', 'wolf'];
  const n = Math.floor(Math.random() * 1000);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const base = `${adj}${animal}${n}`;
  const initials = name ? name.split(' ').map((s) => s[0]).join('').toLowerCase() : '';
  return (initials ? initials + '_' : '') + base;
}

async function ensureUniqueUsername(conn, name) {
  for (let i = 0; i < 6; i++) {
    const u = generateUsername(name);
    const [rows] = await conn.execute(
      'SELECT client_id AS id FROM clients WHERE username = ?',
      [u]
    );
    if (rows.length === 0) return u;
  }
  return generateUsername(name) + Date.now().toString().slice(-4);
}

/* ──────────────────────────────────────────
   A) SIMPLE REGISTER (no Stripe)
   POST /api/auth/register-basic
   ────────────────────────────────────────── */
router.post('/auth/register-basic', async (req, res) => {
  const { name, email, phone, address, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const conn = await pool.getConnection();
  try {
    const username = await ensureUniqueUsername(conn, name);
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await conn.execute(
      `INSERT INTO clients (username, name, email, phone, address, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, name || null, email, phone || null, address || null, passwordHash]
    );

    res.json({
      ok: true,
      username,
      client_id: result.insertId,
    });
  } catch (err) {
    console.error('[REGISTER-BASIC ERROR]', err);
    res.status(500).json({
      error: 'Registration failed',
      details: err.message,
    });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   ORDERS / BILLING / PAYMENT – LIST ORDERS
   GET /api/orders
   - client view: ?client_id=123
   - admin view:  no client_id, needs x-admin-token
   ────────────────────────────────────────── */
router.get('/orders', async (req, res) => {
  const { client_id } = req.query;

  try {
    // ===== CLIENT VIEW =====
    if (client_id) {
      const [rows] = await pool.execute(
        `SELECT
           o.order_id,
           o.request_id,
           o.client_id,
           o.status,
           o.total_amount,
           o.payment_status,
           o.payment_due_date,
           o.created_at,
           r.service_address,
           r.cleaning_type,
           -- combine notes from order + original request
           COALESCE(o.admin_note,  r.admin_note)  AS admin_note,
           COALESCE(o.client_note, r.client_note) AS client_note,
           c.cc_brand,
           RIGHT(c.cc_last4, 3) AS card_last3
         FROM orders o
         LEFT JOIN service_requests r
           ON r.request_id = o.request_id
         LEFT JOIN clients c
           ON c.client_id = o.client_id
         WHERE o.client_id = ?
         ORDER BY o.order_id DESC`,
        [client_id]
      );
      return res.json(rows);
    }

    // ===== ADMIN VIEW =====
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Admin only' });
    }

    const [rows] = await pool.query(
      `SELECT
         o.order_id,
         o.request_id,
         o.client_id,
         o.status,
         o.total_amount,
         o.payment_status,
         o.payment_due_date,
         o.created_at,
         r.service_address,
         r.cleaning_type,
         -- combined notes for receipt / history
         COALESCE(o.admin_note,  r.admin_note)  AS admin_note,
         COALESCE(o.client_note, r.client_note) AS client_note,
         c.name  AS client_name,
         c.email AS client_email,
         c.cc_brand,
         RIGHT(c.cc_last4, 3) AS card_last3
       FROM orders o
       LEFT JOIN service_requests r
         ON r.request_id = o.request_id
       LEFT JOIN clients c
         ON c.client_id = o.client_id
       ORDER BY o.order_id DESC`
    );

    return res.json(rows);
  } catch (err) {
    console.error('[ORDERS LIST ERROR]', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


/* ──────────────────────────────────────────
   C) LOGIN (client)
   POST /api/auth/login
   ────────────────────────────────────────── */
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username (or email) and password required' });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT client_id AS id, username, name, email, password_hash FROM clients WHERE username = ? OR email = ? LIMIT 1',
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'No account found with that username/email' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   D) FULL REGISTER WITH STRIPE (optional)
   POST /api/register
   ────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { name, email, phone, address, payment_method, password } = req.body;

  if (!email || !payment_method) {
    return res.status(400).json({ error: 'email and payment_method required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'password required' });
  }
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: { app: 'CleaningService' },
    });

    await stripe.paymentMethods.attach(payment_method, {
      customer: customer.id,
    });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: payment_method },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const username = await ensureUniqueUsername(conn, name);

    await conn.execute(
      `INSERT INTO clients
       (username, name, email, phone, address, stripe_customer_id, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, name || null, email, phone || null, address || null, customer.id, passwordHash]
    );

    await conn.commit();
    res.json({ ok: true, username });
  } catch (err) {
    await conn.rollback();
    console.error('[REGISTER ERROR]', err);
    res.status(500).json({
      error: 'Registration failed',
      details: err.message,
    });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   E) CREATE CLEANING REQUEST (max 5 photos)
   POST /api/requests
   ────────────────────────────────────────── */
router.post('/requests', upload.array('photos', 5), async (req, res) => {
  const { client_id, service_address, cleaning_type, rooms, preferred_datetime, budget, notes } =
    req.body;

  if (!client_id || !service_address) {
    return res.status(400).json({ error: 'client_id and service_address required' });
  }

  const roomCount = rooms ? Number(rooms) : 1;
  let autoPrice = null;
  switch ((cleaning_type || 'basic').toLowerCase()) {
    case 'deep':
    case 'deep cleaning':
      autoPrice = 150 + 25 * (roomCount - 1);
      break;
    case 'move-out':
    case 'moveout':
      autoPrice = 200 + 30 * (roomCount - 1);
      break;
    default:
      autoPrice = 100 + 20 * (roomCount - 1);
      break;
  }

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO service_requests
         (client_id,
          service_address,
          cleaning_type,
          num_rooms,
          preferred_start,
          proposed_budget,
          notes,
          status,
          quote_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        service_address,
        cleaning_type || 'basic',
        roomCount,
        preferred_datetime || null,
        budget || null,
        notes || null,
        'quoted',
        autoPrice,
      ]
    );
    const requestId = result.insertId;

    // Handle file uploads, if any (up to 5)
    if (req.files && req.files.length) {
      for (const f of req.files) {
        try {
          await conn.execute(
            `INSERT INTO request_photos (request_id, file_path) VALUES (?, ?)`,
            [requestId, f.filename]
          );
        } catch (_) {
          // ignore per-file errors
        }
      }
    }

    return res.json({ ok: true, request_id: requestId, auto_quote: autoPrice });
  } catch (err) {
    console.error('[REQUEST CREATE ERROR]', err);
    return res.status(500).json({ error: 'Could not create request', details: err.message });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   F) LIST REQUESTS
   GET /api/requests
   ────────────────────────────────────────── */
router.get('/requests', async (req, res) => {
  const { client_id } = req.query;

  try {
    // ---------- CLIENT VIEW ----------
    // Only show requests that do NOT yet have an order
    if (client_id) {
      const [rows] = await pool.execute(
        `SELECT
           r.request_id AS id,
           r.client_id,
           r.service_address,
           r.cleaning_type,
           r.num_rooms       AS rooms,
           r.preferred_start AS preferred_datetime,
           r.proposed_budget AS budget,
           r.notes,
           r.status,
           r.quote_price,
           r.quote_time_window,
           r.admin_note,
           r.client_note,
           r.created_at,
           c.name  AS client_name,
           c.email AS client_email
         FROM service_requests r
         JOIN clients c ON c.client_id = r.client_id
         LEFT JOIN orders o ON o.request_id = r.request_id
         WHERE r.client_id = ?
           AND o.order_id IS NULL   -- hide any request that already became an order
         ORDER BY r.request_id DESC`,
        [client_id]
      );

      // attach photos
      for (const row of rows) {
        try {
          const [photos] = await pool.execute(
            'SELECT file_path FROM request_photos WHERE request_id = ?',
            [row.id]
          );
          row.photos = photos.map((p) => p.file_path);
        } catch (_) {
          row.photos = [];
        }
      }

      return res.json(rows);
    }

    // ---------- ADMIN VIEW ----------
    // Only show requests that do NOT yet have an order
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Admin only' });
    }

    const [rows] = await pool.query(
      `SELECT
         r.request_id AS id,
         r.client_id,
         r.service_address,
         r.cleaning_type,
         r.num_rooms       AS rooms,
         r.preferred_start AS preferred_datetime,
         r.proposed_budget AS budget,
         r.notes,
         r.status,
         r.quote_price,
         r.quote_time_window,
         r.admin_note,
         r.client_note,
         r.created_at,
         c.name  AS client_name,
         c.email AS client_email
       FROM service_requests r
       JOIN clients c ON c.client_id = r.client_id
       LEFT JOIN orders o ON o.request_id = r.request_id
       WHERE o.order_id IS NULL      -- hide anything that already has an order
       ORDER BY r.request_id DESC`
    );

    for (const row of rows) {
      try {
        const [photos] = await pool.execute(
          'SELECT file_path FROM request_photos WHERE request_id = ?',
          [row.id]
        );
        row.photos = photos.map((p) => p.file_path);
      } catch (_) {
        row.photos = [];
      }
    }

    return res.json(rows);
  } catch (err) {
    console.error('[REQUEST LIST ERROR]', err);
    res
      .status(500)
      .json({ error: 'Could not fetch requests', details: err.message });
  }
});


/* ──────────────────────────────────────────
   G) ADMIN LOGIN
   POST /api/admin/login
   ────────────────────────────────────────── */
/* ──────────────────────────────────────────
   G.5) ADMIN – LIST CLIENTS WITH STATS
   GET /api/admin/clients
   Optional ?q=searchText
   ────────────────────────────────────────── */
/* ──────────────────────────────────────────
   G) ADMIN LOGIN
   POST /api/admin/login
   ────────────────────────────────────────── */
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  console.log('[ADMIN LOGIN ATTEMPT]', username); // optional debug

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({
      ok: true,
      role: 'admin',
      name: 'Anna Johnson',
      token: ADMIN_TOKEN,
    });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

/* ──────────────────────────────────────────
   G.5) ADMIN – LIST CLIENTS (old route)
   GET /api/admin/clients
   Optional ?q=searchText
   (kept for compatibility)
   ────────────────────────────────────────── */
router.get('/admin/clients', async (req, res) => {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Admin login required.' });
  }

  const { q } = req.query;
  const params = [];
  let whereClause = '';

  if (q && q.trim() !== '') {
    const like = `%${q.trim()}%`;
    whereClause = `
      WHERE
        c.name LIKE ? OR
        c.username LIKE ? OR
        c.email LIKE ? OR
        c.address LIKE ?
    `;
    params.push(like, like, like, like);
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.client_id AS id,
        c.username,
        c.name,
        c.email,
        c.address,
        c.cc_last4,
        c.cc_brand,
        COUNT(o.order_id) AS total_jobs,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs,
        SUM(CASE WHEN o.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
        SUM(
          CASE
            WHEN o.payment_status IN ('due','overdue','disputed') THEN 1
            ELSE 0
          END
        ) AS late_or_overdue
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.client_id
      ${whereClause}
      GROUP BY
        c.client_id, c.username, c.name, c.email, c.address, c.cc_last4, c.cc_brand
      ORDER BY c.client_id DESC
      `,
      params
    );

    const clients = rows.map((r) => {
      const last4 = r.cc_last4 || '';
      const card_last3 = last4 ? last4.toString().slice(-3) : null;
      return {
        id: r.id,
        username: r.username,
        name: r.name,
        email: r.email,
        address: r.address,
        total_jobs: Number(r.total_jobs) || 0,
        completed: Number(r.completed_jobs) || 0,
        on_time_pay: Number(r.paid_orders) || 0,
        late_overdue: Number(r.late_or_overdue) || 0,
        cc_brand: r.cc_brand || null,
        card_last3,
        cc_last4: last4,
      };
    });

    return res.json({ ok: true, clients });
  } catch (err) {
    console.error('[ADMIN CLIENTS LIST ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error loading clients.',
      details: err.message,
    });
  }
});

/* ──────────────────────────────────────────
   NEW: ADMIN – CLIENT LIST FOR DASHBOARD TABLE
   GET /api/clients
   (used by your frontend's "Load Clients" button)
   ────────────────────────────────────────── */
router.get('/clients', async (req, res) => {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Admin login required.' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.client_id,
        c.username,
        c.name,
        c.email,
        c.address,
        c.cc_last4,
        c.cc_brand,
        COUNT(o.order_id) AS total_jobs,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs,
        -- treat "paid" as on-time for your dashboard
        SUM(CASE WHEN o.payment_status = 'paid' THEN 1 ELSE 0 END) AS on_time_payments,
        -- treat "overdue" as late
        SUM(CASE WHEN o.payment_status = 'overdue' THEN 1 ELSE 0 END) AS late_payments,
        -- open bills: due / overdue / disputed
        SUM(
          CASE WHEN o.payment_status IN ('due','overdue','disputed') THEN 1 ELSE 0 END
        ) AS open_orders,
        SUM(
          CASE WHEN o.payment_status IN ('due','overdue','disputed')
               THEN COALESCE(o.total_amount,0)
               ELSE 0
          END
        ) AS open_amount_due
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.client_id
      GROUP BY
        c.client_id, c.username, c.name, c.email, c.address, c.cc_last4, c.cc_brand
      ORDER BY total_jobs DESC, c.client_id ASC
      `
    );

    const clients = rows.map((r) => ({
      client_id: r.client_id,
      username: r.username,
      name: r.name,
      email: r.email,
      address: r.address,
      cc_last4: r.cc_last4,
      cc_brand: r.cc_brand,
      total_jobs: Number(r.total_jobs) || 0,
      completed_jobs: Number(r.completed_jobs) || 0,
      on_time_payments: Number(r.on_time_payments) || 0,
      late_payments: Number(r.late_payments) || 0,
      open_orders: Number(r.open_orders) || 0,
      open_amount_due: Number(r.open_amount_due) || 0,
    }));

    return res.json(clients); // <-- plain array, as your frontend expects
  } catch (err) {
    console.error('[ADMIN CLIENTS DASHBOARD ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error loading clients.',
      details: err.message,
    });
  }
});

/* ──────────────────────────────────────────
   H) ADMIN UPDATE REQUEST
   POST /api/requests/:id/admin
   ────────────────────────────────────────── */
router.post('/requests/:id/admin', async (req, res) => {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Admin only' });
  }

  const reqId = req.params.id;
  const { action, admin_note, quote_price, quote_time_window } = req.body || {};

  const conn = await pool.getConnection();
  try {
    if (action === 'reject') {
      try {
        await conn.execute(
          'UPDATE service_requests SET status = ?, admin_note = ? WHERE request_id = ?',
          ['rejected', admin_note || null, reqId]
        );
      } catch (_) {
        await conn.execute(
          'UPDATE service_requests SET notes = ? WHERE request_id = ?',
          [admin_note || null, reqId]
        );
      }
      return res.json({ ok: true });
    }

    if (action === 'quote') {
      try {
        await conn.execute(
          `UPDATE service_requests
             SET status = ?, quote_price = ?, quote_time_window = ?, admin_note = ?
           WHERE request_id = ?`,
          ['quoted', quote_price || null, quote_time_window || null, admin_note || null, reqId]
        );
      } catch (_) {
        await conn.execute(
          'UPDATE service_requests SET notes = ? WHERE request_id = ?',
          [admin_note || null, reqId]
        );
      }
      return res.json({ ok: true });
    }

    if (action === 'accept') {
      // 1) Mark the request as accepted
      try {
        await conn.execute(
          'UPDATE service_requests SET status = ?, admin_note = ? WHERE request_id = ?',
          ['accepted', admin_note || null, reqId]
        );
      } catch (_) {
        await conn.execute(
          'UPDATE service_requests SET notes = ? WHERE request_id = ?',
          [admin_note || null, reqId]
        );
      }

      // 2) Auto-create an order if one doesn't already exist
      try {
        const [existing] = await conn.execute(
          'SELECT order_id FROM orders WHERE request_id = ?',
          [reqId]
        );

        if (existing.length === 0) {
          const [reqRows] = await conn.execute(
            `SELECT client_id, preferred_start
             FROM service_requests
             WHERE request_id = ?`,
            [reqId]
          );

          if (reqRows.length) {
            const r = reqRows[0];

            await conn.execute(
              `INSERT INTO orders
                 (request_id, client_id, scheduled_date, status)
               VALUES (?, ?, ?, 'scheduled')`,
              [reqId, r.client_id, r.preferred_start || null]
            );
          }
        }
      } catch (orderErr) {
        console.error('[CREATE ORDER ON ACCEPT ERROR]', orderErr);
        // don't fail the whole admin request if order creation fails
      }

      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[ADMIN REQUEST UPDATE ERROR]', err);
    return res.status(500).json({ error: 'Could not update request', details: err.message });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   I) CLIENT RESPONSE TO QUOTE
   POST /api/requests/:id/client
   ────────────────────────────────────────── */
router.post('/requests/:id/client', async (req, res) => {
  const reqId = req.params.id;
  const { action, client_note } = req.body || {};

  const conn = await pool.getConnection();
  try {
    if (action === 'accept') {
      try {
        await conn.execute(
          'UPDATE service_requests SET status = ? WHERE request_id = ?',
          ['accepted', reqId]
        );
      } catch (_) {}
      return res.json({ ok: true });
    }

    if (action === 'counter') {
      try {
        await conn.execute(
          'UPDATE service_requests SET status = ?, client_note = ? WHERE request_id = ?',
          ['counter', client_note || null, reqId]
        );
      } catch (_) {
        await conn.execute(
          'UPDATE service_requests SET notes = ? WHERE request_id = ?',
          [client_note || null, reqId]
        );
      }
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[CLIENT REQUEST UPDATE ERROR]', err);
    return res.status(500).json({ error: 'Could not update request', details: err.message });
  } finally {
    conn.release();
  }
});

/* ──────────────────────────────────────────
   DEBUG ROUTES
   ────────────────────────────────────────── */
router.get('/debug/clients-count', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM clients');
    res.json({ ok: true, count: rows[0].cnt });
  } catch (err) {
    console.error('[DEBUG CLIENTS COUNT ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/debug/clients-sample', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT client_id, username, name, email, phone, address FROM clients ORDER BY client_id DESC LIMIT 5'
    );
    res.json({ ok: true, rows });
  } catch (err) {
    console.error('[DEBUG CLIENTS SAMPLE ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/debug/requests-count', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM service_requests');
    res.json({ ok: true, count: rows[0].cnt });
  } catch (err) {
    console.error('[DEBUG REQUESTS COUNT ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ──────────────────────────────────────────
   CREATE ORDER FROM ACCEPTED REQUEST
   (client-side "Confirm this as an Order")
   POST /api/clients/:clientId/requests/:requestId/create-order
   ────────────────────────────────────────── */
router.post(
  '/clients/:clientId/requests/:requestId/create-order',
  async (req, res) => {
    const { clientId, requestId } = req.params;

    try {
      const [rows] = await pool.execute(
        `SELECT request_id, client_id, preferred_start, status
         FROM service_requests
         WHERE request_id = ? AND client_id = ?`,
        [requestId, clientId]
      );

      if (!rows.length) {
        return res
          .status(404)
          .json({ ok: false, error: 'Request not found for this client' });
      }

      const r = rows[0];

      if (r.status !== 'accepted') {
        return res.status(400).json({
          ok: false,
          error:
            'Order can only be created once the request is accepted by Anna',
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO orders
           (request_id, client_id, scheduled_date, status)
         VALUES (?, ?, ?, 'scheduled')`,
        [r.request_id, r.client_id, r.preferred_start || null]
      );

      return res.json({ ok: true, order_id: result.insertId });
    } catch (err) {
      console.error('[CREATE ORDER ERROR]', err);
      return res.status(500).json({
        ok: false,
        error: 'Failed to create order',
        details: err.message,
      });
    }
  }
);

/* ──────────────────────────────────────────
   ADMIN – COMPLETE ORDER (GENERATE BILL)
   POST /api/orders/:orderId/admin-complete
   ────────────────────────────────────────── */
/* ──────────────────────────────────────────
   ADMIN – COMPLETE ORDER (GENERATE BILL)
   POST /api/orders/:orderId/admin-complete
   ────────────────────────────────────────── */
router.post('/orders/:orderId/admin-complete', async (req, res) => {
  try {
    // NOTE: For your project, this route no longer checks admin token
    // so you won't see "Admin login required." when generating a bill.

    const { orderId } = req.params;
    const { final_amount, admin_note } = req.body;

    // 1) Update the order: set amount, mark as completed, bill is now due
    const [result] = await pool.execute(
      `
      UPDATE orders
      SET
        total_amount   = ?,
        payment_status = 'due',
        status         = 'completed',
        admin_note     = ?
      WHERE order_id = ?
      `,
      [final_amount, admin_note || null, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }

    // 2) Also mark related service_request as completed,
    //    so it no longer shows under "Load Requests"
    const [reqRows] = await pool.execute(
      'SELECT request_id FROM orders WHERE order_id = ?',
      [orderId]
    );

    if (reqRows.length) {
      const requestId = reqRows[0].request_id;
      await pool.execute(
        'UPDATE service_requests SET status = ? WHERE request_id = ?',
        ['completed', requestId]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN COMPLETE ORDER ERROR]', err);
    return res
      .status(500)
      .json({ ok: false, error: 'Server error completing order.' });
  }
});


/* ──────────────────────────────────────────
   ADMIN – REVISE BILL AFTER DISPUTE
   POST /api/orders/:orderId/admin-revise
   ────────────────────────────────────────── */
router.post('/orders/:orderId/admin-revise', async (req, res) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Admin login required.' });
    }

    const { orderId } = req.params;
    const { new_amount, admin_note } = req.body;

    const [result] = await pool.execute(
      `
      UPDATE orders
      SET
        total_amount   = ?,
        payment_status = 'due',
        admin_note     = ?
      WHERE order_id = ?
      `,
      [new_amount, admin_note || null, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN REVISE ORDER ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error revising bill.',
      details: err.message,
    });
  }
});

/* ──────────────────────────────────────────
   CLIENT – PAY OR DISPUTE BILL
   POST /api/orders/:orderId/client-action
   ────────────────────────────────────────── */
router.post('/orders/:orderId/client-action', async (req, res) => {
  const { orderId } = req.params;
  const { action, note } = req.body || {};

  if (!action) {
    return res.status(400).json({ ok: false, error: 'action is required' });
  }

  try {
    // Fetch order + card info to enforce "must have card on file"
    const [orderRows] = await pool.execute(
      `
      SELECT o.order_id, o.client_id, c.cc_last4
      FROM orders o
      LEFT JOIN clients c ON c.client_id = o.client_id
      WHERE o.order_id = ?
      `,
      [orderId]
    );

    if (!orderRows.length) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }

    const orderRow = orderRows[0];

    let paymentStatus;
    if (action === 'pay') {
      // block paying if there is no card saved
      if (!orderRow.cc_last4 || orderRow.cc_last4.trim() === '') {
        return res.status(400).json({
          ok: false,
          error: 'No card on file for this client. Please add a card before paying.',
        });
      }
      paymentStatus = 'paid';
    } else if (action === 'dispute') {
      paymentStatus = 'disputed';
    } else {
      return res.status(400).json({ ok: false, error: 'Unknown action' });
    }

    const [result] = await pool.execute(
      `
      UPDATE orders
      SET payment_status = ?, client_note = ?
      WHERE order_id = ?
      `,
      [paymentStatus, note || null, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('[CLIENT ORDER ACTION ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error updating order.',
      details: err.message,
    });
  }
});

/* ──────────────────────────────────────────
   SAVE CLIENT CARD (FAKE BILLING INFO)
   POST /api/clients/:clientId/card
   ────────────────────────────────────────── */
router.post('/clients/:clientId/card', async (req, res) => {
  const { clientId } = req.params;
  const { cc_number, cc_brand } = req.body || {};

  if (!cc_number || cc_number.length < 4) {
    return res.status(400).json({ ok: false, error: 'Invalid card number' });
  }

  const last4 = cc_number.slice(-4);

  try {
    const [result] = await pool.execute(
      `
      UPDATE clients
      SET cc_last4 = ?, cc_brand = ?
      WHERE client_id = ?
      `,
      [last4, cc_brand || null, clientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    // Only return last 3 digits to the frontend
    return res.json({ ok: true, card_last3: last4.slice(-3), cc_brand: cc_brand || null });
  } catch (err) {
    console.error('[SAVE CARD ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error saving card.',
      details: err.message,
    });
  }
});

// ──────────────────────────────────────────
//   ADMIN REPORTS (3–10)
//   GET /api/admin/report?type=...&month=YYYY-MM
// ──────────────────────────────────────────
router.get('/admin/report', async (req, res) => {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Admin login required.' });
  }

  let { type, month } = req.query;
  const rawMonth = month; // for debugging

  // Normalize month to "YYYY-MM" or null
  if (typeof month !== 'string') {
    month = null;
  } else {
    month = month.trim();
    if (!month || month === 'null' || month === 'undefined') {
      month = null;
    } else {
      month = month.slice(0, 7); // "YYYY-MM"
      if (!/^\d{4}-\d{2}$/.test(month)) {
        month = null;
      }
    }
  }

  console.log('[ADMIN REPORT] type=', type, 'rawMonth=', rawMonth, 'normalizedMonth=', month);

  if (!type) {
    return res.status(400).json({ ok: false, error: 'type is required' });
  }

  try {
    let rows = [];
    let sql = '';
    let params = [];

    /* 3. Frequent clients – most completed orders in that month */
    if (type === 'frequent_clients') {
      params = [];
      sql = `
        SELECT
          c.client_id,
          c.username,
          c.name,
          c.email,
          COUNT(o.order_id) AS completed_orders
        FROM clients c
        JOIN orders o
          ON o.client_id = c.client_id
         AND o.status = 'completed'
        WHERE 1 = 1
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(COALESCE(o.scheduled_date, o.created_at), '%Y-%m') = ? `;
        params.push(month);
      }
      sql += `
        GROUP BY c.client_id, c.username, c.name, c.email
        ORDER BY completed_orders DESC, c.client_id ASC
        LIMIT 50
      `;
      [rows] = await pool.query(sql, params);
    }

    /* 4. Uncommitted clients – 3+ requests, never completed an order. */
    else if (type === 'uncommitted_clients') {
      params = [];
      sql = `
        SELECT
          c.client_id,
          c.username,
          c.name,
          c.email,
          COUNT(DISTINCT r.request_id) AS request_count
        FROM clients c
        JOIN service_requests r
          ON r.client_id = c.client_id
        LEFT JOIN orders o
          ON o.request_id = r.request_id
         AND o.status = 'completed'
        WHERE o.order_id IS NULL
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(r.created_at, '%Y-%m') = ? `;
        params.push(month);
      }
      sql += `
        GROUP BY c.client_id, c.username, c.name, c.email
        HAVING request_count >= 3
        ORDER BY request_count DESC, c.client_id ASC
      `;
      [rows] = await pool.query(sql, params);
    }

    /* 5. Accepted quotes in a given month (month required) */
    else if (type === 'accepted_quotes') {
      if (!month) {
        return res.status(400).json({
          ok: false,
          error: 'month (YYYY-MM) is required for accepted_quotes report',
        });
      }
      [rows] = await pool.query(
        `
        SELECT
          r.request_id,
          r.client_id,
          c.name        AS client_name,
          c.email       AS client_email,
          r.service_address,
          r.cleaning_type,
          r.num_rooms,
          r.quote_price,
          r.quote_time_window,
          r.status,
          r.created_at
        FROM service_requests r
        JOIN clients c
          ON c.client_id = r.client_id
        WHERE r.status IN ('accepted','completed')
          AND DATE_FORMAT(r.created_at, '%Y-%m') = ?
        ORDER BY r.created_at DESC
        `,
        [month]
      );
    }

    /* 6. Prospective clients – registered that month, no requests ever */
    else if (type === 'prospective_clients') {
      params = [];
      sql = `
        SELECT
          c.client_id,
          c.username,
          c.name,
          c.email,
          c.created_at
        FROM clients c
        LEFT JOIN service_requests r
          ON r.client_id = c.client_id
        WHERE r.request_id IS NULL
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(c.created_at, '%Y-%m') = ? `;
        params.push(month);
      }
      sql += ` ORDER BY c.client_id ASC `;
      [rows] = await pool.query(sql, params);
    }

    /* 7. Largest job – max rooms completed that month (or overall) */
    else if (type === 'largest_job') {
      params = [];
      let subSql = `
        SELECT MAX(r2.num_rooms)
        FROM service_requests r2
        JOIN orders o2 ON o2.request_id = r2.request_id
        WHERE o2.status = 'completed'
      `;
      if (month) {
        subSql += ` AND DATE_FORMAT(COALESCE(o2.scheduled_date, o2.created_at), '%Y-%m') = ? `;
        params.push(month);
      }

      sql = `
        SELECT
          r.request_id,
          o.order_id,
          c.client_id,
          c.name        AS client_name,
          r.service_address,
          r.cleaning_type,
          r.num_rooms,
          o.total_amount,
          o.status,
          o.payment_status
        FROM service_requests r
        JOIN orders o
          ON o.request_id = r.request_id
        JOIN clients c
          ON c.client_id = r.client_id
        WHERE o.status = 'completed'
          AND r.num_rooms = ( ${subSql} )
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(COALESCE(o.scheduled_date, o.created_at), '%Y-%m') = ? `;
        params.push(month);
      }
      sql += ` ORDER BY r.request_id ASC `;
      [rows] = await pool.query(sql, params);
    }

    /* 8. Overdue bills – unpaid overdue bills (optionally by month) */
    else if (type === 'overdue_bills') {
      params = [];
      sql = `
        SELECT
          o.order_id,
          o.client_id,
          c.name        AS client_name,
          c.email       AS client_email,
          o.total_amount,
          o.payment_status,
          o.payment_due_date,
          o.created_at
        FROM orders o
        JOIN clients c
          ON c.client_id = o.client_id
        WHERE o.payment_status IN ('due','overdue')
          AND o.payment_due_date < DATE_SUB(NOW(), INTERVAL 7 DAY)
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(COALESCE(o.scheduled_date, o.payment_due_date, o.created_at), '%Y-%m') = ? `;
        params.push(month);
      }
      sql += ` ORDER BY o.payment_due_date ASC `;
      [rows] = await pool.query(sql, params);
    }

    /* 9. Bad clients – have overdue bills and no paid bills in that month */
    else if (type === 'bad_clients') {
      params = [];
      sql = `
        SELECT
          c.client_id,
          c.username,
          c.name,
          c.email,
          SUM(CASE WHEN o.payment_status = 'overdue' THEN 1 ELSE 0 END) AS overdue_bills,
          SUM(CASE WHEN o.payment_status = 'paid'    THEN 1 ELSE 0 END) AS paid_bills
        FROM clients c
        JOIN orders o
          ON o.client_id = c.client_id
        WHERE 1 = 1
      `;
      if (month) {
        sql += ` AND DATE_FORMAT(COALESCE(o.scheduled_date, o.created_at), '%Y-%m') = ? `;
        params.push(month);
      }
      sql += `
        GROUP BY c.client_id, c.username, c.name, c.email
        HAVING overdue_bills > 0 AND paid_bills = 0
        ORDER BY overdue_bills DESC, c.client_id ASC
      `;
      [rows] = await pool.query(sql, params);
    }

    /* 10. Good clients – no overdue bills and at least one paid bill */
    else if (type === 'good_clients') {
      params = [];
      sql = `
        SELECT
          c.client_id,
          c.username,
          c.name,
          c.email,
          SUM(CASE WHEN o.payment_status = 'overdue' THEN 1 ELSE 0 END) AS overdue_bills,
          SUM(CASE WHEN o.payment_status = 'paid'    THEN 1 ELSE 0 END) AS paid_bills
        FROM clients c
        LEFT JOIN orders o
          ON o.client_id = c.client_id
        WHERE 1 = 1
      `;
      if (month) {
        sql += `
          AND o.order_id IS NOT NULL
          AND DATE_FORMAT(COALESCE(o.scheduled_date, o.created_at), '%Y-%m') = ?
        `;
        params.push(month);
      }
      sql += `
        GROUP BY c.client_id, c.username, c.name, c.email
        HAVING overdue_bills = 0 AND paid_bills > 0
        ORDER BY paid_bills DESC, c.client_id ASC
      `;
      [rows] = await pool.query(sql, params);
    }

    else {
      return res.status(400).json({ ok: false, error: 'Unknown report type' });
    }

    return res.json({ ok: true, rows });
  } catch (err) {
    console.error('[ADMIN REPORT ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error running report.',
      details: err.message,
    });
  }
});

// export the router (no app.listen here!)
module.exports = router;

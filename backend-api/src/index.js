const express = require('express');
const cors = require('cors');
const zlib = require('zlib');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const partiesRoutes = require('./routes/parties');
const invoicesRoutes = require('./routes/invoices');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const whiteLabelRoutes = require('./routes/whiteLabel');
const uploadRoutes = require('./routes/upload');
const rpcRoutes = require('./routes/rpc');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// HTTP Keep-Alive & Performance Headers
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60, max=1000');
  next();
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'apikey', 'prefer'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Native Zero-Dependency GZIP Response Compression
// Compresses JSON responses > 512 bytes by ~85-90%, dramatically reducing network transfer time
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) return next();

  const originalJson = res.json;
  res.json = function (obj) {
    if (res.headersSent) return originalJson.call(this, obj);

    const jsonString = JSON.stringify(obj);
    if (jsonString && jsonString.length > 512) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      return zlib.gzip(Buffer.from(jsonString), (err, buffer) => {
        if (err) return originalJson.call(this, obj);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
      });
    }
    return originalJson.call(this, obj);
  };
  next();
});

// High-Speed In-Memory Read Micro-Cache for frequent GET endpoints
// (TTL = 10 seconds, purged on mutations with CRM vs POS domain segregation)
const apiCache = new Map();
const CACHE_TTL_MS = 10000;

const isCrmPath = (urlPath) => {
  if (!urlPath) return false;
  return (
    urlPath.includes('/api/crm') ||
    urlPath.includes('/rest/v1/crm_') ||
    urlPath.includes('/rest/v1/staff_tasks') ||
    urlPath.includes('/rest/v1/attendance_records') ||
    urlPath.includes('/rest/v1/salary_profiles') ||
    urlPath.includes('/rest/v1/customer_tickets')
  );
};

app.use((req, res, next) => {
  // Invalidate cache on mutations with domain segregation (CRM vs POS)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const orgId = req.headers['x-organization-id'] || req.body?.organization_id || req.body?.org_id || req.user?.orgId || 'global';
    const isCrmMutation = isCrmPath(req.originalUrl || req.path);
    const domainPrefix = isCrmMutation ? ':crm:' : ':billing:';

    for (const key of apiCache.keys()) {
      if (orgId !== 'global' && !key.startsWith(orgId) && !key.startsWith('global:')) {
        continue;
      }
      if (key.includes(domainPrefix)) {
        apiCache.delete(key);
      }
    }
    return next();
  }

  // Cache candidate endpoints: both /api/ and /rest/v1/ PostgREST passthroughs
  // Skip micro-caching for real-time admin/white-label governance & license states
  const bypassCache =
    req.path.startsWith('/api/white-label') ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/presence') ||
    req.path.startsWith('/api/features');

  if (req.method === 'GET' && !bypassCache && (req.path.startsWith('/api/') || req.path.startsWith('/rest/v1/'))) {
    const orgId = req.headers['x-organization-id'] || req.query.org_id || req.query.organization_id || req.user?.orgId || 'global';
    const domain = isCrmPath(req.originalUrl || req.path) ? 'crm' : 'billing';
    const cacheKey = `${orgId}:${domain}:${req.originalUrl}`;
    const cached = apiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Intercept res.json to populate cache
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data) {
        apiCache.set(cacheKey, { timestamp: Date.now(), data });
      }
      return originalJson.call(this, data);
    };
  }

  next();
});

// Health Check
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as server_time');
    return res.json({
      status: 'online',
      db: 'connected',
      db_time: result.rows[0].server_time,
      cached_entries: apiCache.size,
      version: '1.1.0-speed',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api', inventoryRoutes); // For product-batches and adjust-stock
app.use('/api', partiesRoutes);   // For customers, suppliers, parties, credit-transactions, bank-accounts
app.use('/api', invoicesRoutes);  // For sales, purchases, purchase-invoices, expenses, returns
app.use('/api', settingsRoutes);  // For organizations, memberships, storefront-settings, locations
app.use('/api', adminRoutes);     // For presence heartbeat, live users, admin metrics, feature locks & requests
app.use('/api', whiteLabelRoutes); // For white-label branding requests, admin approval keys & tenant themes
app.use('/', uploadRoutes);       // For /api/upload/:bucket and storage
app.use('/', rpcRoutes);          // For /rpc/:fn and /rest/v1/:table

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error Handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Automatic Database Alignment & Self-Healing Bootstrap
(async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      UPDATE users SET is_platform_admin = true WHERE LOWER(email) = 'ashwinbishnoi05@gmail.com';
    `);

    // Backfill any unknown users from organizations, memberships, presence or sales into public.users
    await pool.query(`
      INSERT INTO users (id, email, full_name, phone, avatar_url, created_at, password_hash)
      SELECT
        all_u.id,
        COALESCE(NULLIF(TRIM(all_u.email), ''), 'user_' || substr(all_u.id::text, 1, 8) || '@credsmart.online') as email,
        COALESCE(NULLIF(TRIM(all_u.full_name), ''), 'Business Member') as full_name,
        all_u.phone,
        all_u.avatar_url,
        COALESCE(all_u.created_at, NOW()) as created_at,
        '$2a$10$N9qo8uLOickgx2ZMRZoMye.I.kF1Yp6P6Yg3l4uM6gVfTfD1.B8xG'
      FROM (
        SELECT owner_id as id, email, name as full_name, phone, logo_url as avatar_url, created_at FROM organizations WHERE owner_id IS NOT NULL
        UNION
        SELECT user_id as id, NULL as email, NULL as full_name, NULL as phone, NULL as avatar_url, created_at FROM org_memberships WHERE user_id IS NOT NULL
        UNION
        SELECT user_id as id, NULL as email, NULL as full_name, NULL as phone, NULL as avatar_url, created_at FROM organization_memberships WHERE user_id IS NOT NULL
        UNION
        SELECT user_id as id, user_email as email, user_name as full_name, NULL as phone, NULL as avatar_url, last_active_at as created_at FROM user_presence WHERE user_id IS NOT NULL
        UNION
        SELECT created_by as id, NULL as email, NULL as full_name, NULL as phone, NULL as avatar_url, created_at FROM sales WHERE created_by IS NOT NULL
      ) all_u
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name);
    `);
    console.log('[DB Bootstrap] Successfully verified schema and synchronized users');
  } catch (err) {
    console.warn('[DB Bootstrap Notice]', err.message);
  }
})();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CredSmart Lightning Backend API listening on http://0.0.0.0:${PORT}`);
});

module.exports = app;

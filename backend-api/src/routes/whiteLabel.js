const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const PLATFORM_ADMIN_EMAILS = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS || 'ashwinbishnoi05@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const getOrgId = (req) =>
  req.headers['x-organization-id'] ||
  req.orgId ||
  req.query.organization_id ||
  req.query.org_id ||
  req.body?.organization_id ||
  req.body?.org_id;

const isPlatformAdmin = async (reqUser) => {
  if (!reqUser || !reqUser.id) return false;
  if (reqUser.is_platform_admin === true) return true;
  if (reqUser.email && PLATFORM_ADMIN_EMAILS.has(String(reqUser.email).trim().toLowerCase())) {
    return true;
  }
  try {
    const res = await pool.query('SELECT email, is_platform_admin FROM users WHERE id = $1', [reqUser.id]);
    if (res.rows.length === 0) return false;
    const row = res.rows[0];
    if (row.is_platform_admin === true) return true;
    if (row.email && PLATFORM_ADMIN_EMAILS.has(String(row.email).trim().toLowerCase())) return true;
  } catch (_err) {
    // Column might not exist prior to migration
  }
  return false;
};

const requirePlatformAdmin = async (req, res, next) => {
  const allowed = await isPlatformAdmin(req.user);
  if (!allowed) {
    return res.status(403).json({ error: 'Platform Admin privileges required to manage white-label keys' });
  }
  return next();
};

const isOrgAdminOrOwner = async (userId, orgId) => {
  if (!userId || !orgId) return false;
  const adminRoles = new Set(['owner', 'store_owner', 'admin', 'super_admin', 'partner', 'manager']);
  try {
    const res = await pool.query(
      `SELECT role FROM (
         SELECT role FROM org_memberships WHERE user_id = $1 AND (org_id = $2 OR organization_id = $2)
         UNION ALL
         SELECT role FROM organization_memberships WHERE user_id = $1 AND (organization_id = $2 OR org_id = $2)
         UNION ALL
         SELECT 'owner' AS role FROM organizations WHERE id = $2 AND owner_id = $1
       ) m LIMIT 5`,
      [userId, orgId]
    );
    return res.rows.some((r) => adminRoles.has(String(r.role || '').toLowerCase()));
  } catch (_err) {
    return true;
  }
};

const hashActivationKey = (rawKey) => {
  const normalized = String(rawKey || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const verifyActivationKey = (submittedKey, storedHash) => {
  if (!submittedKey || !storedHash) return false;
  const submittedHash = hashActivationKey(submittedKey);
  const a = Buffer.from(submittedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const generateLicenseKey = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len) => {
    const bytes = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  };
  return `CSWL-${segment(4)}-${segment(4)}-${segment(4)}`;
};

const normalizeHexColor = (color, fallback) => {
  const val = String(color || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(val) ? val.toUpperCase() : fallback;
};

const sanitizeAssetUrl = (url) => {
  const val = String(url || '').trim();
  if (!val) return '';
  if (val.startsWith('/')) return val;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^data:image\/(png|jpeg|jpg|webp|gif|x-icon|vnd\.microsoft\.icon|svg\+xml);base64,/i.test(val)) {
    return val;
  }
  return '';
};

const normalizeSlug = (slug) =>
  String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const projectPublicBrandConfig = (row) => ({
  organization_id: row.organization_id,
  brand_slug: row.brand_slug || '',
  custom_domain: '',
  brand_name: row.brand_name || 'CredSmart',
  brand_tagline: row.brand_tagline || '',
  powered_by_text: row.powered_by_text || '',
  hide_platform_branding: row.hide_platform_branding !== false,
  logo_light_url: row.logo_light_url || '',
  logo_dark_url: row.logo_dark_url || '',
  favicon_url: row.favicon_url || '',
  splash_logo_url: row.splash_logo_url || '',
  primary_color: row.primary_color || '#2563EB',
  secondary_color: row.secondary_color || '#F97316',
  sidebar_theme: row.sidebar_theme || 'dark',
  support_email: row.support_email || '',
  support_phone: row.support_phone || '',
  website_url: row.website_url || '',
  meta_title: row.meta_title || '',
  meta_description: row.meta_description || '',
  custom_footer_text: row.custom_footer_text || '',
});

// ============================================================================
// 1. PUBLIC RESOLVER (For Auth / Branded Portal Slugs before login)
// ============================================================================

// GET /api/white-label/resolve?slug=
router.get('/white-label/resolve', optionalAuth, async (req, res) => {
  try {
    const rawSlug = normalizeSlug(req.query.slug || '');

    let row = null;

    if (rawSlug) {
      const slugRes = await pool.query(
        `SELECT * FROM white_label_configs
         WHERE is_activated = true AND is_enabled = true AND LOWER(brand_slug) = $1
         LIMIT 1`,
        [rawSlug]
      );
      if (slugRes.rows.length > 0) row = slugRes.rows[0];
    }

    if (!row) {
      return res.json({ active: false, brand: null });
    }

    return res.json({ active: true, brand: projectPublicBrandConfig(row) });
  } catch (err) {
    console.error('Resolve white-label error:', err);
    return res.json({ active: false, brand: null });
  }
});

// ============================================================================
// 2. AUTHENTICATED TENANT REQUEST, KEY ACTIVATION & BRANDING STUDIO
// ============================================================================

router.use('/white-label', authenticate);
router.use('/admin/white-label', authenticate, requirePlatformAdmin);

// GET /api/white-label/status
router.get('/white-label/status', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const platformAdmin = await isPlatformAdmin(req.user);

    if (!orgId) {
      return res.json({
        is_platform_admin: platformAdmin,
        request: null,
        config: null,
        is_activated: false,
      });
    }

    // Explicitly omit activation_key & activation_key_hash so user MUST enter the key provided by admin
    const reqRes = await pool.query(
      `SELECT id, organization_id, requested_by, requester_email, requester_name,
              requested_brand_name, requested_domain, notes, status,
              reviewed_at, admin_notes, created_at, updated_at
       FROM white_label_requests
       WHERE organization_id = $1 OR org_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [orgId]
    );

    const cfgRes = await pool.query(
      `SELECT * FROM white_label_configs
       WHERE organization_id = $1 OR org_id = $1
       LIMIT 1`,
      [orgId]
    );

    const config = cfgRes.rows.length > 0 ? cfgRes.rows[0] : null;
    const requestRow = reqRes.rows.length > 0 ? reqRes.rows[0] : null;

    return res.json({
      is_platform_admin: platformAdmin,
      request: requestRow,
      is_activated: Boolean(config?.is_activated),
      config: config?.is_activated ? config : null,
    });
  } catch (err) {
    console.error('Get white-label status error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/white-label/request
router.post('/white-label/request', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const canManage = (await isOrgAdminOrOwner(req.user.id, orgId)) || (await isPlatformAdmin(req.user));
    if (!canManage) {
      return res.status(403).json({ error: 'Only store owners or administrators can request white-labeling' });
    }

    const { requested_brand_name, notes = '' } = req.body || {};
    const brandName = String(requested_brand_name || '').trim();
    if (brandName.length < 2) {
      return res.status(400).json({ error: 'Please specify a desired brand name (at least 2 characters)' });
    }

    const existing = await pool.query(
      `SELECT id, organization_id, requested_brand_name, requested_domain, notes, status, created_at
       FROM white_label_requests
       WHERE (organization_id = $1 OR org_id = $1)
         AND status IN ('pending', 'approved')
       ORDER BY created_at DESC
       LIMIT 1`,
      [orgId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        already_exists: true,
        request: existing.rows[0],
      });
    }

    const userLookup = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [req.user.id]);
    const userRow = userLookup.rows[0] || {};

    const insertRes = await pool.query(
      `INSERT INTO white_label_requests (
         org_id, organization_id, requested_by, requester_email, requester_name,
         requested_brand_name, requested_domain, notes, status
       )
       VALUES ($1, $1, $2, $3, $4, $5, '', $6, 'pending')
       RETURNING id, organization_id, requested_by, requester_email, requester_name,
                 requested_brand_name, requested_domain, notes, status, created_at, updated_at`,
      [
        orgId,
        req.user.id,
        userRow.email || req.user.email || '',
        userRow.full_name || '',
        brandName,
        String(notes || '').trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      request: insertRes.rows[0],
    });
  } catch (err) {
    console.error('Submit white-label request error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/white-label/activate
router.post('/white-label/activate', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const canManage = (await isOrgAdminOrOwner(req.user.id, orgId)) || (await isPlatformAdmin(req.user));
    if (!canManage) {
      return res.status(403).json({ error: 'Only store owners or administrators can activate a white-label key' });
    }

    const submittedKey = String(req.body?.key || '').trim().toUpperCase();
    if (!submittedKey) {
      return res.status(400).json({ error: 'Activation key is required' });
    }

    const reqRes = await client.query(
      `SELECT * FROM white_label_requests
       WHERE (organization_id = $1 OR org_id = $1) AND status = 'approved'
       ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [orgId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'No approved white-label request found for this organization' });
    }

    const reqRow = reqRes.rows[0];

    // Basic brute-force protection: lock for 15 minutes after 5 failed guesses
    if (reqRow.failed_attempts >= 5 && reqRow.last_attempt_at) {
      const elapsedMs = Date.now() - new Date(reqRow.last_attempt_at).getTime();
      if (elapsedMs < 15 * 60 * 1000) {
        return res.status(429).json({
          error: 'Too many invalid key attempts. Please wait 15 minutes or contact your admin.',
        });
      }
    }

    const isValid = verifyActivationKey(submittedKey, reqRow.activation_key_hash);
    if (!isValid) {
      await client.query(
        `UPDATE white_label_requests
         SET failed_attempts = failed_attempts + 1, last_attempt_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [reqRow.id]
      );
      return res.status(403).json({ error: 'Invalid activation key. Please check the key provided by your Admin.' });
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE white_label_requests
       SET failed_attempts = 0, last_attempt_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [reqRow.id]
    );

    // Derive an available initial brand slug
    let baseSlug = normalizeSlug(reqRow.requested_brand_name) || `brand-${String(orgId).slice(0, 6)}`;
    const slugCheck = await client.query(
      `SELECT id FROM white_label_configs WHERE LOWER(brand_slug) = $1 AND organization_id <> $2 LIMIT 1`,
      [baseSlug, orgId]
    );
    if (slugCheck.rows.length > 0) {
      baseSlug = `${baseSlug}-${String(orgId).slice(0, 4)}`;
    }

    const cfgRes = await client.query(
      `INSERT INTO white_label_configs (
         org_id, organization_id, request_id, is_activated, is_enabled, activated_at,
         brand_slug, custom_domain, brand_name
       )
       VALUES ($1, $1, $2, true, true, NOW(), $3, NULL, $4)
       ON CONFLICT (organization_id)
       DO UPDATE SET
         request_id = EXCLUDED.request_id,
         is_activated = true,
         is_enabled = true,
         activated_at = COALESCE(white_label_configs.activated_at, NOW()),
         brand_slug = COALESCE(NULLIF(white_label_configs.brand_slug, ''), EXCLUDED.brand_slug),
         custom_domain = NULL,
         brand_name = COALESCE(NULLIF(white_label_configs.brand_name, 'CredSmart'), EXCLUDED.brand_name),
         updated_at = NOW()
       RETURNING *`,
      [orgId, reqRow.id, baseSlug, reqRow.requested_brand_name || 'My Brand']
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'White-Label Branding Studio unlocked successfully!',
      config: cfgRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Activate white-label key error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/white-label/config
router.put('/white-label/config', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const canManage = (await isOrgAdminOrOwner(req.user.id, orgId)) || (await isPlatformAdmin(req.user));
    if (!canManage) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const existing = await pool.query(
      `SELECT * FROM white_label_configs WHERE organization_id = $1 OR org_id = $1 LIMIT 1`,
      [orgId]
    );
    if (existing.rows.length === 0 || !existing.rows[0].is_activated) {
      return res.status(403).json({ error: 'White-label key must be activated before saving custom branding' });
    }

    const body = req.body || {};
    const brandName = String(body.brand_name || existing.rows[0].brand_name || 'CredSmart').trim().slice(0, 120);
    if (!brandName) {
      return res.status(400).json({ error: 'Brand name cannot be empty' });
    }

    const brandSlug = body.brand_slug !== undefined ? (normalizeSlug(body.brand_slug) || null) : existing.rows[0].brand_slug;

    if (brandSlug) {
      const conflict = await pool.query(
        `SELECT id FROM white_label_configs WHERE LOWER(brand_slug) = $1 AND organization_id <> $2 LIMIT 1`,
        [brandSlug, orgId]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ error: `Brand slug "${brandSlug}" is already taken by another workspace` });
      }
    }

    const updated = await pool.query(
      `UPDATE white_label_configs SET
         brand_slug = $2,
         custom_domain = NULL,
         brand_name = $3,
         brand_tagline = $4,
         powered_by_text = $5,
         hide_platform_branding = $6,
         logo_light_url = $7,
         logo_dark_url = $8,
         favicon_url = $9,
         splash_logo_url = $10,
         primary_color = $11,
         secondary_color = $12,
         sidebar_theme = $13,
         support_email = $14,
         support_phone = $15,
         website_url = $16,
         meta_title = $17,
         meta_description = $18,
         custom_footer_text = $19,
         is_enabled = $20,
         updated_at = NOW()
       WHERE organization_id = $1 OR org_id = $1
       RETURNING *`,
      [
        orgId,
        brandSlug,
        brandName,
        String(body.brand_tagline ?? existing.rows[0].brand_tagline ?? '').trim().slice(0, 180),
        String(body.powered_by_text ?? existing.rows[0].powered_by_text ?? '').trim().slice(0, 120),
        body.hide_platform_branding !== undefined ? Boolean(body.hide_platform_branding) : existing.rows[0].hide_platform_branding,
        sanitizeAssetUrl(body.logo_light_url ?? existing.rows[0].logo_light_url),
        sanitizeAssetUrl(body.logo_dark_url ?? existing.rows[0].logo_dark_url),
        sanitizeAssetUrl(body.favicon_url ?? existing.rows[0].favicon_url),
        sanitizeAssetUrl(body.splash_logo_url ?? existing.rows[0].splash_logo_url),
        normalizeHexColor(body.primary_color ?? existing.rows[0].primary_color, '#2563EB'),
        normalizeHexColor(body.secondary_color ?? existing.rows[0].secondary_color, '#F97316'),
        body.sidebar_theme === 'light' ? 'light' : 'dark',
        String(body.support_email ?? existing.rows[0].support_email ?? '').trim().slice(0, 255),
        String(body.support_phone ?? existing.rows[0].support_phone ?? '').trim().slice(0, 40),
        sanitizeAssetUrl(body.website_url ?? existing.rows[0].website_url),
        String(body.meta_title ?? existing.rows[0].meta_title ?? '').trim().slice(0, 180),
        String(body.meta_description ?? existing.rows[0].meta_description ?? '').trim().slice(0, 500),
        String(body.custom_footer_text ?? existing.rows[0].custom_footer_text ?? '').trim().slice(0, 255),
        body.is_enabled !== undefined ? Boolean(body.is_enabled) : existing.rows[0].is_enabled,
      ]
    );

    return res.json({ success: true, config: updated.rows[0] });
  } catch (err) {
    console.error('Update white-label config error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/white-label/toggle
router.post('/white-label/toggle', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const isEnabled = Boolean(req.body?.is_enabled);
    const updated = await pool.query(
      `UPDATE white_label_configs
       SET is_enabled = $2, updated_at = NOW()
       WHERE (organization_id = $1 OR org_id = $1) AND is_activated = true
       RETURNING *`,
      [orgId, isEnabled]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Activated white-label configuration not found' });
    }

    return res.json({ success: true, config: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. PLATFORM ADMIN APPROVAL & LICENSE KEY GOVERNANCE
// ============================================================================

// GET /api/admin/white-label/requests
router.get('/admin/white-label/requests', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    let query = `
      SELECT
        r.*,
        o.name AS organization_name,
        o.email AS organization_email,
        c.is_activated,
        c.is_enabled,
        c.brand_name AS active_brand_name,
        c.brand_slug,
        c.custom_domain,
        c.primary_color,
        rev.full_name AS reviewer_name
      FROM white_label_requests r
      LEFT JOIN organizations o ON o.id = COALESCE(r.organization_id, r.org_id)
      LEFT JOIN white_label_configs c ON c.organization_id = COALESCE(r.organization_id, r.org_id)
      LEFT JOIN users rev ON rev.id = r.reviewed_by
    `;

    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      query += ` WHERE r.status = $1`;
    }

    query += ` ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Admin get white-label requests error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/white-label/requests/:id/approve
router.post('/admin/white-label/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_key = '', admin_notes = '' } = req.body || {};

    const rawKey = String(custom_key || '').trim().toUpperCase() || generateLicenseKey();
    if (rawKey.length < 8) {
      return res.status(400).json({ error: 'Activation key must be at least 8 characters' });
    }
    const keyHash = hashActivationKey(rawKey);

    const updated = await pool.query(
      `UPDATE white_label_requests
       SET status = 'approved',
           activation_key = $1,
           activation_key_hash = $2,
           failed_attempts = 0,
           reviewed_by = $3,
           reviewed_at = NOW(),
           admin_notes = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [rawKey, keyHash, req.user.id, String(admin_notes || '').trim(), id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'White-label request not found' });
    }

    return res.json({
      success: true,
      activation_key: rawKey,
      request: updated.rows[0],
    });
  } catch (err) {
    console.error('Approve white-label error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/white-label/requests/:id/reject
router.post('/admin/white-label/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes = '' } = req.body || {};

    const updated = await pool.query(
      `UPDATE white_label_requests
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = NOW(),
           admin_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.user.id, String(admin_notes || '').trim(), id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'White-label request not found' });
    }

    return res.json({ success: true, request: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/white-label/requests/:id/regenerate-key
router.post('/admin/white-label/requests/:id/regenerate-key', async (req, res) => {
  try {
    const { id } = req.params;
    const rawKey = generateLicenseKey();
    const keyHash = hashActivationKey(rawKey);

    const updated = await pool.query(
      `UPDATE white_label_requests
       SET status = 'approved',
           activation_key = $1,
           activation_key_hash = $2,
           failed_attempts = 0,
           reviewed_by = $3,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [rawKey, keyHash, req.user.id, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'White-label request not found' });
    }

    return res.json({ success: true, activation_key: rawKey, request: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/white-label/requests/:id/revoke
router.post('/admin/white-label/requests/:id/revoke', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { admin_notes = 'Revoked by Platform Admin' } = req.body || {};

    await client.query('BEGIN');

    const reqRes = await client.query(
      `UPDATE white_label_requests
       SET status = 'revoked',
           activation_key = NULL,
           activation_key_hash = NULL,
           reviewed_by = $1,
           reviewed_at = NOW(),
           admin_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.user.id, String(admin_notes || '').trim(), id]
    );

    if (reqRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'White-label request not found' });
    }

    const reqRow = reqRes.rows[0];
    const targetOrgId = reqRow.organization_id || reqRow.org_id;
    if (targetOrgId) {
      await client.query(
        `UPDATE white_label_configs
         SET is_activated = false, is_enabled = false, updated_at = NOW()
         WHERE organization_id = $1 OR org_id = $1`,
        [targetOrgId]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, request: reqRow });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

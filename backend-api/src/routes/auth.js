const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Deduplicate & gracefully serve concurrent refresh requests from multiple tabs or API calls
const inFlightRefreshes = new Map();
const recentRefreshCache = new Map();
const REFRESH_GRACE_TTL_MS = 15000;

const PLATFORM_ADMIN_EMAILS = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS || 'ashwinbishnoi05@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const isPlatformAdminAccount = (user) => {
  if (!user) return false;
  if (user.is_platform_admin === true) return true;
  if (user.email && PLATFORM_ADMIN_EMAILS.has(String(user.email).trim().toLowerCase())) return true;
  return false;
};

const recordPresenceSafely = (userId, orgId, email, fullName, role = 'owner') => {
  if (!userId || !orgId) return;
  pool
    .query(
      `INSERT INTO user_presence (
         user_id, org_id, organization_id, user_email, user_name, user_role, current_path, platform, last_active_at
       )
       VALUES ($1, $2, $2, $3, $4, $5, '/billing', 'web', NOW())
       ON CONFLICT (user_id, organization_id)
       DO UPDATE SET
         user_email = COALESCE(NULLIF(EXCLUDED.user_email, ''), user_presence.user_email),
         user_name = COALESCE(NULLIF(EXCLUDED.user_name, ''), user_presence.user_name),
         last_active_at = NOW()`,
      [userId, orgId, email || '', fullName || '', role]
    )
    .catch(() => {});
};

const generateTokens = (user, orgId) => {
  const payload = {
    id: user.id,
    email: user.email,
    orgId,
    is_platform_admin: isPlatformAdminAccount(user),
    jti: crypto.randomUUID(),
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};

const getUserPrimaryOrgId = async (userId) => {
  try {
    const orgRes = await pool.query(
      `SELECT COALESCE(m.org_id, m.organization_id) AS org_id FROM (
         SELECT org_id, organization_id, user_id, created_at, 1 AS priority FROM org_memberships WHERE user_id = $1
         UNION
         SELECT organization_id AS org_id, organization_id, user_id, created_at, 1 AS priority FROM organization_memberships WHERE user_id = $1
         UNION
         SELECT id AS org_id, id AS organization_id, owner_id AS user_id, created_at, 2 AS priority FROM organizations WHERE owner_id = $1
         UNION
         SELECT org_id, organization_id, COALESCE(user_id, staff_id) AS user_id, created_at, 3 AS priority FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1)
       ) m
       WHERE COALESCE(m.org_id, m.organization_id) IS NOT NULL
       ORDER BY m.priority ASC, m.created_at ASC
       LIMIT 1`,
      [userId]
    );
    if (orgRes.rows.length > 0 && orgRes.rows[0].org_id) return orgRes.rows[0].org_id;
  } catch (_mErr) {
    try {
      const fallbackRes = await pool.query(
        `SELECT COALESCE(org_id, organization_id) AS org_id FROM org_memberships WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (fallbackRes.rows.length > 0) return fallbackRes.rows[0].org_id;
    } catch (_ignored) {}
    try {
      const staffRes = await pool.query(
        `SELECT COALESCE(org_id, organization_id) AS org_id FROM crm_staff_assignments WHERE user_id = $1 OR staff_id = $1 LIMIT 1`,
        [userId]
      );
      if (staffRes.rows.length > 0) return staffRes.rows[0].org_id;
    } catch (_ignored) {}
  }

  return null;
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, data = {} } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check existing user
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    await client.query('BEGIN');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = data.full_name || '';
    const phone = data.phone || '';

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone, avatar_url, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName, phone]
    );
    const newUser = userRes.rows[0];

    // Create default organization
    const orgName = data.org_name || (fullName ? `${fullName}'s Business` : 'My Business');
    const orgRes = await client.query(
      `INSERT INTO organizations (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [orgName, email.toLowerCase().trim(), phone]
    );
    const newOrg = orgRes.rows[0];

    try {
      await client.query('SAVEPOINT sp_org_owner_id');
      await client.query('UPDATE organizations SET owner_id = $1 WHERE id = $2', [newUser.id, newOrg.id]);
      await client.query('RELEASE SAVEPOINT sp_org_owner_id');
    } catch (_ignored) {
      await client.query('ROLLBACK TO SAVEPOINT sp_org_owner_id');
    }

    // Create owner membership
    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role)
       VALUES ($1, $2, $2, 'owner')`,
      [newUser.id, newOrg.id]
    );

    try {
      await client.query('SAVEPOINT sp_org_mem_sync');
      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
         VALUES ($1, $2, $2, 'owner') ON CONFLICT DO NOTHING`,
        [newUser.id, newOrg.id]
      );
      await client.query('RELEASE SAVEPOINT sp_org_mem_sync');
    } catch (_ignored) {
      await client.query('ROLLBACK TO SAVEPOINT sp_org_mem_sync');
    }

    // Initialize invoice sequence
    await client.query(
      `INSERT INTO invoice_sequences (org_id, sales_prefix, sales_counter, purchase_prefix, purchase_counter)
       VALUES ($1, 'INV', 0, 'PUR', 0)
       ON CONFLICT (org_id) DO NOTHING`,
      [newOrg.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser, newOrg.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Save refresh token
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [newUser.id, refreshToken, expiresAt]
    );

    await client.query('COMMIT');
    recordPresenceSafely(newUser.id, newOrg.id, newUser.email, newUser.full_name, 'owner');

    const isPlatformAdmin = isPlatformAdminAccount(newUser);
    const formattedUser = {
      id: newUser.id,
      email: newUser.email,
      is_platform_admin: isPlatformAdmin,
      user_metadata: { full_name: newUser.full_name, phone: newUser.phone, is_platform_admin: isPlatformAdmin, ...data },
      created_at: newUser.created_at,
    };

    return res.status(200).json({
      user: formattedUser,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: formattedUser,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Signup error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during registration' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRes = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Resolve user's primary organization
    const orgId = await getUserPrimaryOrgId(user.id);

    const { accessToken, refreshToken } = generateTokens(user, orgId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    const isPlatformAdmin = isPlatformAdminAccount(user);
    recordPresenceSafely(user.id, orgId, user.email, user.full_name, 'owner');
    const formattedUser = {
      id: user.id,
      email: user.email,
      is_platform_admin: isPlatformAdmin,
      user_metadata: { full_name: user.full_name, phone: user.phone, is_platform_admin: isPlatformAdmin },
      created_at: user.created_at,
    };

    return res.status(200).json({
      user: formattedUser,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: formattedUser,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body?.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Check short grace cache in case multiple concurrent calls sent the same old token
    const cached = recentRefreshCache.get(refreshToken);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.payload);
    }

    // Coalesce concurrent in-flight refresh requests for the same refresh token
    if (inFlightRefreshes.has(refreshToken)) {
      const sharedResult = await inFlightRefreshes.get(refreshToken);
      return res.status(sharedResult.status).json(sharedResult.body);
    }

    const refreshWork = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const tokenRes = await client.query(
          `SELECT rt.id, rt.user_id, rt.expires_at,
                  COALESCE(u.email, '') as email,
                  COALESCE(u.full_name, '') as full_name,
                  u.phone,
                  u.avatar_url,
                  COALESCE(u.created_at, NOW()) as created_at,
                  COALESCE(u.is_platform_admin, false) as is_platform_admin
           FROM refresh_tokens rt
           LEFT JOIN users u ON u.id = rt.user_id
           WHERE rt.token = $1
           FOR UPDATE OF rt`,
          [refreshToken]
        ).catch(async () => {
          // Fallback in case is_platform_admin column is not yet present on users
          await client.query('ROLLBACK');
          await client.query('BEGIN');
          return client.query(
            `SELECT rt.id, rt.user_id, rt.expires_at,
                    COALESCE(u.email, '') as email,
                    COALESCE(u.full_name, '') as full_name,
                    u.phone,
                    u.avatar_url,
                    COALESCE(u.created_at, NOW()) as created_at,
                    false as is_platform_admin
             FROM refresh_tokens rt
             LEFT JOIN users u ON u.id = rt.user_id
             WHERE rt.token = $1
             FOR UPDATE OF rt`,
            [refreshToken]
          );
        });

        if (tokenRes.rows.length === 0 || new Date(tokenRes.rows[0].expires_at) < new Date()) {
          await client.query('ROLLBACK');
          // Re-check grace cache in case another process/request just rotated it
          const lateCached = recentRefreshCache.get(refreshToken);
          if (lateCached && lateCached.expiresAt > Date.now()) {
            return { status: 200, body: lateCached.payload };
          }
          return { status: 401, body: { error: 'Invalid or expired refresh token' } };
        }

        const row = tokenRes.rows[0];
        const user = {
          id: row.user_id,
          email: row.email,
          full_name: row.full_name,
          phone: row.phone,
          avatar_url: row.avatar_url,
          is_platform_admin: Boolean(row.is_platform_admin),
          created_at: row.created_at,
        };

        const orgId = await getUserPrimaryOrgId(user.id);
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, orgId);
        const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await client.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        // Use simple INSERT to avoid ON CONFLICT requirement (token is unique by generation)
        try {
          await client.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, newRefreshToken, newExpiresAt]
          );
        } catch (_insertErr) {
          // If token collision (extremely rare), upsert by updating existing
          await client.query(
            `UPDATE refresh_tokens SET user_id = $1, expires_at = $3 WHERE token = $2`,
            [user.id, newRefreshToken, newExpiresAt]
          );
        }

        await client.query('COMMIT');

        const isPlatformAdmin = isPlatformAdminAccount(user);
        recordPresenceSafely(user.id, orgId, user.email, user.full_name, 'owner');
        const formattedUser = {
          id: user.id,
          email: user.email,
          is_platform_admin: isPlatformAdmin,
          user_metadata: { full_name: user.full_name, phone: user.phone, is_platform_admin: isPlatformAdmin },
          created_at: user.created_at,
        };

        const responsePayload = {
          user: formattedUser,
          session: {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            user: formattedUser,
          },
          access_token: accessToken,
          refresh_token: newRefreshToken,
        };

        recentRefreshCache.set(refreshToken, {
          expiresAt: Date.now() + REFRESH_GRACE_TTL_MS,
          payload: responsePayload,
        });
        if (recentRefreshCache.size > 500) {
          const now = Date.now();
          for (const [k, v] of recentRefreshCache.entries()) {
            if (v.expiresAt <= now) recentRefreshCache.delete(k);
          }
        }

        return { status: 200, body: responsePayload };
      } catch (innerErr) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Refresh inner error:', innerErr);
        return { status: 500, body: { error: innerErr.message || 'Token refresh failed' } };
      } finally {
        client.release();
      }
    })();

    inFlightRefreshes.set(refreshToken, refreshWork);
    try {
      const out = await refreshWork;
      return res.status(out.status).json(out.body);
    } finally {
      inFlightRefreshes.delete(refreshToken);
    }
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message || 'Token refresh failed' });
  }
});

// GET /api/auth/user
router.get('/user', authenticate, async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const isPlatformAdmin = isPlatformAdminAccount(user);
    if (req.orgId) {
      recordPresenceSafely(user.id, req.orgId, user.email, user.full_name, 'owner');
    }
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_platform_admin: isPlatformAdmin,
        user_metadata: { full_name: user.full_name, phone: user.phone, is_platform_admin: isPlatformAdmin },
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signout
router.post('/signout', async (req, res) => {
  try {
    const refreshToken = req.body.refresh_token;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    return res.json({ error: null });
  } catch (err) {
    return res.json({ error: null });
  }
});

module.exports = router;

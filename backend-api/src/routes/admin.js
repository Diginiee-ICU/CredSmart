const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All admin and feature routes require authentication
router.use(authenticate);

const getOrgId = (req) => {
  return (
    req.headers['x-organization-id'] ||
    req.orgId ||
    req.query.organization_id ||
    req.query.org_id ||
    req.body.organization_id ||
    req.body.org_id
  );
};

// ============================================================================
// 1. LIVE PRESENCE & HEARTBEAT
// ============================================================================

// POST /api/presence/heartbeat
router.post('/presence/heartbeat', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const userId = req.user.id;
    const {
      user_email = req.user.email || '',
      user_name = '',
      user_role = 'cashier',
      current_path = '',
      platform = 'desktop-web',
    } = req.body;

    const query = `
      INSERT INTO user_presence (
        user_id, org_id, organization_id, user_email, user_name, user_role, current_path, platform, last_active_at
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET
        user_email = COALESCE(NULLIF(EXCLUDED.user_email, ''), user_presence.user_email),
        user_name = COALESCE(NULLIF(EXCLUDED.user_name, ''), user_presence.user_name),
        user_role = COALESCE(NULLIF(EXCLUDED.user_role, ''), user_presence.user_role),
        current_path = EXCLUDED.current_path,
        platform = EXCLUDED.platform,
        last_active_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, [
      userId,
      orgId,
      user_email,
      user_name,
      user_role,
      current_path,
      platform,
    ]);

    return res.json({ success: true, presence: result.rows[0] });
  } catch (err) {
    console.error('Presence heartbeat error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/presence/live-users
router.get('/presence/live-users', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const query = `
      SELECT 
        p.*,
        u.avatar_url,
        COALESCE(NULLIF(p.user_name, ''), u.full_name, split_part(p.user_email, '@', 1)) as display_name,
        CASE
          WHEN p.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 'online'
          WHEN p.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 'idle'
          ELSE 'offline'
        END as status
      FROM user_presence p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE (p.organization_id = $1 OR p.org_id = $1)
        AND p.last_active_at >= NOW() - INTERVAL '30 minutes'
      ORDER BY p.last_active_at DESC;
    `;

    const result = await pool.query(query, [orgId]);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Get live users error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. ADMIN METRICS & ANALYTICS OVERVIEW
// ============================================================================

// GET /api/admin/metrics
router.get('/admin/metrics', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // 1. Live Users Count (active in last 3 minutes)
    const liveUsersRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM user_presence 
       WHERE (organization_id = $1 OR org_id = $1) 
         AND last_active_at >= NOW() - INTERVAL '3 minutes'`,
      [orgId]
    );
    const liveUsersCount = liveUsersRes.rows[0]?.count || 0;

    // 2. Today's Billings Count & Amount
    const todaySalesRes = await pool.query(
      `SELECT 
         COUNT(*)::int as count,
         COALESCE(SUM(total), 0)::numeric(12,2) as total_amount
       FROM sales 
       WHERE (organization_id = $1 OR org_id = $1) 
         AND created_at >= CURRENT_DATE`,
      [orgId]
    );
    const todayBillsCount = todaySalesRes.rows[0]?.count || 0;
    const todaySalesTotal = Number(todaySalesRes.rows[0]?.total_amount || 0);

    // 3. Lifetime Total Billings Count & Amount
    const totalSalesRes = await pool.query(
      `SELECT 
         COUNT(*)::int as count,
         COALESCE(SUM(total), 0)::numeric(12,2) as total_amount
       FROM sales 
       WHERE (organization_id = $1 OR org_id = $1)`,
      [orgId]
    );
    const totalBillsCount = totalSalesRes.rows[0]?.count || 0;
    const totalSalesTotal = Number(totalSalesRes.rows[0]?.total_amount || 0);

    // 4. Pending Access Requests Count
    let pendingRequestsCount = 0;
    try {
      const pendingReqRes = await pool.query(
        `SELECT COUNT(*)::int as count 
         FROM feature_access_requests 
         WHERE (organization_id = $1 OR org_id = $1) 
           AND status = 'pending'`,
        [orgId]
      );
      pendingRequestsCount = pendingReqRes.rows[0]?.count || 0;
    } catch (_reqErr) {
      // Table might be initializing
    }

    // 5. Hourly Billing Velocity for Today
    const hourlyRes = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM created_at)::int as hour,
         COUNT(*)::int as count,
         COALESCE(SUM(total), 0)::numeric(12,2) as total
       FROM sales 
       WHERE (organization_id = $1 OR org_id = $1) 
         AND created_at >= CURRENT_DATE
       GROUP BY hour 
       ORDER BY hour ASC`,
      [orgId]
    );

    // 6. Billings by Staff / Cashier
    const staffSalesRes = await pool.query(
      `SELECT 
         s.created_by as user_id,
         COALESCE(u.full_name, split_part(u.email, '@', 1), 'Counter Operator') as user_name,
         u.email as user_email,
         COUNT(s.id)::int as count,
         COALESCE(SUM(s.total), 0)::numeric(12,2) as total
       FROM sales s
       LEFT JOIN users u ON u.id = s.created_by
       WHERE (s.organization_id = $1 OR s.org_id = $1)
       GROUP BY s.created_by, u.full_name, u.email
       ORDER BY count DESC
       LIMIT 10`,
      [orgId]
    );

    // 7. Feature Usage Analytics
    let featureUsageStats = [];
    try {
      const usageRes = await pool.query(
        `SELECT 
           feature_key,
           COUNT(*)::int as usage_count,
           COUNT(DISTINCT user_id)::int as unique_users
         FROM feature_usage_logs
         WHERE (organization_id = $1 OR org_id = $1)
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY feature_key
         ORDER BY usage_count DESC`,
        [orgId]
      );
      featureUsageStats = usageRes.rows || [];
    } catch (_usageErr) {
      // Table might be empty or initializing
    }

    return res.json({
      live_users_count: liveUsersCount,
      today_bills_count: todayBillsCount,
      today_sales_total: todaySalesTotal,
      total_bills_count: totalBillsCount,
      total_sales_total: totalSalesTotal,
      pending_requests_count: pendingRequestsCount,
      hourly_velocity: hourlyRes.rows || [],
      billings_by_staff: staffSalesRes.rows || [],
      feature_usage_stats: featureUsageStats,
    });
  } catch (err) {
    console.error('Get admin metrics error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. USER MANAGEMENT & FEATURE ACCESS
// ============================================================================

// GET /api/admin/users
router.get('/admin/users', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const query = `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.avatar_url,
        u.created_at,
        COALESCE(m.role, 'cashier') as role,
        CASE
          WHEN p.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 'online'
          WHEN p.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 'idle'
          ELSE 'offline'
        END as presence_status,
        p.last_active_at,
        p.current_path,
        p.platform,
        COALESCE(sc.bill_count, 0)::int as bill_count,
        COALESCE(sc.bill_total, 0)::numeric(12,2) as bill_total,
        COALESCE(fl.locked_count, 0)::int as locked_features_count
      FROM users u
      JOIN (
        SELECT user_id, org_id, organization_id, role FROM org_memberships WHERE (org_id = $1 OR organization_id = $1)
        UNION
        SELECT user_id, organization_id as org_id, organization_id, role FROM organization_memberships WHERE (organization_id = $1 OR org_id = $1)
      ) m ON m.user_id = u.id
      LEFT JOIN user_presence p ON p.user_id = u.id AND (p.organization_id = $1 OR p.org_id = $1)
      LEFT JOIN (
        SELECT created_by, COUNT(*)::int as bill_count, SUM(total) as bill_total
        FROM sales
        WHERE (organization_id = $1 OR org_id = $1)
        GROUP BY created_by
      ) sc ON sc.created_by = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as locked_count
        FROM user_feature_locks
        WHERE (organization_id = $1 OR org_id = $1) AND is_locked = true
        GROUP BY user_id
      ) fl ON fl.user_id = u.id
      ORDER BY u.id, u.created_at ASC;
    `;

    const result = await pool.query(query, [orgId]);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Get admin users error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/create-user
router.post('/admin/create-user', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { email, password, full_name = '', role = 'admin', phone = '' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    // 1. Check or insert into users
    let userId;
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             full_name = COALESCE(NULLIF($2, ''), full_name),
             phone = COALESCE(NULLIF($3, ''), phone),
             updated_at = NOW() 
         WHERE id = $4`,
        [passwordHash, full_name, phone, userId]
      );
    } else {
      const newUserRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [cleanEmail, passwordHash, full_name, phone]
      );
      userId = newUserRes.rows[0].id;
    }

    // 2. Insert/update organization memberships
    const userRole = (role || 'admin').toLowerCase();
    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role)
       VALUES ($1, $2, $2, $3)
       ON CONFLICT (user_id, org_id) 
       DO UPDATE SET role = EXCLUDED.role`,
      [userId, orgId, userRole]
    );

    try {
      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
         VALUES ($1, $2, $2, $3)
         ON CONFLICT (user_id, organization_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [userId, orgId, userRole]
      );
    } catch (_omErr) {
      // organization_memberships fallback
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `User ${cleanEmail} created with role ${userRole}`,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: full_name || cleanEmail,
        role: userRole,
        org_id: orgId,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create admin user error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/users/:userId/features
router.get('/admin/users/:userId/features', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { userId } = req.params;
    if (!orgId || !userId) {
      return res.status(400).json({ error: 'Organization ID and User ID are required' });
    }

    const locksRes = await pool.query(
      `SELECT feature_key, is_locked, updated_at 
       FROM user_feature_locks 
       WHERE (organization_id = $1 OR org_id = $1) AND user_id = $2`,
      [orgId, userId]
    );

    const locksMap = {};
    (locksRes.rows || []).forEach((row) => {
      locksMap[row.feature_key] = row.is_locked;
    });

    return res.json(locksMap);
  } catch (err) {
    console.error('Get user features error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/features/toggle
router.post('/admin/users/:userId/features/toggle', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { userId } = req.params;
    const { feature_key, is_locked } = req.body;

    if (!orgId || !userId || !feature_key) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const lockedBool = Boolean(is_locked);
    const query = `
      INSERT INTO user_feature_locks (
        org_id, organization_id, user_id, feature_key, is_locked, locked_by, locked_at, updated_at
      )
      VALUES ($1, $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (organization_id, user_id, feature_key)
      DO UPDATE SET
        is_locked = EXCLUDED.is_locked,
        locked_by = EXCLUDED.locked_by,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, [
      orgId,
      userId,
      feature_key,
      lockedBool,
      req.user.id,
    ]);

    return res.json({ success: true, lock: result.rows[0] });
  } catch (err) {
    console.error('Toggle feature lock error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/features/bulk
router.post('/admin/users/:userId/features/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = getOrgId(req);
    const { userId } = req.params;
    const { locks = {} } = req.body;

    if (!orgId || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await client.query('BEGIN');
    for (const [featureKey, isLocked] of Object.entries(locks)) {
      await client.query(
        `INSERT INTO user_feature_locks (
           org_id, organization_id, user_id, feature_key, is_locked, locked_by, locked_at, updated_at
         )
         VALUES ($1, $1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (organization_id, user_id, feature_key)
         DO UPDATE SET
           is_locked = EXCLUDED.is_locked,
           locked_by = EXCLUDED.locked_by,
           updated_at = NOW();`,
        [orgId, userId, featureKey, Boolean(isLocked), req.user.id]
      );
    }
    await client.query('COMMIT');

    return res.json({ success: true, updated: Object.keys(locks).length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk update feature locks error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// 4. ACCESS REQUESTS & APPROVAL QUEUE
// ============================================================================

// GET /api/admin/access-requests
router.get('/admin/access-requests', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { status = 'all' } = req.query;
    let query = `
      SELECT 
        r.*,
        u.avatar_url,
        COALESCE(u.full_name, split_part(u.email, '@', 1), r.user_name) as display_name,
        COALESCE(m.role, 'cashier') as user_role,
        rev.full_name as reviewer_name
      FROM feature_access_requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN (
        SELECT user_id, role FROM org_memberships WHERE (org_id = $1 OR organization_id = $1)
        UNION
        SELECT user_id, role FROM organization_memberships WHERE (organization_id = $1 OR org_id = $1)
      ) m ON m.user_id = r.user_id
      LEFT JOIN users rev ON rev.id = r.reviewed_by
      WHERE (r.organization_id = $1 OR r.org_id = $1)
    `;

    const params = [orgId];
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND r.status = $2`;
    }
    query += ` ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC;`;

    const result = await pool.query(query, params);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Get access requests error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/access-requests/:id/review
router.post('/admin/access-requests/:id/review', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const { status, admin_notes = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    await client.query('BEGIN');

    // 1. Update the request status
    const reqRes = await client.query(
      `UPDATE feature_access_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_notes = $3, updated_at = NOW()
       WHERE id = $4 AND (organization_id = $5 OR org_id = $5)
       RETURNING *;`,
      [status, req.user.id, admin_notes, id, orgId]
    );

    if (reqRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Access request not found' });
    }

    const updatedRequest = reqRes.rows[0];

    // 2. If approved, immediately unlock the feature for the requester!
    if (status === 'approved') {
      await client.query(
        `INSERT INTO user_feature_locks (
           org_id, organization_id, user_id, feature_key, is_locked, locked_by, updated_at
         )
         VALUES ($1, $1, $2, $3, false, $4, NOW())
         ON CONFLICT (organization_id, user_id, feature_key)
         DO UPDATE SET is_locked = false, updated_at = NOW();`,
        [orgId, updatedRequest.user_id, updatedRequest.feature_key, req.user.id]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, request: updatedRequest });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Review access request error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// 5. OPERATOR-FACING ACCESS REQUESTS & FEATURE LOCK INSPECTION
// ============================================================================

// POST /api/features/request-access
router.post('/features/request-access', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { feature_key, reason = '' } = req.body;
    if (!feature_key) {
      return res.status(400).json({ error: 'Feature key is required' });
    }

    // Check if an existing pending request already exists
    const existing = await pool.query(
      `SELECT * FROM feature_access_requests
       WHERE (organization_id = $1 OR org_id = $1)
         AND user_id = $2
         AND feature_key = $3
         AND status = 'pending'`,
      [orgId, req.user.id, feature_key]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, request: existing.rows[0], already_pending: true });
    }

    const query = `
      INSERT INTO feature_access_requests (
        org_id, organization_id, user_id, user_email, user_name, feature_key, reason, status
      )
      VALUES ($1, $1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *;
    `;

    const result = await pool.query(query, [
      orgId,
      req.user.id,
      req.user.email || '',
      req.user.full_name || '',
      feature_key,
      reason,
    ]);

    return res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error('Submit feature access request error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/features/my-requests
router.get('/features/my-requests', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const result = await pool.query(
      `SELECT * FROM feature_access_requests
       WHERE (organization_id = $1 OR org_id = $1)
         AND user_id = $2
       ORDER BY created_at DESC;`,
      [orgId, req.user.id]
    );

    return res.json(result.rows || []);
  } catch (err) {
    console.error('Get my access requests error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/features/my-locks
router.get('/features/my-locks', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const result = await pool.query(
      `SELECT feature_key, is_locked FROM user_feature_locks
       WHERE (organization_id = $1 OR org_id = $1)
         AND user_id = $2;`,
      [orgId, req.user.id]
    );

    const locks = {};
    (result.rows || []).forEach((r) => {
      locks[r.feature_key] = r.is_locked;
    });

    return res.json(locks);
  } catch (err) {
    console.error('Get my locks error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/features/log-usage
router.post('/features/log-usage', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.json({ success: false });

    const { feature_key, action = 'view' } = req.body;
    if (!feature_key) return res.json({ success: false });

    await pool.query(
      `INSERT INTO feature_usage_logs (org_id, organization_id, user_id, feature_key, action)
       VALUES ($1, $1, $2, $3, $4)`,
      [orgId, req.user.id, feature_key, action]
    );

    return res.json({ success: true });
  } catch (_err) {
    // Non-blocking telemetry
    return res.json({ success: false });
  }
});

module.exports = router;

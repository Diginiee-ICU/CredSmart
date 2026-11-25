const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All admin and feature routes require authentication
router.use(authenticate);

const PLATFORM_ADMIN_EMAILS = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS || 'ashwinbishnoi05@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const getOrgId = (req) => {
  return (
    req.headers['x-organization-id'] ||
    req.orgId ||
    req.query.organization_id ||
    req.query.org_id ||
    req.body?.organization_id ||
    req.body?.org_id
  );
};

const isPlatformAdmin = async (reqUser) => {
  if (!reqUser || !reqUser.id) return false;
  if (reqUser.is_platform_admin === true) return true;
  if (reqUser.email && PLATFORM_ADMIN_EMAILS.has(String(reqUser.email).trim().toLowerCase())) {
    return true;
  }
  try {
    const res = await pool.query('SELECT email, is_platform_admin FROM users WHERE id = $1', [reqUser.id]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (row.is_platform_admin === true) return true;
      if (row.email && PLATFORM_ADMIN_EMAILS.has(String(row.email).trim().toLowerCase())) {
        return true;
      }
    }
  } catch (_err) {
    // Fallback if column not migrated yet
  }
  try {
    const roleRes = await pool.query(
      `SELECT 1 FROM org_memberships WHERE user_id = $1 AND LOWER(role) = 'super_admin' LIMIT 1`,
      [reqUser.id]
    );
    if (roleRes.rows.length > 0) return true;
  } catch (_err) {}
  return false;
};

const shouldUsePlatformScope = async (req) => {
  const requestedScope = String(req.query.scope || '').toLowerCase();
  if (requestedScope === 'org') return false;
  return await isPlatformAdmin(req.user);
};

const resolveTargetOrgForFeatureManagement = async (req, targetUserId) => {
  const callerOrgId = getOrgId(req);
  const explicitTargetOrgId = req.query.target_org_id || req.body?.target_org_id;
  const platformAdmin = await isPlatformAdmin(req.user);

  if (platformAdmin && explicitTargetOrgId && explicitTargetOrgId !== 'undefined' && explicitTargetOrgId !== 'null') {
    return String(explicitTargetOrgId);
  }

  if (platformAdmin && targetUserId) {
    try {
      const membershipRes = await pool.query(
        `SELECT org_id FROM (
           SELECT COALESCE(org_id, organization_id) AS org_id, 1 AS prio, created_at
           FROM org_memberships WHERE user_id = $1 AND COALESCE(org_id, organization_id) IS NOT NULL
           UNION ALL
           SELECT COALESCE(organization_id, org_id) AS org_id, 2 AS prio, created_at
           FROM organization_memberships WHERE user_id = $1 AND COALESCE(organization_id, org_id) IS NOT NULL
           UNION ALL
           SELECT id AS org_id, 3 AS prio, created_at
           FROM organizations WHERE owner_id = $1
           UNION ALL
           SELECT COALESCE(organization_id, org_id) AS org_id, 4 AS prio, last_active_at AS created_at
           FROM user_presence WHERE user_id = $1 AND COALESCE(organization_id, org_id) IS NOT NULL
         ) m ORDER BY prio ASC, created_at ASC LIMIT 1`,
        [targetUserId]
      );
      if (membershipRes.rows.length > 0 && membershipRes.rows[0].org_id) {
        return membershipRes.rows[0].org_id;
      }
    } catch (_err) {
      // Fallback to callerOrgId below
    }
  }

  return callerOrgId;
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
    } = req.body || {};

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
    const usePlatformScope = await shouldUsePlatformScope(req);
    const orgId = getOrgId(req);

    if (!usePlatformScope && !orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    if (usePlatformScope) {
      const query = `
        SELECT * FROM (
          SELECT DISTINCT ON (p.user_id)
            p.*,
            u.avatar_url,
            COALESCE(NULLIF(TRIM(p.user_name), ''), NULLIF(TRIM(u.full_name), ''), split_part(COALESCE(NULLIF(p.user_email, ''), u.email, ''), '@', 1), 'User') as display_name,
            COALESCE(NULLIF(p.user_email, ''), u.email, '') as resolved_email,
            COALESCE(o.name, 'Business') as organization_name,
            CASE
              WHEN p.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 'online'
              WHEN p.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 'idle'
              ELSE 'offline'
            END as status
          FROM user_presence p
          LEFT JOIN users u ON u.id = p.user_id
          LEFT JOIN organizations o ON o.id = COALESCE(p.organization_id, p.org_id)
          WHERE p.last_active_at >= NOW() - INTERVAL '30 minutes'
          ORDER BY p.user_id, p.last_active_at DESC
        ) sub
        ORDER BY sub.last_active_at DESC;
      `;
      try {
        const result = await pool.query(query);
        return res.json(result.rows || []);
      } catch (liveErr) {
        console.warn('Live users enriched query fallback:', liveErr.message);
        const fallback = await pool.query(
          `SELECT DISTINCT ON (p.user_id)
             p.*,
             COALESCE(NULLIF(TRIM(p.user_name), ''), split_part(COALESCE(p.user_email, ''), '@', 1), 'User') as display_name,
             COALESCE(p.user_email, '') as resolved_email,
             'online' as status
           FROM user_presence p
           WHERE p.last_active_at >= NOW() - INTERVAL '30 minutes'
           ORDER BY p.user_id, p.last_active_at DESC`
        );
        return res.json(fallback.rows || []);
      }
    }

    const query = `
      SELECT 
        p.*,
        u.avatar_url,
        COALESCE(NULLIF(TRIM(p.user_name), ''), NULLIF(TRIM(u.full_name), ''), split_part(COALESCE(NULLIF(p.user_email, ''), u.email, ''), '@', 1), 'User') as display_name,
        COALESCE(o.name, 'Business') as organization_name,
        CASE
          WHEN p.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 'online'
          WHEN p.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 'idle'
          ELSE 'offline'
        END as status
      FROM user_presence p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN organizations o ON o.id = COALESCE(p.organization_id, p.org_id)
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
    const usePlatformScope = await shouldUsePlatformScope(req);
    const orgId = getOrgId(req);

    if (!usePlatformScope && !orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const scopeWhere = usePlatformScope ? '1=1' : '(organization_id = $1 OR org_id = $1)';
    const salesScopeWhere = usePlatformScope ? '1=1' : '(s.organization_id = $1 OR s.org_id = $1)';
    const params = usePlatformScope ? [] : [orgId];

    // 1. Live Users Count (active in last 3 minutes)
    const liveUsersRes = await pool.query(
      `SELECT COUNT(DISTINCT user_id)::int as count 
       FROM user_presence 
       WHERE ${scopeWhere} AND last_active_at >= NOW() - INTERVAL '3 minutes'`,
      params
    );
    const liveUsersCount = liveUsersRes.rows[0]?.count || 0;

    // 1b. Platform user & business counts when in platform scope
    let totalUsersCount;
    let totalOrgsCount;
    if (usePlatformScope) {
      const [uCountRes, oCountRes] = await Promise.all([
        pool.query('SELECT COUNT(*)::int as count FROM users'),
        pool.query('SELECT COUNT(*)::int as count FROM organizations'),
      ]);
      totalUsersCount = uCountRes.rows[0]?.count || 0;
      totalOrgsCount = oCountRes.rows[0]?.count || 0;
    }

    // 2. Today's Billings Count & Amount
    const todaySalesRes = await pool.query(
      `SELECT 
         COUNT(*)::int as count,
         COALESCE(SUM(COALESCE(NULLIF(total_amount, 0), total, 0)), 0)::numeric(12,2) as total_amount
       FROM sales 
       WHERE ${scopeWhere} AND created_at >= CURRENT_DATE`,
      params
    );
    const todayBillsCount = todaySalesRes.rows[0]?.count || 0;
    const todaySalesTotal = Number(todaySalesRes.rows[0]?.total_amount || 0);

    // 3. Lifetime Total Billings Count & Amount
    const totalSalesRes = await pool.query(
      `SELECT 
         COUNT(*)::int as count,
         COALESCE(SUM(COALESCE(NULLIF(total_amount, 0), total, 0)), 0)::numeric(12,2) as total_amount
       FROM sales 
       WHERE ${scopeWhere}`,
      params
    );
    const totalBillsCount = totalSalesRes.rows[0]?.count || 0;
    const totalSalesTotal = Number(totalSalesRes.rows[0]?.total_amount || 0);

    // 4. Pending Access Requests Count
    let pendingRequestsCount = 0;
    try {
      const pendingReqRes = await pool.query(
        `SELECT COUNT(*)::int as count 
         FROM feature_access_requests 
         WHERE ${scopeWhere} AND status = 'pending'`,
        params
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
         COALESCE(SUM(COALESCE(NULLIF(total_amount, 0), total, 0)), 0)::numeric(12,2) as total
       FROM sales 
       WHERE ${scopeWhere} AND created_at >= CURRENT_DATE
       GROUP BY hour 
       ORDER BY hour ASC`,
      params
    );

    // 6. Billings by Staff / Business Owner
    let staffSalesRes;
    try {
      staffSalesRes = await pool.query(
        `SELECT 
           COALESCE(COALESCE(s.created_by, o.owner_id)::text, o.id::text, 'unassigned') as user_id,
           COALESCE(NULLIF(TRIM(u.full_name), ''), split_part(u.email, '@', 1), o.name, 'Business Operator') as user_name,
           COALESCE(u.email, o.email, '') as user_email,
           COALESCE(o.name, 'Business') as organization_name,
           COUNT(s.id)::int as count,
           COALESCE(SUM(COALESCE(NULLIF(s.total_amount, 0), s.total, 0)), 0)::numeric(12,2) as total
         FROM sales s
         LEFT JOIN organizations o ON o.id = COALESCE(s.organization_id, s.org_id)
         LEFT JOIN users u ON u.id = COALESCE(s.created_by, o.owner_id)
         WHERE ${salesScopeWhere}
         GROUP BY COALESCE(COALESCE(s.created_by, o.owner_id)::text, o.id::text, 'unassigned'), u.full_name, u.email, o.name, o.email
         ORDER BY count DESC
         LIMIT 25`,
        params
      );
    } catch (_staffSalesErr) {
      staffSalesRes = await pool.query(
        `SELECT 
           COALESCE(s.created_by::text, o.id::text, 'unassigned') as user_id,
           COALESCE(NULLIF(TRIM(u.full_name), ''), split_part(u.email, '@', 1), o.name, 'Business Operator') as user_name,
           COALESCE(u.email, o.email, '') as user_email,
           COALESCE(o.name, 'Business') as organization_name,
           COUNT(s.id)::int as count,
           COALESCE(SUM(COALESCE(NULLIF(s.total_amount, 0), s.total, 0)), 0)::numeric(12,2) as total
         FROM sales s
         LEFT JOIN users u ON u.id = s.created_by
         LEFT JOIN organizations o ON o.id = COALESCE(s.organization_id, s.org_id)
         WHERE ${salesScopeWhere}
         GROUP BY COALESCE(s.created_by::text, o.id::text, 'unassigned'), u.full_name, u.email, o.name, o.email
         ORDER BY count DESC
         LIMIT 25`,
        params
      );
    }

    // 7. Feature Usage Analytics
    let featureUsageStats = [];
    try {
      const usageRes = await pool.query(
        `SELECT 
           feature_key,
           COUNT(*)::int as usage_count,
           COUNT(DISTINCT user_id)::int as unique_users
         FROM feature_usage_logs
         WHERE ${scopeWhere} AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY feature_key
         ORDER BY usage_count DESC`,
        params
      );
      featureUsageStats = usageRes.rows || [];
    } catch (_usageErr) {
      // Table might be empty or initializing
    }

    return res.json({
      scope: usePlatformScope ? 'all' : 'org',
      live_users_count: liveUsersCount,
      total_users_count: totalUsersCount,
      total_orgs_count: totalOrgsCount,
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
    const usePlatformScope = await shouldUsePlatformScope(req);
    const orgId = getOrgId(req);

    if (!usePlatformScope && !orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    if (usePlatformScope) {
      // Platform Admin View: returns EVERY registered user, tester, real-time business owner, and staff across all organizations
      const platformQuery = `
        SELECT
          u.id,
          u.email,
          COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(lp.user_name), ''), split_part(u.email, '@', 1)) as full_name,
          u.phone,
          u.avatar_url,
          u.created_at,
          COALESCE(u.is_platform_admin, false) as is_platform_admin,
          COALESCE(m.org_id, lp.last_org_id) as organization_id,
          COALESCE(o.name, 'Unassigned') as organization_name,
          COALESCE(NULLIF(TRIM(m.role), ''), NULLIF(TRIM(lp.user_role), ''), CASE WHEN o.id IS NOT NULL THEN 'owner' ELSE 'user' END) as role,
          CASE
            WHEN lp.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 'online'
            WHEN lp.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 'idle'
            ELSE 'offline'
          END as presence_status,
          lp.last_active_at,
          lp.current_path,
          lp.platform,
          COALESCE(sc.bill_count, 0)::int as bill_count,
          COALESCE(sc.bill_total, 0)::numeric(12,2) as bill_total,
          COALESCE(fl.locked_count, 0)::int as locked_features_count
        FROM users u
        LEFT JOIN LATERAL (
          SELECT org_id, role FROM (
            SELECT COALESCE(org_id, organization_id) AS org_id, role, 1 AS prio, created_at
            FROM org_memberships WHERE user_id = u.id AND COALESCE(org_id, organization_id) IS NOT NULL
            UNION ALL
            SELECT COALESCE(organization_id, org_id) AS org_id, role, 2 AS prio, created_at
            FROM organization_memberships WHERE user_id = u.id AND COALESCE(organization_id, org_id) IS NOT NULL
            UNION ALL
            SELECT id AS org_id, 'owner' AS role, 3 AS prio, created_at
            FROM organizations WHERE owner_id = u.id
            UNION ALL
            SELECT COALESCE(csa.org_id, csa.organization_id) AS org_id, COALESCE(NULLIF(TRIM(cr.name), ''), 'staff') AS role, 4 AS prio, csa.created_at
            FROM crm_staff_assignments csa
            LEFT JOIN crm_roles cr ON cr.id = csa.role_id
            WHERE (csa.user_id = u.id OR csa.staff_id = u.id) AND COALESCE(csa.org_id, csa.organization_id) IS NOT NULL
          ) all_m
          ORDER BY prio ASC, created_at ASC
          LIMIT 1
        ) m ON true
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(organization_id, org_id) AS last_org_id,
            user_name,
            user_role,
            last_active_at,
            current_path,
            platform
          FROM user_presence
          WHERE user_id = u.id
          ORDER BY last_active_at DESC
          LIMIT 1
        ) lp ON true
        LEFT JOIN organizations o ON o.id = COALESCE(m.org_id, lp.last_org_id)
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as bill_count, COALESCE(SUM(COALESCE(NULLIF(s.total_amount, 0), s.total, 0)), 0) as bill_total
          FROM sales s
          WHERE s.created_by = u.id
             OR (
               LOWER(COALESCE(m.role, '')) IN ('owner', 'store_owner', 'super_admin', 'admin')
               AND s.created_by IS NULL
               AND COALESCE(m.org_id, lp.last_org_id) IS NOT NULL
               AND (s.organization_id = COALESCE(m.org_id, lp.last_org_id) OR s.org_id = COALESCE(m.org_id, lp.last_org_id))
             )
        ) sc ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as locked_count
          FROM user_feature_locks
          WHERE user_id = u.id AND is_locked = true
        ) fl ON true
        ORDER BY
          CASE
            WHEN lp.last_active_at >= NOW() - INTERVAL '3 minutes' THEN 0
            WHEN lp.last_active_at >= NOW() - INTERVAL '15 minutes' THEN 1
            ELSE 2
          END ASC,
          lp.last_active_at DESC NULLS LAST,
          u.created_at DESC;
      `;

      try {
        const result = await pool.query(platformQuery);
        return res.json(result.rows || []);
      } catch (primaryPlatformErr) {
        console.warn('Platform users enriched query fallback triggered:', primaryPlatformErr.message);
        const safePlatformQuery = `
          SELECT
            u.id,
            u.email,
            COALESCE(NULLIF(TRIM(u.full_name), ''), split_part(u.email, '@', 1)) as full_name,
            u.phone,
            u.avatar_url,
            u.created_at,
            false as is_platform_admin,
            m.org_id as organization_id,
            COALESCE(o.name, 'Unassigned') as organization_name,
            COALESCE(NULLIF(TRIM(m.role), ''), CASE WHEN o.id IS NOT NULL THEN 'owner' ELSE 'user' END) as role,
            'offline' as presence_status,
            NULL::timestamptz as last_active_at,
            COALESCE(sc.bill_count, 0)::int as bill_count,
            COALESCE(sc.bill_total, 0)::numeric(12,2) as bill_total,
            0::int as locked_features_count
          FROM users u
          LEFT JOIN LATERAL (
            SELECT COALESCE(org_id, organization_id) AS org_id, role
            FROM org_memberships
            WHERE user_id = u.id
            ORDER BY created_at ASC
            LIMIT 1
          ) m ON true
          LEFT JOIN organizations o ON o.id = m.org_id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as bill_count, COALESCE(SUM(COALESCE(NULLIF(s.total_amount, 0), s.total, 0)), 0) as bill_total
            FROM sales s
            WHERE s.created_by = u.id
          ) sc ON true
          ORDER BY u.created_at DESC;
        `;
        const fallbackResult = await pool.query(safePlatformQuery);
        return res.json(fallbackResult.rows || []);
      }
    }

    // Single-organization View: includes org_memberships, organization_memberships, organizations.owner_id, crm_staff_assignments & user_presence
    const orgQuery = `
      SELECT * FROM (
        SELECT DISTINCT ON (u.id)
          u.id,
          u.email,
          COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(p.user_name), ''), split_part(u.email, '@', 1)) as full_name,
          u.phone,
          u.avatar_url,
          u.created_at,
          $1::uuid as organization_id,
          COALESCE(o.name, 'Business') as organization_name,
          COALESCE(NULLIF(TRIM(m.role), ''), NULLIF(TRIM(p.user_role), ''), 'cashier') as role,
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
          SELECT user_id, role, 1 AS prio FROM org_memberships WHERE (org_id = $1 OR organization_id = $1)
          UNION ALL
          SELECT user_id, role, 2 AS prio FROM organization_memberships WHERE (organization_id = $1 OR org_id = $1)
          UNION ALL
          SELECT owner_id AS user_id, 'owner' AS role, 3 AS prio FROM organizations WHERE id = $1 AND owner_id IS NOT NULL
          UNION ALL
          SELECT COALESCE(csa.user_id, csa.staff_id) AS user_id, COALESCE(NULLIF(TRIM(cr.name), ''), 'staff') AS role, 4 AS prio
          FROM crm_staff_assignments csa
          LEFT JOIN crm_roles cr ON cr.id = csa.role_id
          WHERE (csa.org_id = $1 OR csa.organization_id = $1)
          UNION ALL
          SELECT user_id, COALESCE(NULLIF(user_role, ''), 'cashier') AS role, 5 AS prio FROM user_presence WHERE (organization_id = $1 OR org_id = $1)
        ) m ON m.user_id = u.id
        LEFT JOIN organizations o ON o.id = $1
        LEFT JOIN user_presence p ON p.user_id = u.id AND (p.organization_id = $1 OR p.org_id = $1)
        LEFT JOIN (
          SELECT created_by, COUNT(*)::int as bill_count, SUM(COALESCE(NULLIF(total_amount, 0), total, 0)) as bill_total
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
        ORDER BY u.id, m.prio ASC, u.created_at ASC
      ) users_list
      ORDER BY
        CASE WHEN users_list.presence_status = 'online' THEN 0 WHEN users_list.presence_status = 'idle' THEN 1 ELSE 2 END ASC,
        users_list.last_active_at DESC NULLS LAST,
        users_list.created_at DESC;
    `;

    try {
      const result = await pool.query(orgQuery, [orgId]);
      return res.json(result.rows || []);
    } catch (primaryOrgErr) {
      console.warn('Org users enriched query fallback triggered:', primaryOrgErr.message);
      const safeOrgQuery = `
        SELECT DISTINCT ON (u.id)
          u.id,
          u.email,
          COALESCE(NULLIF(TRIM(u.full_name), ''), split_part(u.email, '@', 1)) as full_name,
          u.phone,
          u.avatar_url,
          u.created_at,
          $1::uuid as organization_id,
          COALESCE(o.name, 'Business') as organization_name,
          COALESCE(NULLIF(TRIM(m.role), ''), 'owner') as role,
          'offline' as presence_status,
          0::int as bill_count,
          0::numeric(12,2) as bill_total,
          0::int as locked_features_count
        FROM users u
        JOIN org_memberships m ON m.user_id = u.id AND (m.org_id = $1 OR m.organization_id = $1)
        LEFT JOIN organizations o ON o.id = $1
        ORDER BY u.id, u.created_at DESC;
      `;
      const fallbackOrgRes = await pool.query(safeOrgQuery, [orgId]);
      return res.json(fallbackOrgRes.rows || []);
    }
  } catch (err) {
    console.error('Get admin users error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/create-user
router.post('/admin/create-user', async (req, res) => {
  const client = await pool.connect();
  try {
    const callerOrgId = getOrgId(req);
    const {
      email,
      password,
      full_name = '',
      role = 'admin',
      phone = '',
      create_own_org = false,
      organization_name = '',
      grant_platform_admin = false,
    } = req.body || {};

    const callerIsPlatformAdmin = await isPlatformAdmin(req.user);
    const userRole = (role || 'admin').toLowerCase();
    const willCreateOwnOrg = Boolean(
      create_own_org || (userRole === 'owner' && organization_name.trim()) || (!callerOrgId && callerIsPlatformAdmin)
    );

    if (!callerOrgId && !willCreateOwnOrg) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

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

    if (callerIsPlatformAdmin && grant_platform_admin) {
      try {
        await client.query('SAVEPOINT sp_grant_pa');
        await client.query('UPDATE users SET is_platform_admin = true WHERE id = $1', [userId]);
        await client.query('RELEASE SAVEPOINT sp_grant_pa');
      } catch (_e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_grant_pa');
      }
    }

    let targetOrgId = callerOrgId;

    if (willCreateOwnOrg) {
      const newOrgName = organization_name.trim() || (full_name ? `${full_name}'s Business` : `${cleanEmail.split('@')[0]}'s Business`);
      const orgRes = await client.query(
        `INSERT INTO organizations (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [newOrgName, cleanEmail, phone]
      );
      targetOrgId = orgRes.rows[0].id;

      try {
        await client.query('SAVEPOINT sp_owner_set');
        await client.query('UPDATE organizations SET owner_id = $1 WHERE id = $2', [userId, targetOrgId]);
        await client.query('RELEASE SAVEPOINT sp_owner_set');
      } catch (_e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_owner_set');
      }

      await client.query(
        `INSERT INTO invoice_sequences (org_id, organization_id, sales_prefix, sales_counter, purchase_prefix, purchase_counter)
         VALUES ($1, $1, 'INV', 0, 'PUR', 0)
         ON CONFLICT (org_id) DO NOTHING`,
        [targetOrgId]
      );
    }

    // 2. Insert/update organization memberships
    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role)
       VALUES ($1, $2, $2, $3)
       ON CONFLICT (user_id, org_id) 
       DO UPDATE SET role = EXCLUDED.role`,
      [userId, targetOrgId, userRole]
    );

    try {
      await client.query('SAVEPOINT sp_om_sync');
      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
         VALUES ($1, $2, $2, $3)
         ON CONFLICT (user_id, organization_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [userId, targetOrgId, userRole]
      );
      await client.query('RELEASE SAVEPOINT sp_om_sync');
    } catch (_omErr) {
      await client.query('ROLLBACK TO SAVEPOINT sp_om_sync');
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
        organization_id: targetOrgId,
        org_id: targetOrgId,
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
    const { userId } = req.params;
    const orgId = await resolveTargetOrgForFeatureManagement(req, userId);
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
    const { userId } = req.params;
    const { feature_key, is_locked } = req.body;
    const orgId = await resolveTargetOrgForFeatureManagement(req, userId);

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
    const { userId } = req.params;
    const { locks = {} } = req.body;
    const orgId = await resolveTargetOrgForFeatureManagement(req, userId);

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
    const usePlatformScope = await shouldUsePlatformScope(req);
    const orgId = getOrgId(req);

    if (!usePlatformScope && !orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { status = 'all' } = req.query;
    const params = [];
    let whereClause = '';

    if (!usePlatformScope) {
      params.push(orgId);
      whereClause = ` WHERE (r.organization_id = $1 OR r.org_id = $1)`;
    } else {
      whereClause = ` WHERE 1=1`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }

    const query = `
      SELECT 
        r.*,
        u.avatar_url,
        COALESCE(NULLIF(TRIM(u.full_name), ''), split_part(COALESCE(u.email, r.user_email, ''), '@', 1), r.user_name) as display_name,
        COALESCE(o.name, 'Business') as organization_name,
        COALESCE(m.role, 'cashier') as user_role,
        rev.full_name as reviewer_name
      FROM feature_access_requests r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN organizations o ON o.id = COALESCE(r.organization_id, r.org_id)
      LEFT JOIN LATERAL (
        SELECT role FROM org_memberships WHERE user_id = r.user_id AND (org_id = COALESCE(r.organization_id, r.org_id) OR organization_id = COALESCE(r.organization_id, r.org_id))
        UNION ALL
        SELECT role FROM organization_memberships WHERE user_id = r.user_id AND (organization_id = COALESCE(r.organization_id, r.org_id) OR org_id = COALESCE(r.organization_id, r.org_id))
        LIMIT 1
      ) m ON true
      LEFT JOIN users rev ON rev.id = r.reviewed_by
      ${whereClause}
      ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC;
    `;

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
    const platformAdmin = await isPlatformAdmin(req.user);
    const { id } = req.params;
    const { status, admin_notes = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    await client.query('BEGIN');

    // 1. Update the request status (platform admin can review across organizations)
    const reqRes = platformAdmin
      ? await client.query(
          `UPDATE feature_access_requests
           SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_notes = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *;`,
          [status, req.user.id, admin_notes, id]
        )
      : await client.query(
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
    const targetOrgId = updatedRequest.organization_id || updatedRequest.org_id || orgId;

    // 2. If approved, immediately unlock the feature for the requester in their org!
    if (status === 'approved' && targetOrgId) {
      await client.query(
        `INSERT INTO user_feature_locks (
           org_id, organization_id, user_id, feature_key, is_locked, locked_by, updated_at
         )
         VALUES ($1, $1, $2, $3, false, $4, NOW())
         ON CONFLICT (organization_id, user_id, feature_key)
         DO UPDATE SET is_locked = false, updated_at = NOW();`,
        [targetOrgId, updatedRequest.user_id, updatedRequest.feature_key, req.user.id]
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
    return res.json({ success: false });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== TENANT CONTEXT & ISOLATION HELPERS ====================

/**
 * Resolves the active organization ID strictly from request headers, query, or body.
 */
const resolveOrgId = (req) => {
  const raw =
    req.headers['x-organization-id'] ||
    req.query.organization_id ||
    req.query.org_id ||
    req.body?.organization_id ||
    req.body?.org_id ||
    req.orgId ||
    null;
  if (!raw || raw === 'undefined' || raw === 'null' || !String(raw).trim()) {
    return null;
  }
  return String(raw).trim();
};

/**
 * Validates standard UUIDv4 format to protect against PostgreSQL 22P02 syntax errors.
 */
const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim());

/**
 * Verifies that a user is an active member of the specified organization.
 * Prevents cross-organization user references in tasks, attendance, and payroll.
 * Supports org_memberships, organization_memberships, and crm_staff_assignments.
 */
const verifyUserInOrg = async (userId, orgId) => {
  if (!userId || !orgId) return false;
  try {
    const res = await pool.query(
      `SELECT 1 FROM (
         SELECT user_id FROM org_memberships WHERE user_id = $1 AND org_id = $2
         UNION
         SELECT user_id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2
         UNION
         SELECT COALESCE(user_id, staff_id) AS user_id FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2)
       ) m LIMIT 1`,
      [userId, orgId]
    );
    return res.rows.length > 0;
  } catch (err) {
    try {
      const r1 = await pool.query(
        `SELECT 1 FROM org_memberships WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [userId, orgId]
      );
      if (r1.rows.length > 0) return true;
    } catch {
      try {
        const r1b = await pool.query(
          `SELECT 1 FROM org_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
          [userId, orgId]
        );
        if (r1b.rows.length > 0) return true;
      } catch {}
    }

    try {
      const r2 = await pool.query(
        `SELECT 1 FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
        [userId, orgId]
      );
      if (r2.rows.length > 0) return true;
    } catch {
      try {
        const r2b = await pool.query(
          `SELECT 1 FROM organization_memberships WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [userId, orgId]
        );
        if (r2b.rows.length > 0) return true;
      } catch {}
    }

    try {
      const r3 = await pool.query(
        `SELECT 1 FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2) LIMIT 1`,
        [userId, orgId]
      );
      if (r3.rows.length > 0) return true;
    } catch {}

    return false;
  }
};

/**
 * Verifies that a CRM role belongs to the specified organization.
 * Prevents assigning or modifying roles belonging to another tenant.
 */
const verifyRoleInOrg = async (roleId, orgId) => {
  if (!roleId || !orgId) return false;
  if (!isUuid(roleId) || !isUuid(orgId)) return false;
  try {
    const res = await pool.query(
      `SELECT id FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2) LIMIT 1`,
      [roleId, orgId]
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
};

// ==================== ROLES & PERMISSIONS ====================

// GET /api/crm/roles
router.get('/roles', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    let rows = [];
    try {
      const result = await pool.query(
        `SELECT r.*,
                COALESCE(
                  json_agg(p.permission) FILTER (WHERE p.permission IS NOT NULL),
                  '[]'
                ) as permissions
         FROM crm_roles r
         LEFT JOIN crm_role_permissions p ON p.role_id = r.id
         WHERE (r.org_id = $1 OR r.organization_id = $1)
         GROUP BY r.id
         ORDER BY r.created_at ASC`,
        [orgId]
      );
      rows = result.rows || [];
    } catch (_err) {
      try {
        const simpleRes = await pool.query(
          `SELECT * FROM crm_roles WHERE org_id = $1 OR organization_id = $1 ORDER BY created_at ASC`,
          [orgId]
        );
        rows = simpleRes.rows || [];
      } catch (_simpleErr) {
        rows = [];
      }
    }

    // Auto-seed Super Admin role if none exists for this tenant
    if (rows.length === 0 && isUuid(orgId)) {
      try {
        const seedRes = await pool.query(
          `INSERT INTO crm_roles (org_id, organization_id, name, description, color, icon, is_super_admin)
           VALUES ($1, $1, 'Super Admin', 'Full administrative access across all CRM modules', '#1D4ED8', 'Crown', true)
           RETURNING *`,
          [orgId]
        );
        if (seedRes.rows && seedRes.rows.length > 0) {
          rows = [seedRes.rows[0]];
        }
      } catch (_seedErr) {}
    }

    return res.json(rows);
  } catch (err) {
    console.warn('GET /crm/roles notice:', err.message);
    return res.json([]);
  }
});

// GET /api/crm/permissions
router.get('/permissions', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const roleId = req.query.role_id || req.query.roleId;
    const roleIdsStr = req.query.role_ids || req.query.roleIds;
    let roleIds = [];
    if (roleId) roleIds.push(roleId);
    if (roleIdsStr) {
      const split = String(roleIdsStr).split(',').map((s) => s.trim()).filter(Boolean);
      roleIds = [...roleIds, ...split];
    }
    roleIds = Array.from(new Set(roleIds));

    // If explicit role IDs were requested, enforce tenant isolation:
    // Only return permissions for roles that actually belong to this organization!
    if (roleIds.length > 0 && orgId) {
      const phs = roleIds.map((_, i) => `$${i + 2}`).join(', ');
      const validRolesRes = await pool.query(
        `SELECT id FROM crm_roles WHERE (org_id = $1 OR organization_id = $1) AND id IN (${phs})`,
        [orgId, ...roleIds]
      ).catch(() => ({ rows: [] }));
      roleIds = validRolesRes.rows.map((r) => r.id);
      if (roleIds.length === 0) {
        return res.json([]);
      }
    } else if (roleIds.length === 0) {
      if (orgId) {
        const rolesRes = await pool.query(
          'SELECT id FROM crm_roles WHERE org_id = $1 OR organization_id = $1',
          [orgId]
        ).catch(() => ({ rows: [] }));
        roleIds = rolesRes.rows.map((r) => r.id);
      }
    }

    if (roleIds.length === 0) {
      return res.json([]);
    }

    const phs = roleIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT id, role_id, module, action, allowed, created_at 
       FROM crm_permissions 
       WHERE role_id IN (${phs})`,
      roleIds
    ).catch(async (err) => {
      if (err.code === '42P01') {
        const fallbackRes = await pool.query(
          `SELECT id, role_id, permission, created_at FROM crm_role_permissions WHERE role_id IN (${phs})`,
          roleIds
        ).catch(() => ({ rows: [] }));
        return {
          rows: fallbackRes.rows.map((r) => ({
            id: r.id,
            role_id: r.role_id,
            module: (r.permission || '').split(':')[0] || 'general',
            action: (r.permission || '').split(':')[1] || 'access',
            allowed: true,
            created_at: r.created_at,
          })),
        };
      }
      return { rows: [] };
    });

    return res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching CRM permissions:', err);
    return res.json([]);
  }
});

// POST /api/crm/permissions/bulk
router.post('/permissions/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required' });
    }

    const { permissions = [] } = req.body;
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    await client.query('BEGIN');
    let insertedCount = 0;

    for (const p of permissions) {
      const { role_id, module, action, allowed = true } = p;
      if (!role_id || !module || !action) continue;

      // Strict tenant isolation: verify role belongs to active organization
      const roleCheck = await client.query(
        `SELECT id FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
        [role_id, orgId]
      );
      if (roleCheck.rows.length === 0) {
        continue; // Disallow modifying foreign tenant role permissions
      }

      await client.query(
        `INSERT INTO crm_permissions (role_id, module, action, allowed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (role_id, module, action)
         DO UPDATE SET allowed = EXCLUDED.allowed`,
        [role_id, module, action, Boolean(allowed)]
      ).catch(async () => {
        const upd = await client.query(
          `UPDATE crm_permissions SET allowed = $1 WHERE role_id = $2 AND module = $3 AND action = $4`,
          [Boolean(allowed), role_id, module, action]
        ).catch(() => ({ rowCount: 0 }));
        if (upd.rowCount === 0) {
          await client.query(
            `INSERT INTO crm_permissions (role_id, module, action, allowed) VALUES ($1, $2, $3, $4)`,
            [role_id, module, action, Boolean(allowed)]
          ).catch(() => {});
        }
      });

      if (allowed) {
        await client.query(
          `INSERT INTO crm_role_permissions (role_id, permission)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [role_id, `${module}:${action}`]
        ).catch(() => {});
      } else {
        await client.query(
          `DELETE FROM crm_role_permissions WHERE role_id = $1 AND permission = $2`,
          [role_id, `${module}:${action}`]
        ).catch(() => {});
      }
      insertedCount++;
    }

    await client.query('COMMIT');
    return res.json({ success: true, count: insertedCount });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error bulk saving permissions:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/crm/permissions
router.delete('/permissions', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    const roleId = req.query.role_id || req.query.roleId;
    if (!roleId) return res.status(400).json({ error: 'role_id is required' });
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    // Strict tenant boundary check: verify role belongs to this organization
    const belongs = await verifyRoleInOrg(roleId, orgId);
    if (!belongs) {
      return res.status(404).json({ error: 'Role not found or unauthorized' });
    }

    await pool.query('DELETE FROM crm_permissions WHERE role_id = $1', [roleId]).catch(() => {});
    await pool.query('DELETE FROM crm_role_permissions WHERE role_id = $1', [roleId]).catch(() => {});

    return res.json({ success: true, role_id: roleId });
  } catch (err) {
    console.error('Error deleting permissions:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/roles
router.post('/roles', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { name, description = '', color = '#1D4ED8', icon = 'Shield', is_super_admin = false, permissions = [] } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Role name is required' });

    await client.query('BEGIN');
    const roleRes = await client.query(
      `INSERT INTO crm_roles (org_id, organization_id, name, description, color, icon, is_super_admin)
       VALUES ($1, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, name.trim(), description, color, icon, Boolean(is_super_admin)]
    );
    const role = roleRes.rows[0];

    if (Array.isArray(permissions) && permissions.length > 0) {
      for (const perm of permissions) {
        if (typeof perm === 'string') {
          const parts = perm.split(':');
          const mod = parts[0] || 'general';
          const act = parts[1] || 'view';
          try {
            await client.query(
              `INSERT INTO crm_permissions (role_id, module, action, allowed)
               VALUES ($1, $2, $3, true)
               ON CONFLICT (role_id, module, action) DO UPDATE SET allowed = true`,
              [role.id, mod, act]
            );
          } catch {}
          try {
            await client.query(
              `INSERT INTO crm_role_permissions (role_id, permission) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [role.id, perm]
            );
          } catch {}
        } else if (typeof perm === 'object' && perm !== null) {
          const mod = perm.module || 'general';
          const act = perm.action || 'view';
          const allowed = perm.allowed !== false;
          try {
            await client.query(
              `INSERT INTO crm_permissions (role_id, module, action, allowed)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (role_id, module, action) DO UPDATE SET allowed = EXCLUDED.allowed`,
              [role.id, mod, act, allowed]
            );
          } catch {}
        }
      }
    }
    await client.query('COMMIT');
    return res.status(201).json({ ...role, permissions });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/crm/roles/:id
router.put('/roles/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { name, color, icon, description } = req.body;
    const result = await pool.query(
      `UPDATE crm_roles
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           icon = COALESCE($3, icon),
           description = COALESCE($4, description)
       WHERE id = $5 AND (org_id = $6 OR organization_id = $6)
       RETURNING *`,
      [name, color, icon, description, id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/roles/:id
router.delete('/roles/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const result = await pool.query(
      'DELETE FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id',
      [req.params.id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found or unauthorized' });
    }

    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== STAFF PROVISIONING & ASSIGNMENTS ====================

// POST /api/crm/staff/provision
router.post('/staff/provision', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required' });
    }

    const { full_name, email, password, phone = '', store_role, role, crm_role_id } = req.body;
    const finalStoreRole = store_role || role || 'staff';

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Auto-derive default password as {firstName}123 if not explicitly provided
    let effectivePassword = password;
    if (!effectivePassword || !effectivePassword.trim()) {
      const cleanName = full_name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let autoPwd = cleanName ? `${cleanName}123` : 'staff123';
      while (autoPwd.length < 6) autoPwd += '3';
      effectivePassword = autoPwd;
    }

    if (effectivePassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    await client.query('BEGIN');

    // 1. Check if user exists in database
    const existingUserRes = await client.query(
      `SELECT id, email, full_name, phone FROM users WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );

    let userId;
    let isNewUser = false;
    let existingPasswordHash = null;

    if (existingUserRes && existingUserRes.rows && existingUserRes.rows.length > 0) {
      const existingUser = existingUserRes.rows[0];
      userId = existingUser.id;
      existingPasswordHash = existingUser.password_hash || null;

      if (!existingPasswordHash) {
        try {
          const pwdRes = await client.query(
            `SELECT password_hash FROM users WHERE id = $1`,
            [userId]
          );
          if (pwdRes && pwdRes.rows && pwdRes.rows[0] && pwdRes.rows[0].password_hash) {
            existingPasswordHash = pwdRes.rows[0].password_hash;
          }
        } catch {}
      }

      // Check if already a member of this specific organization
      let existingMember = false;
      try {
        const existingMemberRes = await client.query(
          `SELECT 1 FROM (
             SELECT user_id FROM org_memberships WHERE user_id = $1 AND org_id = $2
             UNION
             SELECT user_id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2
             UNION
             SELECT COALESCE(user_id, staff_id) AS user_id FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2)
           ) m LIMIT 1`,
          [userId, orgId]
        );
        existingMember = existingMemberRes && existingMemberRes.rows && existingMemberRes.rows.length > 0;
      } catch {
        const m1 = await client.query(
          `SELECT 1 FROM org_memberships WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [userId, orgId]
        ).catch(() => ({ rows: [] }));
        if (m1 && m1.rows && m1.rows.length > 0) {
          existingMember = true;
        } else {
          const m2 = await client.query(
            `SELECT 1 FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
            [userId, orgId]
          ).catch(() => ({ rows: [] }));
          if (m2 && m2.rows && m2.rows.length > 0) {
            existingMember = true;
          } else {
            const m3 = await client.query(
              `SELECT 1 FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2) LIMIT 1`,
              [userId, orgId]
            ).catch(() => ({ rows: [] }));
            existingMember = m3 && m3.rows && m3.rows.length > 0;
          }
        }
      }

      if (existingMember) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'A staff member with this email already belongs to this organization',
        });
      }

      // Update full_name, name, phone on existing user if missing
      if (full_name && full_name.trim() && (!existingUser.full_name || !existingUser.full_name.trim())) {
        await client.query(
          `UPDATE users SET full_name = $1, name = $1, updated_at = NOW() WHERE id = $2`,
          [full_name.trim(), userId]
        );
      }
      if (phone && phone.trim() && (!existingUser.phone || !existingUser.phone.trim())) {
        await client.query(`UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2`, [phone.trim(), userId]);
      }

      // Security (OI-3): Never overwrite or set password_hash for existing cross-tenant users,
      // even if their password_hash in users table is null (e.g. Supabase Auth / OAuth / external auth).
    } else {
      // Hash password with bcrypt and insert into users
      isNewUser = true;
      const passwordHash = await bcrypt.hash(effectivePassword, 10);
      const insertUserRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, name, phone)
         VALUES ($1, $2, $3, $3, $4)
         RETURNING id, email, full_name, phone, created_at`,
        [normalizedEmail, passwordHash, full_name.trim(), phone.trim()]
      );
      userId = insertUserRes.rows[0].id;
    }

    // 2. Firmly scope membership to the active organization
    try {
      await client.query(
        `INSERT INTO org_memberships (user_id, org_id, role, invited_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role`,
        [userId, orgId, finalStoreRole, req.user?.id || null]
      );
    } catch {
      await client.query(
        `INSERT INTO org_memberships (user_id, org_id, organization_id, role, invited_by)
         VALUES ($1, $2, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, orgId, finalStoreRole, req.user?.id || null]
      ).catch(() => {});
    }

    try {
      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, role, invited_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, orgId, finalStoreRole, req.user?.id || null]
      );
    } catch {
      await client.query(
        `INSERT INTO organization_memberships (user_id, org_id, organization_id, role, invited_by)
         VALUES ($1, $2, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, orgId, finalStoreRole, req.user?.id || null]
      ).catch(() => {});
    }

    // Baseline CRM staff assignment to guarantee org scoping in single-table deployments
    try {
      await client.query(
        `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, assigned_by)
         VALUES ($1, $1, $2, $2, $3)
         ON CONFLICT (user_id, org_id) DO NOTHING`,
        [orgId, userId, req.user?.id || null]
      );
    } catch {}

    // 3. Assign CRM Role strictly scoped to this organization if provided
    let assignedRole = null;
    if (crm_role_id) {
      const cleanRoleId = String(crm_role_id).trim();
      let roleCheck = { rows: [] };

      if (isUuid(cleanRoleId)) {
        roleCheck = await client.query(
          `SELECT id, name, color, icon FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
          [cleanRoleId, orgId]
        );
      }

      // If not found by literal ID, check if a Super Admin role exists in DB for this org, or auto-seed it
      if (roleCheck.rows.length === 0) {
        const isDefaultSuper =
          cleanRoleId === 'super-admin-default' ||
          cleanRoleId === 'role-super-admin' ||
          cleanRoleId === 'super_admin' ||
          cleanRoleId.toLowerCase().includes('super');

        if (isDefaultSuper) {
          const existingSuper = await client.query(
            `SELECT id, name, color, icon FROM crm_roles 
             WHERE (org_id = $1 OR organization_id = $1) AND (is_super_admin = true OR LOWER(name) = 'super admin') 
             LIMIT 1`,
            [orgId]
          );
          if (existingSuper.rows.length > 0) {
            roleCheck = existingSuper;
          } else {
            const seededRole = await client.query(
              `INSERT INTO crm_roles (org_id, organization_id, name, description, color, icon, is_super_admin)
               VALUES ($1, $1, 'Super Admin', 'Full administrative access across all CRM modules', '#1D4ED8', 'Crown', true)
               RETURNING id, name, color, icon`,
              [orgId]
            );
            roleCheck = seededRole;
          }
        } else {
          // Check by name if preset ID like 'role-crm-manager' or 'role-staff-associate'
          let presetName = null;
          if (cleanRoleId === 'role-crm-manager') presetName = 'CRM Manager';
          else if (cleanRoleId === 'role-staff-associate') presetName = 'Staff Associate';

          if (presetName) {
            const existingByName = await client.query(
              `SELECT id, name, color, icon FROM crm_roles WHERE (org_id = $1 OR organization_id = $1) AND LOWER(name) = LOWER($2) LIMIT 1`,
              [orgId, presetName]
            );
            if (existingByName.rows.length > 0) {
              roleCheck = existingByName;
            } else {
              const seededPreset = await client.query(
                `INSERT INTO crm_roles (org_id, organization_id, name, description, color, icon, is_super_admin)
                 VALUES ($1, $1, $2, 'Assigned CRM staff role', '#4F46E5', 'Shield', false)
                 RETURNING id, name, color, icon`,
                [orgId, presetName]
              );
              roleCheck = seededPreset;
            }
          }
        }
      }

      if (roleCheck.rows.length > 0) {
        assignedRole = roleCheck.rows[0];
        const effectiveRoleId = assignedRole.id;

        // Sync to crm_staff_assignments scoped firmly to orgId
        try {
          const upd = await client.query(
            `UPDATE crm_staff_assignments SET role_id = $1 WHERE (user_id = $2 OR staff_id = $2) AND (org_id = $3 OR organization_id = $3)`,
            [effectiveRoleId, userId, orgId]
          );
          if (upd.rowCount === 0) {
            await client.query(
              `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
               VALUES ($1, $1, $2, $2, $3, $4)`,
              [orgId, userId, effectiveRoleId, req.user?.id || null]
            );
          }
        } catch (confErr) {
          console.warn('crm_staff_assignments upsert notice:', confErr.message);
        }

        // Sync to crm_staff_roles
        try {
          await client.query(
            `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (staff_id, role_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by`,
            [userId, effectiveRoleId, req.user?.id || null]
          );
        } catch (_srErr) {
          try {
            await client.query(
              `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by) VALUES ($1, $2, $3)`,
              [userId, effectiveRoleId, req.user?.id || null]
            );
          } catch {}
        }
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: isNewUser ? 'Staff user provisioned successfully' : 'Existing user added to organization',
      user: {
        id: userId,
        email: normalizedEmail,
        full_name: full_name.trim(),
        phone: phone.trim(),
        store_role: finalStoreRole,
        crm_role_id: assignedRole ? assignedRole.id : null,
        crm_role_name: assignedRole ? assignedRole.name : null,
        crm_role_color: assignedRole ? assignedRole.color : null,
        crm_role_icon: assignedRole ? assignedRole.icon : null,
      },
      credentials: {
        email: normalizedEmail,
        password: isNewUser ? effectivePassword : '(existing account password)',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Staff provisioning error:', err);
    return res.status(500).json({ error: err.message || 'Staff provisioning failed' });
  } finally {
    client.release();
  }
});

// GET /api/crm/staff & GET /api/crm/staff-roles
const getStaffHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    // Strict multi-tenant query: only returns users with membership in orgId.
    // Roles are strictly scoped to orgId so foreign tenant roles never leak.
    const query = `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.id AS user_id,
        u.id AS staff_id,
        u.email,
        COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
        COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS name,
        u.phone,
        u.avatar_url,
        COALESCE(m.role, 'staff') AS store_role,
        COALESCE(m.role, 'staff') AS role,
        m.id AS membership_id,
        COALESCE(sa.role_id, sr_role.role_id) AS crm_role_id,
        COALESCE(sa.role_id, sr_role.role_id) AS role_id,
        COALESCE(sa_role.name, sr_role.name) AS role_name,
        COALESCE(sa_role.name, sr_role.name) AS crm_role_name,
        COALESCE(sa_role.color, sr_role.color) AS crm_role_color,
        COALESCE(sa_role.icon, sr_role.icon) AS crm_role_icon,
        COALESCE(sa_role.is_super_admin, sr_role.is_super_admin, false) AS is_super_admin,
        COALESCE(sa.created_at, m.created_at) AS assigned_at
      FROM (
        SELECT om.id, om.user_id, om.org_id, om.role, om.created_at 
        FROM org_memberships om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.org_id = $1
          AND (o.owner_id = om.user_id OR om.invited_by IS NOT NULL OR om.role != 'owner')
        UNION
        SELECT om2.id, om2.user_id, COALESCE(om2.organization_id, om2.org_id) AS org_id, om2.role, om2.created_at 
        FROM organization_memberships om2
        JOIN organizations o ON o.id = COALESCE(om2.organization_id, om2.org_id)
        WHERE (om2.organization_id = $1 OR om2.org_id = $1)
          AND (o.owner_id = om2.user_id OR om2.invited_by IS NOT NULL OR om2.role != 'owner')
        UNION
        SELECT sa_sub.id, COALESCE(sa_sub.user_id, sa_sub.staff_id) AS user_id, COALESCE(sa_sub.org_id, sa_sub.organization_id) AS org_id, 'staff' AS role, sa_sub.created_at 
        FROM crm_staff_assignments sa_sub
        WHERE (sa_sub.org_id = $1 OR sa_sub.organization_id = $1)
      ) m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN crm_staff_assignments sa 
        ON (sa.user_id = u.id OR sa.staff_id = u.id) AND (sa.org_id = $1 OR sa.organization_id = $1)
      LEFT JOIN crm_roles sa_role
        ON sa_role.id = sa.role_id AND (sa_role.org_id = $1 OR sa_role.organization_id = $1)
      LEFT JOIN (
        SELECT sr.staff_id, r.id AS role_id, r.name, r.color, r.icon, r.is_super_admin
        FROM crm_staff_roles sr
        JOIN crm_roles r ON r.id = sr.role_id AND (r.org_id = $1 OR r.organization_id = $1)
      ) sr_role ON sr_role.staff_id = u.id
      ${req.query.user_id ? 'WHERE u.id = $2' : ''}
      ORDER BY u.id, COALESCE(sa.role_id, sr_role.role_id) DESC NULLS LAST, m.created_at ASC
    `;
    const params = [orgId];
    if (req.query.user_id) params.push(req.query.user_id);

    let result;
    try {
      result = await pool.query(query, params);
    } catch (qErr) {
      // Fallback query if one membership table is missing
      const fallbackQuery = `
        SELECT DISTINCT ON (u.id)
          u.id,
          u.id AS user_id,
          u.id AS staff_id,
          u.email,
          COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
          COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS name,
          u.phone,
          u.avatar_url,
          COALESCE(m.role, 'staff') AS store_role,
          COALESCE(m.role, 'staff') AS role,
          m.id AS membership_id,
          NULL AS crm_role_id,
          NULL AS role_id,
          NULL AS role_name,
          NULL AS crm_role_name,
          NULL AS crm_role_color,
          NULL AS crm_role_icon,
          FALSE AS is_super_admin,
          m.created_at AS assigned_at
        FROM (
          SELECT id, user_id, role, created_at FROM org_memberships WHERE org_id = $1
        ) m
        JOIN users u ON u.id = m.user_id
        ${req.query.user_id ? 'WHERE u.id = $2' : ''}
        ORDER BY u.id, m.created_at ASC
      `;
      try {
        result = await pool.query(fallbackQuery, params);
      } catch {
        const fallback2 = `
          SELECT DISTINCT ON (u.id)
            u.id, u.id AS user_id, u.id AS staff_id, u.email,
            COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
            COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS name,
            u.phone, u.avatar_url,
            COALESCE(m.role, 'staff') AS store_role, COALESCE(m.role, 'staff') AS role,
            m.id AS membership_id, NULL AS crm_role_id, NULL AS role_id, NULL AS role_name,
            NULL AS crm_role_name, NULL AS crm_role_color, NULL AS crm_role_icon,
            FALSE AS is_super_admin, m.created_at AS assigned_at
          FROM (
            SELECT id, user_id, role, created_at FROM organization_memberships WHERE organization_id = $1
          ) m
          JOIN users u ON u.id = m.user_id
          ${req.query.user_id ? 'WHERE u.id = $2' : ''}
          ORDER BY u.id, m.created_at ASC
        `;
        try {
          result = await pool.query(fallback2, params);
        } catch {
          const fallback3 = `
            SELECT DISTINCT ON (u.id)
              u.id, u.id AS user_id, u.id AS staff_id, u.email,
              COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
              COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS name,
              u.phone, u.avatar_url,
              'staff' AS store_role, 'staff' AS role,
              m.id AS membership_id, NULL AS crm_role_id, NULL AS role_id, NULL AS role_name,
              NULL AS crm_role_name, NULL AS crm_role_color, NULL AS crm_role_icon,
              FALSE AS is_super_admin, m.created_at AS assigned_at
            FROM (
              SELECT id, COALESCE(user_id, staff_id) AS user_id, created_at FROM crm_staff_assignments WHERE org_id = $1 OR organization_id = $1
            ) m
            JOIN users u ON u.id = m.user_id
            ${req.query.user_id ? 'WHERE u.id = $2' : ''}
            ORDER BY u.id, m.created_at ASC
          `;
          result = await pool.query(fallback3, params).catch(() => ({ rows: [] }));
        }
      }
    }

    return res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching CRM staff:', err);
    return res.json([]);
  }
};

router.get('/staff', getStaffHandler);
router.get('/staff-roles', getStaffHandler);

// POST /api/crm/staff & POST /api/crm/staff-roles
const assignStaffRoleHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const userId = req.body.user_id || req.body.staff_id;
    const roleId = req.body.role_id;
    if (!userId || !roleId) {
      return res.status(400).json({ error: 'user_id and role_id are required' });
    }

    // Strict tenant isolation: verify role belongs to active organization
    const roleValid = await verifyRoleInOrg(roleId, orgId);
    if (!roleValid) {
      return res.status(404).json({ error: 'Role not found or unauthorized' });
    }

    // Strict tenant isolation: verify user belongs to active organization
    const userValid = await verifyUserInOrg(userId, orgId);
    if (!userValid) {
      return res.status(403).json({ error: 'User does not belong to this organization' });
    }

    // Upsert crm_staff_assignments with organization scoping
    let assignedRow;
    try {
      const result = await pool.query(
        `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
         VALUES ($1, $1, $2, $2, $3, $4)
         ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id
         RETURNING *`,
        [orgId, userId, roleId, req.user?.id || null]
      );
      assignedRow = result.rows[0];
    } catch (confErr) {
      const upd = await pool.query(
        `UPDATE crm_staff_assignments SET role_id = $1 WHERE (user_id = $2 OR staff_id = $2) AND (org_id = $3 OR organization_id = $3) RETURNING *`,
        [roleId, userId, orgId]
      );
      if (upd.rows.length > 0) {
        assignedRow = upd.rows[0];
      } else {
        const ins = await pool.query(
          `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
           VALUES ($1, $1, $2, $2, $3, $4) RETURNING *`,
          [orgId, userId, roleId, req.user?.id || null]
        );
        assignedRow = ins.rows[0];
      }
    }

    // Sync crm_staff_roles (prune prior roles for this org first to prevent role bleeding)
    await pool.query(
      `DELETE FROM crm_staff_roles 
       WHERE (staff_id = $1)
         AND role_id IN (SELECT id FROM crm_roles WHERE (org_id = $2 OR organization_id = $2) AND id != $3)`,
      [userId, orgId, roleId]
    ).catch(() => {});

    await pool.query(
      `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (staff_id, role_id) DO NOTHING`,
      [userId, roleId, req.user?.id || null]
    ).catch(() => {});

    return res.status(201).json(assignedRow || { user_id: userId, role_id: roleId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/staff', assignStaffRoleHandler);
router.post('/staff-roles', assignStaffRoleHandler);

// DELETE /api/crm/staff/:id & DELETE /api/crm/staff-roles/:id
const deleteStaffRoleHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;

    // Strict tenant isolation: only delete staff assignment for this organization
    await pool.query(
      `DELETE FROM crm_staff_assignments 
       WHERE (id = $1 OR user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2)`,
      [id, orgId]
    );

    // Only delete from crm_staff_roles where role belongs to this organization
    await pool.query(
      `DELETE FROM crm_staff_roles 
       WHERE (staff_id = $1 OR role_id = $1)
         AND role_id IN (SELECT id FROM crm_roles WHERE org_id = $2 OR organization_id = $2)`,
      [id, orgId]
    ).catch(() => {});

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.delete('/staff/:id', deleteStaffRoleHandler);
router.delete('/staff-roles/:id', deleteStaffRoleHandler);

// ==================== ATTENDANCE ====================

// GET /api/crm/attendance
router.get('/attendance', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { user_id, month, year, date } = req.query;

    let query = `
      SELECT a.*,
             COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
             u.email
      FROM attendance_records a
      JOIN users u ON u.id = a.user_id
      WHERE (a.org_id = $1 OR a.organization_id = $1)
    `;
    const params = [orgId];

    if (user_id) {
      params.push(user_id);
      query += ` AND a.user_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND a.date = $${params.length}`;
    }
    if (month && year) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM a.date) = $${params.length}`;
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM a.date) = $${params.length}`;
    }

    query += ' ORDER BY a.date DESC';

    let result;
    try {
      result = await pool.query(query, params);
    } catch (err) {
      if (err.code === '42P01') {
        // Fallback to crm_attendance
        const altQuery = `
          SELECT a.*,
                 COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
                 u.email
          FROM crm_attendance a
          JOIN users u ON u.id = a.user_id
          WHERE (a.org_id = $1 OR a.organization_id = $1)
          ${user_id ? 'AND a.user_id = $2' : ''}
          ORDER BY a.date DESC
        `;
        const altParams = [orgId];
        if (user_id) altParams.push(user_id);
        result = await pool.query(altQuery, altParams).catch(() => ({ rows: [] }));
      } else {
        throw err;
      }
    }

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/attendance
router.post('/attendance', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      user_id = req.user?.id,
      date = new Date().toISOString().split('T')[0],
      clock_in, clock_out, status = 'present', notes, latitude, longitude
    } = req.body;

    // Strict tenant isolation: verify user belongs to this organization
    if (user_id) {
      const belongs = await verifyUserInOrg(user_id, orgId);
      if (!belongs) {
        return res.status(403).json({ error: 'User does not belong to this organization' });
      }
    }

    let result;
    try {
      result = await pool.query(
        `INSERT INTO attendance_records (org_id, organization_id, user_id, date, clock_in, clock_out, status, notes, latitude, longitude)
         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, date)
         DO UPDATE SET clock_out = COALESCE(EXCLUDED.clock_out, attendance_records.clock_out),
                       status = COALESCE(EXCLUDED.status, attendance_records.status),
                       notes = COALESCE(EXCLUDED.notes, attendance_records.notes)
         RETURNING *`,
        [orgId, user_id, date, clock_in || new Date(), clock_out, status, notes, latitude, longitude]
      );
    } catch (attErr) {
      if (attErr.code === '42P01') {
        result = await pool.query(
          `INSERT INTO crm_attendance (org_id, organization_id, user_id, date, clock_in, clock_out, status, notes)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [orgId, user_id, date, clock_in || new Date(), clock_out, status, notes]
        );
      } else {
        throw attErr;
      }
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/attendance/:id
router.put('/attendance/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { clock_out, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE attendance_records
       SET clock_out = COALESCE($1, clock_out),
           status = COALESCE($2, status),
           notes = COALESCE($3, notes)
       WHERE id = $4 AND (org_id = $5 OR organization_id = $5)
       RETURNING *`,
      [clock_out, status, notes, id, orgId]
    ).catch(async () => {
      return pool.query(
        `UPDATE crm_attendance
         SET clock_out = COALESCE($1, clock_out),
             status = COALESCE($2, status),
             notes = COALESCE($3, notes)
         WHERE id = $4 AND (org_id = $5 OR organization_id = $5)
         RETURNING *`,
        [clock_out, status, notes, id, orgId]
      );
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SALARY & PAYROLL ====================

// GET /api/crm/salary-profiles & GET /api/crm/salary
const getSalaryProfilesHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { user_id } = req.query;

    let query = `
      SELECT sp.*,
             COALESCE(sp.org_id, sp.organization_id) AS org_id,
             COALESCE(sp.organization_id, sp.org_id) AS organization_id,
             COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
             u.email
      FROM salary_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE (sp.org_id = $1 OR sp.organization_id = $1)
    `;
    const params = [orgId];
    if (user_id) {
      params.push(user_id);
      query += ` AND sp.user_id = $${params.length}`;
    }

    let result;
    try {
      result = await pool.query(query, params);
    } catch (spErr) {
      if (spErr.code === '42P01') {
        // Fallback to crm_salary_profiles
        const altQuery = `
          SELECT sp.*,
                 COALESCE(sp.org_id, sp.organization_id) AS org_id,
                 COALESCE(sp.organization_id, sp.org_id) AS organization_id,
                 COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1)) AS full_name,
                 u.email
          FROM crm_salary_profiles sp
          LEFT JOIN users u ON u.id = COALESCE(sp.user_id, sp.staff_id)
          WHERE (sp.org_id = $1 OR sp.organization_id = $1)
          ${user_id ? 'AND (sp.user_id = $2 OR sp.staff_id = $2)' : ''}
        `;
        result = await pool.query(altQuery, params).catch(() => ({ rows: [] }));
      } else {
        throw spErr;
      }
    }

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/salary-profiles', getSalaryProfilesHandler);
router.get('/salary', getSalaryProfilesHandler);

// POST /api/crm/salary-profiles & POST /api/crm/salary
const upsertSalaryProfileHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      user_id = req.body.staff_id,
      base_salary = req.body.base_amount || 0,
      salary_type = 'monthly',
      allowances = 0,
      deductions = 0,
      effective_from = new Date(),
      hra = 0,
      da = 0,
      special_allowance = 0,
      provident_fund = 0,
      professional_tax = 0,
      tds = 0,
    } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    // Strict tenant isolation: verify user belongs to active organization
    const belongs = await verifyUserInOrg(user_id, orgId);
    if (!belongs) {
      return res.status(403).json({ error: 'User does not belong to this organization' });
    }

    let result;
    try {
      result = await pool.query(
        `INSERT INTO salary_profiles (org_id, organization_id, user_id, base_salary, salary_type, allowances, deductions, effective_from, hra, da, special_allowance, provident_fund, professional_tax, tds)
         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (user_id, org_id)
         DO UPDATE SET base_salary = EXCLUDED.base_salary,
                       salary_type = EXCLUDED.salary_type,
                       allowances = EXCLUDED.allowances,
                       deductions = EXCLUDED.deductions,
                       effective_from = EXCLUDED.effective_from,
                       hra = EXCLUDED.hra,
                       da = EXCLUDED.da,
                       special_allowance = EXCLUDED.special_allowance,
                       provident_fund = EXCLUDED.provident_fund,
                       professional_tax = EXCLUDED.professional_tax,
                       tds = EXCLUDED.tds,
                       updated_at = NOW()
         RETURNING *`,
        [orgId, user_id, base_salary, salary_type, allowances, deductions, effective_from, hra, da, special_allowance, provident_fund, professional_tax, tds]
      );
    } catch (spErr) {
      // Fallback with simpler column subset or crm_salary_profiles
      result = await pool.query(
        `INSERT INTO salary_profiles (org_id, user_id, base_salary, allowances, deductions, effective_from)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, org_id)
         DO UPDATE SET base_salary = EXCLUDED.base_salary,
                       allowances = EXCLUDED.allowances,
                       deductions = EXCLUDED.deductions,
                       effective_from = EXCLUDED.effective_from
         RETURNING *`,
        [orgId, user_id, base_salary, allowances, deductions, effective_from]
      ).catch(async () => {
        return pool.query(
          `INSERT INTO crm_salary_profiles (org_id, organization_id, staff_id, base_amount, salary_type)
           VALUES ($1, $1, $2, $3, $4)
           RETURNING *`,
          [orgId, user_id, base_salary, salary_type]
        ).catch(() => ({ rows: [{ user_id, org_id: orgId, base_salary }] }));
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/salary-profiles', upsertSalaryProfileHandler);
router.post('/salary', upsertSalaryProfileHandler);

// GET /api/crm/payroll-runs & GET /api/crm/payroll
const getPayrollRunsHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { month, year } = req.query;

    let query = `
      SELECT pr.*,
             COALESCE(pr.org_id, pr.organization_id) AS org_id,
             COALESCE(pr.organization_id, pr.org_id) AS organization_id
      FROM payroll_records pr
      WHERE (pr.org_id = $1 OR pr.organization_id = $1)
    `;
    const params = [orgId];
    if (month) {
      params.push(month);
      query += ` AND pr.month = $${params.length}`;
    }
    if (year) {
      params.push(year);
      query += ` AND pr.year = $${params.length}`;
    }
    query += ' ORDER BY pr.year DESC, pr.month DESC';

    let result;
    try {
      result = await pool.query(query, params);
    } catch (prErr) {
      if (prErr.code === '42P01') {
        result = await pool.query(
          `SELECT * FROM crm_payroll_runs WHERE org_id = $1 OR organization_id = $1 ORDER BY month_year DESC`,
          [orgId]
        ).catch(() => ({ rows: [] }));
      } else {
        throw prErr;
      }
    }

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/payroll-runs', getPayrollRunsHandler);
router.get('/payroll', getPayrollRunsHandler);

// POST /api/crm/payroll-runs & POST /api/crm/payroll
const upsertPayrollRunHandler = async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      user_id,
      month,
      year,
      month_year,
      base_salary = 0,
      allowances = 0,
      deductions = 0,
      advance = 0,
      net_salary,
      total_payout = 0,
      staff_count = 0,
      status = 'draft'
    } = req.body;

    const targetUser = user_id || req.user?.id;
    if (targetUser) {
      const belongs = await verifyUserInOrg(targetUser, orgId);
      if (!belongs) {
        return res.status(403).json({ error: 'User does not belong to this organization' });
      }
    }

    const calculatedNet = net_salary !== undefined ? net_salary : (Number(base_salary) + Number(allowances) - Number(deductions) - Number(advance));

    let result;
    try {
      result = await pool.query(
        `INSERT INTO payroll_records (org_id, organization_id, user_id, month, year, base_salary, allowances, deductions, advance, net_salary, status)
         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, month, year)
         DO UPDATE SET base_salary = EXCLUDED.base_salary,
                       allowances = EXCLUDED.allowances,
                       deductions = EXCLUDED.deductions,
                       advance = EXCLUDED.advance,
                       net_salary = EXCLUDED.net_salary,
                       status = EXCLUDED.status
         WHERE payroll_records.org_id = $1 OR payroll_records.organization_id = $1
         RETURNING *`,
        [orgId, targetUser, month || 1, year || 2026, base_salary, allowances, deductions, advance, calculatedNet, status]
      );
    } catch (prErr) {
      result = await pool.query(
        `INSERT INTO crm_payroll_runs (org_id, organization_id, month_year, total_payout, staff_count, status)
         VALUES ($1, $1, $2, $3, $4, $5)
         RETURNING *`,
        [orgId, month_year || `${year}-${String(month).padStart(2, '0')}`, total_payout, staff_count, status]
      ).catch(() => ({ rows: [req.body] }));
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/payroll-runs', upsertPayrollRunHandler);
router.post('/payroll', upsertPayrollRunHandler);

// PUT /api/crm/payroll-runs/:id
router.put('/payroll-runs/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { status, total_payout, notes } = req.body;

    const result = await pool.query(
      `UPDATE crm_payroll_runs
       SET status = COALESCE($1, status),
           total_payout = COALESCE($2, total_payout),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE (id = $4 OR month_year = $4) AND (org_id = $5 OR organization_id = $5)
       RETURNING *`,
      [status, total_payout, notes, id, orgId]
    ).catch(async () => {
      return pool.query(
        `UPDATE payroll_records
         SET status = COALESCE($1, status),
             updated_at = NOW()
         WHERE id = $2 AND (org_id = $3 OR organization_id = $3)
         RETURNING *`,
        [status, id, orgId]
      );
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll run not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/payslips
router.get('/payslips', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { month_year, staff_id, user_id } = req.query;
    const targetStaff = staff_id || user_id;

    let query = `
      SELECT ps.*,
             COALESCE(ps.org_id, ps.organization_id) AS org_id,
             COALESCE(ps.organization_id, ps.org_id) AS organization_id
      FROM crm_payslips ps
      WHERE (ps.org_id = $1 OR ps.organization_id = $1)
    `;
    const params = [orgId];
    if (month_year) {
      params.push(month_year);
      query += ` AND ps.month_year = $${params.length}`;
    }
    if (targetStaff) {
      params.push(targetStaff);
      query += ` AND (ps.staff_id = $${params.length} OR ps.user_id = $${params.length})`;
    }
    query += ' ORDER BY ps.created_at DESC';

    const result = await pool.query(query, params).catch(() => ({ rows: [] }));
    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/payslips/bulk
router.post('/payslips/bulk', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    let count = 0;
    for (const item of items) {
      const targetStaff = item.staff_id || item.user_id;
      if (targetStaff) {
        const belongs = await verifyUserInOrg(targetStaff, orgId);
        if (!belongs) {
          continue; // Disallow creating/mutating payslip for foreign tenant user
        }
      }

      await pool.query(
        `INSERT INTO crm_payslips (id, org_id, organization_id, payroll_run_id, staff_id, month_year, gross_salary, net_salary, payment_status)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET net_salary = EXCLUDED.net_salary, payment_status = EXCLUDED.payment_status
         WHERE crm_payslips.org_id = $2 OR crm_payslips.organization_id = $2`,
        [item.id || `slip-${Date.now()}-${count}`, orgId, item.payroll_run_id, targetStaff, item.month_year, item.gross_salary || 0, item.net_salary || 0, item.payment_status || 'pending']
      ).catch(() => {});
      count++;
    }

    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/payslips
router.put('/payslips', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { month_year, monthYear, payment_status } = req.body;
    const targetMonth = month_year || monthYear;

    const result = await pool.query(
      `UPDATE crm_payslips
       SET payment_status = COALESCE($1, payment_status),
           paid_at = NOW(),
           updated_at = NOW()
       WHERE (month_year = $2) AND (org_id = $3 OR organization_id = $3)
       RETURNING *`,
      [payment_status, targetMonth, orgId]
    ).catch(() => ({ rows: [] }));

    return res.json({ success: true, count: result.rows.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/salary-adjustments
router.get('/salary-adjustments', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { staff_id, user_id, month_year } = req.query;
    const targetStaff = staff_id || user_id;

    let query = `
      SELECT sa.*,
             COALESCE(sa.org_id, sa.organization_id) AS org_id,
             COALESCE(sa.organization_id, sa.org_id) AS organization_id
      FROM crm_salary_adjustments sa
      WHERE (sa.org_id = $1 OR sa.organization_id = $1)
    `;
    const params = [orgId];
    if (targetStaff) {
      params.push(targetStaff);
      query += ` AND (sa.staff_id = $${params.length} OR sa.user_id = $${params.length})`;
    }
    if (month_year) {
      params.push(month_year);
      query += ` AND sa.month_year = $${params.length}`;
    }
    query += ' ORDER BY sa.created_at DESC';

    const result = await pool.query(query, params).catch(() => ({ rows: [] }));
    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/salary-adjustments
router.post('/salary-adjustments', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { staff_id, user_id, type = 'advance', amount = 0, description = '', month_year, status = 'pending' } = req.body;
    const targetStaff = staff_id || user_id;

    if (targetStaff) {
      const belongs = await verifyUserInOrg(targetStaff, orgId);
      if (!belongs) {
        return res.status(403).json({ error: 'User does not belong to this organization' });
      }
    }

    const result = await pool.query(
      `INSERT INTO crm_salary_adjustments (org_id, organization_id, staff_id, user_id, type, amount, description, month_year, status, requested_by)
       VALUES ($1, $1, $2, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, targetStaff, type, amount, description, month_year, status, req.user?.id || null]
    ).catch(() => ({ rows: [req.body] }));

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/salary-adjustments/:id
router.put('/salary-adjustments/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { status, approved_by } = req.body;

    const result = await pool.query(
      `UPDATE crm_salary_adjustments
       SET status = COALESCE($1, status),
           approved_by = COALESCE($2, approved_by),
           approved_at = NOW()
       WHERE id = $3 AND (org_id = $4 OR organization_id = $4)
       RETURNING *`,
      [status, approved_by || req.user?.id, id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Adjustment not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/salary-adjustments/:id
router.delete('/salary-adjustments/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM crm_salary_adjustments WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Adjustment not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== TICKETS & TASKS ====================

// GET /api/crm/tickets
router.get('/tickets', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const result = await pool.query(
      'SELECT * FROM customer_tickets WHERE org_id = $1 OR organization_id = $1 ORDER BY created_at DESC',
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/tickets
router.post('/tickets', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { customer_id, subject, description, priority = 'medium', assigned_to } = req.body;
    if (assigned_to) {
      const belongs = await verifyUserInOrg(assigned_to, orgId);
      if (!belongs) {
        return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
      }
    }

    const result = await pool.query(
      `INSERT INTO customer_tickets (org_id, organization_id, customer_id, subject, description, priority, assigned_to)
       VALUES ($1, $1, $2, $3, $4, $5, $6) RETURNING *`,
      [orgId, customer_id, subject, description, priority, assigned_to]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/tasks
router.get('/tasks', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { status, priority, assigned_to, search } = req.query;

    // Strict multi-tenant query: tasks must belong to active org.
    // Assignee name & email are strictly matched against members of this org;
    // foreign tenant user profiles will never be displayed.
    let query = `
      SELECT
        t.id,
        COALESCE(t.org_id, t.organization_id) AS org_id,
        t.title,
        COALESCE(t.description, '') AS description,
        COALESCE(
          CASE WHEN t.priority = 'medium' THEN 'normal' ELSE t.priority END,
          'normal'
        ) AS priority,
        COALESCE(
          CASE WHEN t.status = 'pending' THEN 'todo' ELSE t.status END,
          'todo'
        ) AS status,
        t.assigned_to,
        t.assigned_to AS assignee_id,
        CASE 
          WHEN m_u.user_id IS NOT NULL THEN COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1), 'Unassigned')
          ELSE 'Unassigned'
        END AS assignee_name,
        CASE WHEN m_u.user_id IS NOT NULL THEN u.email ELSE NULL END AS assignee_email,
        CASE WHEN m_u.user_id IS NOT NULL THEN u.avatar_url ELSE NULL END AS assignee_avatar_url,
        COALESCE(t.assigned_by, t.created_by) AS assigned_by,
        COALESCE(NULLIF(TRIM(c.full_name), ''), NULLIF(TRIM(c.name), ''), split_part(c.email, '@', 1), 'System') AS creator_name,
        t.due_date,
        COALESCE(t.requires_proof, t.proof_required, false) AS requires_proof,
        COALESCE(t.requires_proof, t.proof_required, false) AS proof_required,
        t.proof_notes,
        t.completed_at,
        t.approved_by,
        COALESCE(NULLIF(TRIM(appr.full_name), ''), NULLIF(TRIM(appr.name), ''), split_part(appr.email, '@', 1)) AS approver_name,
        t.approved_at,
        t.review_feedback,
        t.created_at,
        t.updated_at
      FROM staff_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN (
        SELECT user_id FROM org_memberships WHERE org_id = $1 OR organization_id = $1
        UNION
        SELECT user_id FROM organization_memberships WHERE organization_id = $1 OR org_id = $1
        UNION
        SELECT COALESCE(user_id, staff_id) AS user_id FROM crm_staff_assignments WHERE org_id = $1 OR organization_id = $1
      ) m_u ON m_u.user_id = u.id
      LEFT JOIN users c ON c.id = COALESCE(t.assigned_by, t.created_by)
      LEFT JOIN users appr ON appr.id = t.approved_by
      WHERE (t.org_id = $1 OR t.organization_id = $1)
    `;
    const params = [orgId];

    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim().toLowerCase());
      params.push(statuses);
      query += ` AND (
        CASE WHEN t.status = 'pending' THEN 'todo' ELSE t.status END = ANY($${params.length})
      )`;
    }

    if (priority && priority !== 'all') {
      const rawPriorities = priority.split(',').map(p => p.trim().toLowerCase());
      const expanded = [];
      for (const p of rawPriorities) {
        if (p === 'normal') {
          expanded.push('normal', 'medium');
        } else {
          expanded.push(p);
        }
      }
      params.push(expanded);
      query += ` AND t.priority = ANY($${params.length})`;
    }

    if (assigned_to && assigned_to !== 'all') {
      params.push(assigned_to);
      query += ` AND t.assigned_to = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        t.title ILIKE $${params.length} OR 
        t.description ILIKE $${params.length} OR 
        u.full_name ILIKE $${params.length} OR
        u.name ILIKE $${params.length} OR
        u.email ILIKE $${params.length}
      )`;
    }

    query += `
      ORDER BY
        CASE 
          WHEN t.priority = 'urgent' THEN 1
          WHEN t.priority = 'high' THEN 2
          WHEN t.priority = 'normal' OR t.priority = 'medium' THEN 3
          ELSE 4 
        END ASC,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `;

    let result;
    try {
      result = await pool.query(query, params);
    } catch (qErr) {
      try {
        const fallbackTasksQuery = `
          SELECT
            t.id,
            COALESCE(t.org_id, t.organization_id) AS org_id,
            t.title,
            COALESCE(t.description, '') AS description,
            COALESCE(CASE WHEN t.priority = 'medium' THEN 'normal' ELSE t.priority END, 'normal') AS priority,
            COALESCE(CASE WHEN t.status = 'pending' THEN 'todo' ELSE t.status END, 'todo') AS status,
            t.assigned_to,
            t.assigned_to AS assignee_id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(u.name), ''), split_part(u.email, '@', 1), 'Unassigned') AS assignee_name,
            u.email AS assignee_email,
            u.avatar_url AS assignee_avatar_url,
            COALESCE(t.assigned_by, t.created_by) AS assigned_by,
            'System' AS creator_name,
            t.due_date,
            COALESCE(t.requires_proof, t.proof_required, false) AS requires_proof,
            COALESCE(t.requires_proof, t.proof_required, false) AS proof_required,
            t.proof_notes,
            t.completed_at,
            t.approved_by,
            NULL AS approver_name,
            t.approved_at,
            t.review_feedback,
            t.created_at,
            t.updated_at
          FROM staff_tasks t
          LEFT JOIN users u ON u.id = t.assigned_to
          WHERE (t.org_id = $1 OR t.organization_id = $1)
          ORDER BY t.created_at DESC
        `;
        result = await pool.query(fallbackTasksQuery, [orgId]);
      } catch {
        result = { rows: [] };
      }
    }
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching CRM tasks:', err);
    return res.json([]);
  }
});

// POST /api/crm/tasks
router.post('/tasks', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      title,
      description = '',
      priority = 'normal',
      status = 'todo',
      assigned_to,
      assignee_id,
      due_date,
      requires_proof,
      proof_required,
      proof_notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const rawAssignee = assigned_to || assignee_id;
    let targetAssignee = null;
    if (rawAssignee && typeof rawAssignee === 'string' && rawAssignee.trim() && !['unassigned', 'none', 'null', 'undefined'].includes(rawAssignee.trim().toLowerCase())) {
      const cleanAssignee = rawAssignee.trim();
      // Strict tenant isolation: verify that the assigned user belongs to this organization
      const belongs = await verifyUserInOrg(cleanAssignee, orgId);
      if (!belongs) {
        return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
      }
      targetAssignee = cleanAssignee;
    }

    const targetProof = requires_proof !== undefined ? Boolean(requires_proof) : Boolean(proof_required);
    const normalizedPriority = ['urgent', 'high', 'normal', 'low'].includes(priority) ? priority : 'normal';
    const normalizedStatus = ['todo', 'in_progress', 'review', 'done'].includes(status) ? status : 'todo';

    const result = await pool.query(
      `INSERT INTO staff_tasks (
         org_id, organization_id, title, description, priority, status,
         assigned_to, assigned_by, created_by, due_date,
         requires_proof, proof_required, proof_notes
       )
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9, $10)
       RETURNING *`,
      [
        orgId,
        title.trim(),
        description.trim(),
        normalizedPriority,
        normalizedStatus,
        targetAssignee,
        req.user?.id || null,
        due_date || null,
        targetProof,
        proof_notes || null,
      ]
    );

    const inserted = result.rows[0];

    // Fetch user details for enriched response
    let assigneeName = req.body.assignee_name || 'Unassigned';
    let assigneeEmail = null;
    let assigneeAvatarUrl = null;
    if (targetAssignee) {
      const uRes = await pool.query('SELECT full_name, name, email, avatar_url FROM users WHERE id = $1', [targetAssignee]);
      if (uRes.rows.length > 0) {
        assigneeName =
          (uRes.rows[0].full_name && uRes.rows[0].full_name.trim()) ||
          (uRes.rows[0].name && uRes.rows[0].name.trim()) ||
          uRes.rows[0].email ||
          assigneeName;
        assigneeEmail = uRes.rows[0].email;
        assigneeAvatarUrl = uRes.rows[0].avatar_url;
      }
    }

    let creatorName = 'System';
    if (req.user?.id) {
      const cRes = await pool.query('SELECT full_name, name, email FROM users WHERE id = $1', [req.user.id]);
      if (cRes.rows.length > 0) {
        creatorName =
          (cRes.rows[0].full_name && cRes.rows[0].full_name.trim()) ||
          (cRes.rows[0].name && cRes.rows[0].name.trim()) ||
          cRes.rows[0].email;
      }
    }

    return res.status(201).json({
      ...inserted,
      assignee_id: inserted.assigned_to,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
      assignee_avatar_url: assigneeAvatarUrl,
      creator_name: creatorName,
      requires_proof: targetProof,
      proof_required: targetProof,
      priority: normalizedPriority,
      status: normalizedStatus,
    });
  } catch (err) {
    console.error('Error creating CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/crm/tasks/:id
router.patch('/tasks/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;

    // Strict tenant isolation: verify task exists in caller's organization
    let existingRes = await pool.query(
      `SELECT * FROM staff_tasks WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
      [id, orgId]
    ).catch(async () => {
      return pool.query(
        `SELECT * FROM staff_tasks WHERE id = $1 AND org_id = $2`,
        [id, orgId]
      ).catch(() => ({ rows: [] }));
    });
    if (!existingRes || !existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }
    const current = existingRes.rows[0];

    const updates = { ...req.body };
    delete updates.id;
    delete updates.org_id;
    delete updates.organization_id;
    delete updates.created_at;

    // Handle assignee alias
    if (updates.assignee_id !== undefined && updates.assigned_to === undefined) {
      updates.assigned_to = updates.assignee_id;
    }
    delete updates.assignee_id;

    if (updates.assigned_to !== undefined) {
      const rawAssignee = updates.assigned_to;
      if (!rawAssignee || (typeof rawAssignee === 'string' && ['unassigned', 'none', 'null', 'undefined'].includes(rawAssignee.trim().toLowerCase()))) {
        updates.assigned_to = null;
      } else {
        const cleanAssignee = String(rawAssignee).trim();
        // Strict tenant isolation: verify that the new assignee belongs to this organization
        const belongs = await verifyUserInOrg(cleanAssignee, orgId);
        if (!belongs) {
          return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
        }
        updates.assigned_to = cleanAssignee;
      }
    }

    // Handle proof boolean alias
    if (updates.requires_proof !== undefined) {
      updates.proof_required = updates.requires_proof;
    } else if (updates.proof_required !== undefined) {
      updates.requires_proof = updates.proof_required;
    }

    // State transition lifecycle automation
    if (updates.status) {
      const normalizedStatus = ['todo', 'in_progress', 'review', 'done'].includes(updates.status)
        ? updates.status
        : current.status;
      updates.status = normalizedStatus;

      if (normalizedStatus === 'done') {
        updates.completed_at = updates.completed_at || new Date().toISOString();
        updates.approved_by = req.user?.id || null;
        updates.approved_at = new Date().toISOString();
      } else if (normalizedStatus === 'review') {
        if (!updates.proof_notes && !current.proof_notes) {
          updates.proof_notes = 'Work submitted for manager review.';
        }
      } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'todo') {
        if (current.status === 'done') {
          updates.completed_at = null;
          updates.approved_by = null;
          updates.approved_at = null;
        }
      }
    }

    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.json(current);
    }

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE staff_tasks
       SET ${setClauses}
       WHERE id = $1 AND (org_id = $2 OR organization_id = $2)
       RETURNING *`,
      [id, orgId, ...values]
    );

    const updatedTask = result.rows[0];

    // Fetch assignee name & approver details
    let assigneeName = 'Unassigned';
    let assigneeEmail = null;
    let assigneeAvatarUrl = null;
    if (updatedTask.assigned_to) {
      assigneeName = req.body.assignee_name || 'Unassigned';
      const uRes = await pool.query('SELECT full_name, name, email, avatar_url FROM users WHERE id = $1', [updatedTask.assigned_to]);
      if (uRes.rows.length > 0) {
        assigneeName =
          (uRes.rows[0].full_name && uRes.rows[0].full_name.trim()) ||
          (uRes.rows[0].name && uRes.rows[0].name.trim()) ||
          uRes.rows[0].email ||
          assigneeName;
        assigneeEmail = uRes.rows[0].email;
        assigneeAvatarUrl = uRes.rows[0].avatar_url;
      }
    }

    let approverName = null;
    if (updatedTask.approved_by) {
      const aRes = await pool.query('SELECT full_name, name, email FROM users WHERE id = $1', [updatedTask.approved_by]);
      if (aRes.rows.length > 0) {
        approverName =
          (aRes.rows[0].full_name && aRes.rows[0].full_name.trim()) ||
          (aRes.rows[0].name && aRes.rows[0].name.trim()) ||
          aRes.rows[0].email;
      }
    }

    let creatorName = 'System';
    if (updatedTask.assigned_by || updatedTask.created_by) {
      const cRes = await pool.query('SELECT full_name, name, email FROM users WHERE id = $1', [updatedTask.assigned_by || updatedTask.created_by]);
      if (cRes.rows.length > 0) {
        creatorName =
          (cRes.rows[0].full_name && cRes.rows[0].full_name.trim()) ||
          (cRes.rows[0].name && cRes.rows[0].name.trim()) ||
          cRes.rows[0].email;
      }
    }

    return res.json({
      ...updatedTask,
      assignee_id: updatedTask.assigned_to,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
      assignee_avatar_url: assigneeAvatarUrl,
      approver_name: approverName,
      creator_name: creatorName,
      requires_proof: Boolean(updatedTask.requires_proof || updatedTask.proof_required),
    });
  } catch (err) {
    console.error('Error updating CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;

    let result = await pool.query(
      `DELETE FROM staff_tasks 
       WHERE id = $1 AND (org_id = $2 OR organization_id = $2) 
       RETURNING id`,
      [id, orgId]
    ).catch(async () => {
      return pool.query(
        `DELETE FROM staff_tasks WHERE id = $1 AND org_id = $2 RETURNING id`,
        [id, orgId]
      ).catch(() => ({ rows: [] }));
    });

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== BROADCASTS ====================

// GET /api/crm/broadcasts
router.get('/broadcasts', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const result = await pool.query(
      `SELECT b.*,
              COALESCE(b.org_id, b.organization_id) AS org_id,
              COALESCE(b.organization_id, b.org_id) AS organization_id
       FROM crm_broadcasts b
       WHERE (b.org_id = $1 OR b.organization_id = $1)
       ORDER BY b.created_at DESC`,
      [orgId]
    ).catch(() => ({ rows: [] }));

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/broadcasts
router.post('/broadcasts', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { title, content, message, urgency = 'general', priority = 'normal', is_pinned = false } = req.body;
    const bodyContent = content || message || '';

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Broadcast title is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_broadcasts (org_id, organization_id, title, message, priority, is_active, created_by)
       VALUES ($1, $1, $2, $3, $4, true, $5)
       RETURNING *`,
      [orgId, title.trim(), bodyContent.trim(), urgency || priority, req.user?.id || null]
    ).catch(() => ({ rows: [{ title, message: bodyContent, org_id: orgId }] }));

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/broadcasts/:id
router.delete('/broadcasts/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    let result = await pool.query(
      `DELETE FROM crm_broadcasts WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id`,
      [id, orgId]
    ).catch(async () => {
      return pool.query(
        `DELETE FROM crm_broadcasts WHERE id = $1 AND org_id = $2 RETURNING id`,
        [id, orgId]
      ).catch(() => ({ rows: [] }));
    });

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Broadcast not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== MEETINGS ====================

// GET /api/crm/meetings
router.get('/meetings', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const result = await pool.query(
      `SELECT m.*,
              COALESCE(m.org_id, m.organization_id) AS org_id,
              COALESCE(m.organization_id, m.org_id) AS organization_id
       FROM crm_meetings m
       WHERE (m.org_id = $1 OR m.organization_id = $1)
       ORDER BY m.created_at DESC`,
      [orgId]
    ).catch(() => ({ rows: [] }));

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/meetings
router.post('/meetings', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      title,
      agenda = '',
      scheduled_date = new Date().toISOString().split('T')[0],
      scheduled_time = '10:00 AM',
      duration_minutes = 30,
      host_name = 'Host',
      room_code = 'room-01',
      status = 'upcoming',
      department = 'General'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_meetings (org_id, organization_id, title, agenda, scheduled_date, scheduled_time, duration_minutes, host_name, room_code, status, department, created_by)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [orgId, title.trim(), agenda.trim(), scheduled_date, scheduled_time, duration_minutes, host_name, room_code, status, department, req.user?.id || null]
    ).catch(() => ({ rows: [{ title, org_id: orgId }] }));

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/meetings/:id
router.delete('/meetings/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    let result = await pool.query(
      `DELETE FROM crm_meetings WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id`,
      [id, orgId]
    ).catch(async () => {
      return pool.query(
        `DELETE FROM crm_meetings WHERE id = $1 AND org_id = $2 RETURNING id`,
        [id, orgId]
      ).catch(() => ({ rows: [] }));
    });

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD COUNTS ====================

// GET /api/crm/dashboard-counts
router.get('/dashboard-counts', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json({ tasks: 0, broadcasts: 0, meetings: 0 });

    const tasksRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM staff_tasks 
       WHERE (org_id = $1 OR organization_id = $1) AND status != 'done'`,
      [orgId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const broadcastsRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM crm_broadcasts 
       WHERE (org_id = $1 OR organization_id = $1) AND is_active = true`,
      [orgId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const meetingsRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM crm_meetings 
       WHERE (org_id = $1 OR organization_id = $1)`,
      [orgId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    return res.json({
      tasks: tasksRes.rows[0]?.count || 0,
      broadcasts: broadcastsRes.rows[0]?.count || 0,
      meetings: meetingsRes.rows[0]?.count || 0,
    });
  } catch (err) {
    return res.json({ tasks: 0, broadcasts: 0, meetings: 0 });
  }
});

// ==================== GEOLOCATIONS ====================

// GET /api/crm/geolocations
router.get('/geolocations', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const result = await pool.query(
      `SELECT g.*,
              COALESCE(g.org_id, g.organization_id) AS org_id,
              COALESCE(g.organization_id, g.org_id) AS organization_id
       FROM crm_geolocations g
       WHERE (g.org_id = $1 OR g.organization_id = $1)
       ORDER BY g.created_at ASC`,
      [orgId]
    ).catch(() => ({ rows: [] }));

    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/geolocations
router.post('/geolocations', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id, name, latitude, longitude, radius_meters = 150, is_active = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const result = await pool.query(
      `INSERT INTO crm_geolocations (id, org_id, organization_id, name, latitude, longitude, radius_meters, is_active)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id || `geo-${Date.now()}`, orgId, name.trim(), latitude, longitude, radius_meters, Boolean(is_active)]
    ).catch(() => ({ rows: [{ id, name, org_id: orgId, latitude, longitude, radius_meters, is_active }] }));

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/geolocations/:id
router.put('/geolocations/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { name, latitude, longitude, radius_meters, is_active } = req.body;

    const result = await pool.query(
      `UPDATE crm_geolocations
       SET name = COALESCE($1, name),
           latitude = COALESCE($2, latitude),
           longitude = COALESCE($3, longitude),
           radius_meters = COALESCE($4, radius_meters),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6 AND (org_id = $7 OR organization_id = $7)
       RETURNING *`,
      [name, latitude, longitude, radius_meters, is_active, id, orgId]
    ).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geolocation not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/geolocations/:id
router.delete('/geolocations/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    let result = await pool.query(
      `DELETE FROM crm_geolocations
       WHERE id = $1 AND (org_id = $2 OR organization_id = $2)
       RETURNING id`,
      [id, orgId]
    ).catch(async () => {
      return pool.query(
        `DELETE FROM crm_geolocations WHERE id = $1 AND org_id = $2 RETURNING id`,
        [id, orgId]
      ).catch(() => ({ rows: [] }));
    });

    if (!result || !result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Geolocation not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== ATTENDANCE REQUESTS ====================

// GET /api/crm/attendance-requests
router.get('/attendance-requests', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.json([]);

    const { user_id, status } = req.query;
    let query = `
      SELECT r.*,
             COALESCE(r.org_id, r.organization_id) AS org_id,
             COALESCE(r.organization_id, r.org_id) AS organization_id
      FROM crm_attendance_requests r
      WHERE (r.org_id = $1 OR r.organization_id = $1)
    `;
    const params = [orgId];
    if (user_id) {
      params.push(user_id);
      query += ` AND (r.user_id = $${params.length} OR r.staff_id = $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params).catch(() => ({ rows: [] }));
    return res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/attendance-requests
router.post('/attendance-requests', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id, staff_id, user_id, attendance_id, date, requested_clock_in, requested_clock_out, requested_status = 'present', reason, status = 'pending' } = req.body;
    const targetStaff = staff_id || user_id || req.user?.id;

    if (targetStaff) {
      const belongs = await verifyUserInOrg(targetStaff, orgId);
      if (!belongs) {
        return res.status(403).json({ error: 'User does not belong to this organization' });
      }
    }

    const result = await pool.query(
      `INSERT INTO crm_attendance_requests (id, org_id, organization_id, staff_id, user_id, attendance_id, date, requested_clock_in, requested_clock_out, requested_status, reason, status)
       VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id || `req-${Date.now()}`, orgId, targetStaff, attendance_id, date, requested_clock_in, requested_clock_out, requested_status, reason, status]
    ).catch(() => ({ rows: [{ id, org_id: orgId, staff_id: targetStaff, status }] }));

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/crm/attendance-requests/:id
router.put('/attendance-requests/:id', async (req, res) => {
  try {
    const orgId = resolveOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { id } = req.params;
    const { status, reviewer_id, reviewer_notes, reviewed_at } = req.body;

    const result = await pool.query(
      `UPDATE crm_attendance_requests
       SET status = COALESCE($1, status),
           reviewer_id = COALESCE($2, reviewer_id),
           reviewer_notes = COALESCE($3, reviewer_notes),
           reviewed_at = COALESCE($4, reviewed_at, NOW()),
           updated_at = NOW()
       WHERE id = $5 AND (org_id = $6 OR organization_id = $6)
       RETURNING *`,
      [status, reviewer_id || req.user?.id, reviewer_notes, reviewed_at, id, orgId]
    ).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance request not found or unauthorized' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;


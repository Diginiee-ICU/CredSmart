const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== ROLES & PERMISSIONS ====================

// GET /api/crm/roles
router.get('/roles', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      `SELECT r.*,
              COALESCE(json_agg(p.permission) FILTER (WHERE p.permission IS NOT NULL), '[]') as permissions
       FROM crm_roles r
       LEFT JOIN crm_role_permissions p ON p.role_id = r.id
       WHERE r.org_id = $1
       GROUP BY r.id
       ORDER BY r.created_at ASC`,
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/roles
router.post('/roles', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id;
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    await client.query('BEGIN');
    const roleRes = await client.query(
      `INSERT INTO crm_roles (org_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [orgId, name, description]
    );
    const role = roleRes.rows[0];

    for (const perm of permissions) {
      await client.query(
        `INSERT INTO crm_role_permissions (role_id, permission) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [role.id, perm]
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({ ...role, permissions });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/crm/roles/:id
router.delete('/roles/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    await pool.query('DELETE FROM crm_roles WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
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
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
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
    if (!password || password.length < 6) {
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

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;

      // Check if already a member of this organization
      const existingMemberRes = await client.query(
        `SELECT id FROM org_memberships 
         WHERE user_id = $1 AND (org_id = $2 OR organization_id = $2)`,
        [userId, orgId]
      );

      if (existingMemberRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'A staff member with this email already belongs to this organization',
        });
      }

      // If user exists in users table, update phone/name if missing
      if (phone && !existingUserRes.rows[0].phone) {
        await client.query(`UPDATE users SET phone = $1 WHERE id = $2`, [phone.trim(), userId]);
      }
    } else {
      // 2. Hash password with bcrypt (10 rounds) and insert into users
      isNewUser = true;
      const passwordHash = await bcrypt.hash(password, 10);
      const insertUserRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone, created_at`,
        [normalizedEmail, passwordHash, full_name.trim(), phone.trim()]
      );
      userId = insertUserRes.rows[0].id;
    }

    // 3. Insert into org_memberships
    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role, invited_by)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, role`,
      [userId, orgId, finalStoreRole, req.user?.id || null]
    );

    // Also insert into organization_memberships for compatibility
    await client.query(
      `INSERT INTO organization_memberships (user_id, org_id, organization_id, role, invited_by)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [userId, orgId, finalStoreRole, req.user?.id || null]
    );

    // 4. Assign CRM Role if provided
    let assignedRole = null;
    if (crm_role_id) {
      const roleCheck = await client.query(
        `SELECT id, name, color, icon FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
        [crm_role_id, orgId]
      );

      if (roleCheck.rows.length > 0) {
        assignedRole = roleCheck.rows[0];

        // Sync to crm_staff_assignments
        await client.query(
          `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
           VALUES ($1, $1, $2, $2, $3, $4)
           ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
          [orgId, userId, crm_role_id, req.user?.id || null]
        );

        // Sync to crm_staff_roles
        await client.query(
          `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (staff_id, role_id) DO NOTHING`,
          [userId, crm_role_id, req.user?.id || null]
        );
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
        password, // Plaintext returned once for immediate UI display in copyable dialog
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Staff provisioning error:', err);
    return res.status(500).json({ error: err.message || 'Staff provisioning failed' });
  } finally {
    client.release();
  }
});

// GET /api/crm/staff & GET /api/crm/staff-roles
const getStaffHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    let query = `
      SELECT DISTINCT ON (u.id)
        u.id,
        u.id AS user_id,
        u.id AS staff_id,
        u.email,
        u.full_name,
        u.phone,
        u.avatar_url,
        COALESCE(m.role, 'staff') AS store_role,
        COALESCE(m.role, 'staff') AS role,
        m.id AS membership_id,
        COALESCE(sa.role_id, sr.role_id) AS crm_role_id,
        COALESCE(sa.role_id, sr.role_id) AS role_id,
        r.name AS role_name,
        r.name AS crm_role_name,
        r.color AS crm_role_color,
        r.icon AS crm_role_icon,
        r.is_super_admin,
        COALESCE(sa.created_at, sr.assigned_at, m.created_at) AS assigned_at
      FROM (
        SELECT id, user_id, org_id, organization_id, role, created_at FROM org_memberships
        WHERE (org_id = $1 OR organization_id = $1)
        UNION
        SELECT id, user_id, organization_id AS org_id, organization_id, role, created_at FROM organization_memberships
        WHERE (organization_id = $1 OR org_id = $1)
      ) m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN crm_staff_assignments sa 
        ON (sa.user_id = u.id OR sa.staff_id = u.id) AND (sa.org_id = $1 OR sa.organization_id = $1)
      LEFT JOIN crm_staff_roles sr 
        ON (sr.staff_id = u.id)
      LEFT JOIN crm_roles r 
        ON r.id = COALESCE(sa.role_id, sr.role_id)
    `;
    const params = [orgId];

    if (req.query.user_id) {
      params.push(req.query.user_id);
      query += ` WHERE u.id = $${params.length}`;
    }

    query += ` ORDER BY u.id, m.created_at ASC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching CRM staff:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.get('/staff', getStaffHandler);
router.get('/staff-roles', getStaffHandler);

// POST /api/crm/staff & POST /api/crm/staff-roles
const assignStaffRoleHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const userId = req.body.user_id || req.body.staff_id;
    const roleId = req.body.role_id;
    if (!userId || !roleId) {
      return res.status(400).json({ error: 'user_id and role_id are required' });
    }

    // Upsert crm_staff_assignments
    const result = await pool.query(
      `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
       VALUES ($1, $1, $2, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id
       RETURNING *`,
      [orgId, userId, roleId, req.user?.id || null]
    );

    // Sync crm_staff_roles
    await pool.query(
      `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (staff_id, role_id) DO NOTHING`,
      [userId, roleId, req.user?.id || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/staff', assignStaffRoleHandler);
router.post('/staff-roles', assignStaffRoleHandler);

// DELETE /api/crm/staff/:id & DELETE /api/crm/staff-roles/:id
const deleteStaffRoleHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM crm_staff_assignments WHERE id = $1 OR user_id = $1 OR staff_id = $1', [id]);
    await pool.query('DELETE FROM crm_staff_roles WHERE staff_id = $1 OR role_id = $1', [id]);
    return res.json({ success: true });
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
    const orgId = req.orgId || req.query.org_id;
    const { user_id, month, year, date } = req.query;

    let query = `
      SELECT a.*, u.full_name, u.email
      FROM attendance_records a
      JOIN users u ON u.id = a.user_id
      WHERE a.org_id = $1
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
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/attendance
router.post('/attendance', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      user_id = req.user.id,
      date = new Date().toISOString().split('T')[0],
      clock_in, clock_out, status = 'present', notes, latitude, longitude
    } = req.body;

    const result = await pool.query(
      `INSERT INTO attendance_records (org_id, user_id, date, clock_in, clock_out, status, notes, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, date)
       DO UPDATE SET clock_out = COALESCE(EXCLUDED.clock_out, attendance_records.clock_out),
                     status = COALESCE(EXCLUDED.status, attendance_records.status),
                     notes = COALESCE(EXCLUDED.notes, attendance_records.notes)
       RETURNING *`,
      [orgId, user_id, date, clock_in || new Date(), clock_out, status, notes, latitude, longitude]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SALARY & PAYROLL ====================

// GET /api/crm/salary
router.get('/salary', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { user_id } = req.query;

    let query = `
      SELECT sp.*, u.full_name, u.email
      FROM salary_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.org_id = $1
    `;
    const params = [orgId];
    if (user_id) {
      params.push(user_id);
      query += ` AND sp.user_id = $${params.length}`;
    }
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/salary
router.post('/salary', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { user_id, base_salary = 0, allowances = 0, deductions = 0, effective_from = new Date() } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await pool.query(
      `INSERT INTO salary_profiles (org_id, user_id, base_salary, allowances, deductions, effective_from)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, org_id)
       DO UPDATE SET base_salary = EXCLUDED.base_salary,
                     allowances = EXCLUDED.allowances,
                     deductions = EXCLUDED.deductions,
                     effective_from = EXCLUDED.effective_from
       RETURNING *`,
      [orgId, user_id, base_salary, allowances, deductions, effective_from]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/payroll
router.get('/payroll', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { month, year } = req.query;

    let query = `
      SELECT pr.*, u.full_name, u.email
      FROM payroll_records pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.org_id = $1
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

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/payroll
router.post('/payroll', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { user_id, month, year, base_salary = 0, allowances = 0, deductions = 0, advance = 0, net_salary, status = 'pending' } = req.body;
    const calculatedNet = net_salary !== undefined ? net_salary : (Number(base_salary) + Number(allowances) - Number(deductions) - Number(advance));

    const result = await pool.query(
      `INSERT INTO payroll_records (org_id, user_id, month, year, base_salary, allowances, deductions, advance, net_salary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, month, year)
       DO UPDATE SET base_salary = EXCLUDED.base_salary,
                     allowances = EXCLUDED.allowances,
                     deductions = EXCLUDED.deductions,
                     advance = EXCLUDED.advance,
                     net_salary = EXCLUDED.net_salary,
                     status = EXCLUDED.status
       RETURNING *`,
      [orgId, user_id, month, year, base_salary, allowances, deductions, advance, calculatedNet, status]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== TICKETS & TASKS ====================

// GET /api/crm/tickets
router.get('/tickets', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM customer_tickets WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/tickets
router.post('/tickets', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { customer_id, subject, description, priority = 'medium', assigned_to } = req.body;
    const result = await pool.query(
      `INSERT INTO customer_tickets (org_id, customer_id, subject, description, priority, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
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
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { status, priority, assigned_to, search } = req.query;

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
        COALESCE(u.full_name, u.email, 'Unassigned') AS assignee_name,
        u.email AS assignee_email,
        u.avatar_url AS assignee_avatar_url,
        COALESCE(t.assigned_by, t.created_by) AS assigned_by,
        COALESCE(c.full_name, c.email, 'System') AS creator_name,
        t.due_date,
        COALESCE(t.requires_proof, t.proof_required, false) AS requires_proof,
        COALESCE(t.requires_proof, t.proof_required, false) AS proof_required,
        t.proof_notes,
        t.completed_at,
        t.approved_by,
        COALESCE(appr.full_name, appr.email) AS approver_name,
        t.approved_at,
        t.review_feedback,
        t.created_at,
        t.updated_at
      FROM staff_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
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

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching CRM tasks:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/tasks
router.post('/tasks', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
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

    const targetAssignee = assigned_to || assignee_id || null;
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
    let assigneeName = 'Unassigned';
    let assigneeEmail = null;
    let assigneeAvatarUrl = null;
    if (targetAssignee) {
      const uRes = await pool.query('SELECT full_name, email, avatar_url FROM users WHERE id = $1', [targetAssignee]);
      if (uRes.rows.length > 0) {
        assigneeName = uRes.rows[0].full_name || uRes.rows[0].email;
        assigneeEmail = uRes.rows[0].email;
        assigneeAvatarUrl = uRes.rows[0].avatar_url;
      }
    }

    let creatorName = 'System';
    if (req.user?.id) {
      const cRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [req.user.id]);
      if (cRes.rows.length > 0) {
        creatorName = cRes.rows[0].full_name || cRes.rows[0].email;
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
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { id } = req.params;

    // Check task existence and tenant isolation
    const existingRes = await pool.query(
      `SELECT * FROM staff_tasks WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
      [id, orgId]
    );
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
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
        // Task completed & approved
        updates.completed_at = updates.completed_at || new Date().toISOString();
        updates.approved_by = req.user?.id || null;
        updates.approved_at = new Date().toISOString();
      } else if (normalizedStatus === 'review') {
        // Submitted for review
        if (!updates.proof_notes && !current.proof_notes) {
          updates.proof_notes = 'Work submitted for manager review.';
        }
      } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'todo') {
        // If transitioning away from done, reset approval metadata
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
      const uRes = await pool.query('SELECT full_name, email, avatar_url FROM users WHERE id = $1', [updatedTask.assigned_to]);
      if (uRes.rows.length > 0) {
        assigneeName = uRes.rows[0].full_name || uRes.rows[0].email;
        assigneeEmail = uRes.rows[0].email;
        assigneeAvatarUrl = uRes.rows[0].avatar_url;
      }
    }

    let approverName = null;
    if (updatedTask.approved_by) {
      const aRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [updatedTask.approved_by]);
      if (aRes.rows.length > 0) {
        approverName = aRes.rows[0].full_name || aRes.rows[0].email;
      }
    }

    let creatorName = 'System';
    if (updatedTask.assigned_by || updatedTask.created_by) {
      const cRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [updatedTask.assigned_by || updatedTask.created_by]);
      if (cRes.rows.length > 0) {
        creatorName = cRes.rows[0].full_name || cRes.rows[0].email;
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
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM staff_tasks 
       WHERE id = $1 AND (org_id = $2 OR organization_id = $2) 
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

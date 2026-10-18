const express = require('express');
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

// ==================== STAFF ASSIGNMENTS ====================

// GET /api/crm/staff
router.get('/staff', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      `SELECT sa.id as assignment_id, sa.created_at as assigned_at,
              u.id as user_id, u.email, u.full_name, u.phone, u.avatar_url,
              r.id as role_id, r.name as role_name
       FROM crm_staff_assignments sa
       JOIN users u ON u.id = sa.user_id
       LEFT JOIN crm_roles r ON r.id = sa.role_id
       WHERE sa.org_id = $1`,
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/staff
router.post('/staff', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { user_id, role_id } = req.body;
    const result = await pool.query(
      `INSERT INTO crm_staff_assignments (org_id, user_id, role_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id
       RETURNING *`,
      [orgId, user_id, role_id, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crm/staff/:id
router.delete('/staff/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM crm_staff_assignments WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM staff_tasks WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/tasks
router.post('/tasks', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { assigned_to, title, description, due_date, priority = 'medium' } = req.body;
    const result = await pool.query(
      `INSERT INTO staff_tasks (org_id, assigned_to, assigned_by, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [orgId, assigned_to, req.user?.id, title, description, due_date, priority]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

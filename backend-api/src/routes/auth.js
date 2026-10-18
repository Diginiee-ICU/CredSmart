const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const generateTokens = (user, orgId) => {
  const payload = { id: user.id, email: user.email, orgId };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
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

    // Create owner membership
    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, role)
       VALUES ($1, $2, 'owner')`,
      [newUser.id, newOrg.id]
    );

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

    const formattedUser = {
      id: newUser.id,
      email: newUser.email,
      user_metadata: { full_name: newUser.full_name, phone: newUser.phone, ...data },
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
      `SELECT id, email, password_hash, full_name, phone, avatar_url, created_at
       FROM users WHERE email = $1`,
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
    const orgRes = await pool.query(
      `SELECT org_id FROM org_memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [user.id]
    );
    const orgId = orgRes.rows.length > 0 ? orgRes.rows[0].org_id : null;

    const { accessToken, refreshToken } = generateTokens(user, orgId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    const formattedUser = {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.full_name, phone: user.phone },
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
    const refreshToken = req.body.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokenRes = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.full_name, u.phone, u.avatar_url, u.created_at
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1`,
      [refreshToken]
    );

    if (tokenRes.rows.length === 0 || new Date(tokenRes.rows[0].expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const row = tokenRes.rows[0];
    const user = {
      id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
    };

    const orgRes = await pool.query(
      `SELECT org_id FROM org_memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [user.id]
    );
    const orgId = orgRes.rows.length > 0 ? orgRes.rows[0].org_id : null;

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user, orgId);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Rotate refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, newRefreshToken, newExpiresAt]
    );

    const formattedUser = {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.full_name, phone: user.phone },
      created_at: user.created_at,
    };

    return res.status(200).json({
      user: formattedUser,
      session: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        user: formattedUser,
      },
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message || 'Token refresh failed' });
  }
});

// GET /api/auth/user
router.get('/user', authenticate, async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT id, email, full_name, phone, avatar_url, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        user_metadata: { full_name: user.full_name, phone: user.phone },
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

const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'credsmart_jwt_secret_key_2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Resolve active organization ID from header, token, or database
    const orgHeader = req.headers['x-organization-id'];
    if (orgHeader && orgHeader !== 'undefined' && orgHeader !== 'null' && orgHeader !== '') {
      req.orgId = orgHeader;
    } else if (decoded.orgId) {
      req.orgId = decoded.orgId;
    } else {
      // Lookup user's first membership if not specified
      try {
        const memberRes = await pool.query(
          `SELECT COALESCE(m.org_id, m.organization_id) AS org_id
           FROM (
             SELECT org_id, organization_id, user_id, created_at, 1 AS priority FROM org_memberships WHERE user_id = $1
             UNION
             SELECT organization_id as org_id, organization_id, user_id, created_at, 1 AS priority FROM organization_memberships WHERE user_id = $1
             UNION
             SELECT org_id, organization_id, COALESCE(user_id, staff_id) AS user_id, created_at, 2 AS priority FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1)
           ) m
           WHERE COALESCE(m.org_id, m.organization_id) IS NOT NULL
           ORDER BY m.priority ASC, m.created_at ASC
           LIMIT 1`,
          [decoded.id]
        );
        if (memberRes.rows.length > 0 && memberRes.rows[0].org_id) {
          req.orgId = memberRes.rows[0].org_id;
        }
      } catch (e) {
        // Do not fall back to foreign organizations!
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.orgId = req.headers['x-organization-id'] || decoded.orgId;
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
};

module.exports = { authenticate, optionalAuth, JWT_SECRET };

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
             SELECT org_id, organization_id, user_id FROM org_memberships WHERE user_id = $1
             UNION
             SELECT organization_id as org_id, organization_id, user_id FROM organization_memberships WHERE user_id = $1
           ) m
           ORDER BY (
             SELECT COUNT(*) FROM products p WHERE p.org_id = m.org_id OR p.organization_id = m.org_id
           ) DESC
           LIMIT 1`,
          [decoded.id]
        );
        if (memberRes.rows.length > 0 && memberRes.rows[0].org_id) {
          req.orgId = memberRes.rows[0].org_id;
        }
      } catch (e) {
        // Fallback: try querying organization directly with most data
        try {
          const directOrg = await pool.query(
            `SELECT id FROM organizations
             ORDER BY (
               SELECT COUNT(*) FROM products p WHERE p.org_id = organizations.id OR p.organization_id = organizations.id
             ) DESC, created_at ASC
             LIMIT 1`
          );
          if (directOrg.rows.length > 0) req.orgId = directOrg.rows[0].id;
        } catch (_ignored) {}
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

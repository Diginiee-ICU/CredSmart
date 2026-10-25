const bcrypt = require('bcryptjs');
const pool = require('./src/db');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || 'Admin User';
  const orgName = process.argv[5] || 'CredSmart Business';

  if (!email || !password) {
    console.log('Usage: node create-user.js <email> <password> [fullName] [orgName]');
    console.log('Example: node create-user.js admin@credsmart.online Secret123 "CredSmart Admin" "CredSmart Global"');
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if user already exists
    const userRes = await client.query('SELECT id, email FROM users WHERE email = $1', [cleanEmail]);
    let userId;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      await client.query(
        'UPDATE users SET password_hash = $1, full_name = COALESCE(NULLIF($2, \'\'), full_name), updated_at = NOW() WHERE id = $3',
        [passwordHash, fullName, userId]
      );
      console.log(`[OK] Updated password for existing user: ${cleanEmail} (ID: ${userId})`);
    } else {
      const newUserRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [cleanEmail, passwordHash, fullName]
      );
      userId = newUserRes.rows[0].id;
      console.log(`[OK] Created new user: ${cleanEmail} (ID: ${userId})`);
    }

    // 2. Ensure organization exists
    let orgId;
    const orgRes = await client.query(
      `SELECT COALESCE(org_id, organization_id) AS org_id FROM (
         SELECT org_id, organization_id, created_at FROM org_memberships WHERE user_id = $1
         UNION
         SELECT organization_id AS org_id, organization_id, created_at FROM organization_memberships WHERE user_id = $1
       ) m WHERE org_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );

    if (orgRes.rows.length > 0 && orgRes.rows[0].org_id) {
      orgId = orgRes.rows[0].org_id;
      console.log(`[OK] User already belongs to organization: ${orgId}`);
    } else {
      // Check if an organization with data already exists
      const existingOrgRes = await client.query(
        `SELECT id, name FROM organizations
         ORDER BY (
           SELECT COUNT(*) FROM products p WHERE p.org_id = organizations.id OR p.organization_id = organizations.id
         ) DESC, created_at ASC
         LIMIT 1`
      );

      if (existingOrgRes.rows.length > 0) {
        orgId = existingOrgRes.rows[0].id;
        console.log(`[OK] Linked user to existing business organization "${existingOrgRes.rows[0].name}" (ID: ${orgId})`);
      } else {
        const newOrgRes = await client.query(
          `INSERT INTO organizations (name, email)
           VALUES ($1, $2)
           RETURNING id`,
          [orgName, cleanEmail]
        );
        orgId = newOrgRes.rows[0].id;
        console.log(`[OK] Created organization "${orgName}" (ID: ${orgId})`);
      }

      await client.query(
        `INSERT INTO org_memberships (user_id, org_id, organization_id, role)
         VALUES ($1, $2, $2, 'owner')
         ON CONFLICT (user_id, org_id) DO NOTHING`,
        [userId, orgId]
      );

      await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
         VALUES ($1, $2, $2, 'owner')
         ON CONFLICT DO NOTHING`,
        [userId, orgId]
      );

      await client.query(
        `INSERT INTO invoice_sequences (org_id, organization_id, sales_prefix, sales_counter, purchase_prefix, purchase_counter)
         VALUES ($1, $1, 'INV', 0, 'PUR', 0)
         ON CONFLICT (org_id) DO NOTHING`,
        [orgId]
      );
    }

    await client.query('COMMIT');
    console.log('\n========================================');
    console.log(' User Credentials Ready:');
    console.log(` Email:    ${cleanEmail}`);
    console.log(` Org ID:   ${orgId}`);
    console.log(' You can now log in at https://credsmart.online');
    console.log('========================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] Failed to create or update user:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();

-- CredSmart CRM: Cross-Tenant Membership Cleanup Migration
-- Run this ONCE on the production postgres-db container (app_db database)
-- Safe to re-run (idempotent using WHERE EXISTS checks)
-- Fixes the CROSS JOIN corruption from fix_db.sql lines 131-141

BEGIN;

-- Step 1: Audit — show rogue memberships before deletion
SELECT
  om.id,
  u.email,
  o.name as org_name,
  om.role,
  om.invited_by,
  om.created_at
FROM org_memberships om
JOIN users u ON u.id = om.user_id
JOIN organizations o ON o.id = om.org_id
WHERE om.invited_by IS NULL
  AND om.role = 'owner'
  AND o.owner_id IS DISTINCT FROM om.user_id
ORDER BY om.created_at DESC
LIMIT 50;

-- Step 2: Remove memberships where:
--   - user is NOT the actual owner of the org (o.owner_id != user_id)
--   - AND was not explicitly invited (invited_by IS NULL)
--   - AND has role 'owner' (these were the CROSS JOIN injected rows)
DELETE FROM org_memberships
WHERE id IN (
  SELECT om.id
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.invited_by IS NULL
    AND om.role = 'owner'
    AND o.owner_id IS DISTINCT FROM om.user_id
);

-- Step 3: Remove crm_staff_assignments that point to non-existent org_memberships
DELETE FROM crm_staff_assignments
WHERE (user_id, org_id) NOT IN (
  SELECT user_id, org_id FROM org_memberships
)
AND user_id NOT IN (
  SELECT owner_id FROM organizations WHERE owner_id IS NOT NULL
);

-- Step 4: Verify cleanup
SELECT
  'org_memberships remaining' as metric,
  COUNT(*) as count
FROM org_memberships
UNION ALL
SELECT
  'crm_staff_assignments remaining',
  COUNT(*)
FROM crm_staff_assignments;

COMMIT;

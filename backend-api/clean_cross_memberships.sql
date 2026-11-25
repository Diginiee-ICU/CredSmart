-- CredSmart CRM: Cross-Tenant Membership Cleanup Migration
-- Run this ONCE on the production postgres-db container (app_db database)
-- Safe to re-run (idempotent using WHERE EXISTS checks)
-- Fixes the CROSS JOIN corruption from fix_db.sql lines 131-141

BEGIN;

-- Step 1: Remove rogue cross-tenant rows from org_memberships where:
--   - organization has a verified owner_id AND user is NOT that owner
--   - AND was not explicitly invited (invited_by IS NULL)
--   - AND has role 'owner' (these were the CROSS JOIN injected rows)
DELETE FROM org_memberships
WHERE id IN (
  SELECT om.id
  FROM org_memberships om
  JOIN organizations o ON o.id = COALESCE(om.org_id, om.organization_id)
  WHERE om.invited_by IS NULL
    AND om.role = 'owner'
    AND o.owner_id IS NOT NULL
    AND o.owner_id IS DISTINCT FROM om.user_id
);

-- Step 2: Remove rogue cross-tenant rows from organization_memberships
DELETE FROM organization_memberships
WHERE id IN (
  SELECT om.id
  FROM organization_memberships om
  JOIN organizations o ON o.id = COALESCE(om.organization_id, om.org_id)
  WHERE om.invited_by IS NULL
    AND om.role = 'owner'
    AND o.owner_id IS NOT NULL
    AND o.owner_id IS DISTINCT FROM om.user_id
);

-- Step 2b: Self-heal any legitimate organization owner missing from membership tables
INSERT INTO org_memberships (user_id, org_id, organization_id, role, created_at)
SELECT o.owner_id, o.id, o.id, 'owner', COALESCE(o.created_at, NOW())
FROM organizations o
JOIN users u ON u.id = o.owner_id
WHERE o.owner_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

INSERT INTO organization_memberships (user_id, organization_id, org_id, role, created_at)
SELECT o.owner_id, o.id, o.id, 'owner', COALESCE(o.created_at, NOW())
FROM organizations o
JOIN users u ON u.id = o.owner_id
WHERE o.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.user_id = o.owner_id
      AND (om.organization_id = o.id OR om.org_id = o.id)
  );

-- Step 3: Remove crm_staff_assignments pointing to deleted rogue memberships
DELETE FROM crm_staff_assignments
WHERE (user_id, org_id) NOT IN (
  SELECT user_id, org_id FROM org_memberships
  UNION
  SELECT user_id, COALESCE(organization_id, org_id) AS org_id FROM organization_memberships
)
AND user_id NOT IN (
  SELECT owner_id FROM organizations WHERE owner_id IS NOT NULL
);

-- Step 4: Verify cleanup counts
SELECT
  'org_memberships remaining' as metric,
  COUNT(*) as count
FROM org_memberships
UNION ALL
SELECT
  'organization_memberships remaining',
  COUNT(*)
FROM organization_memberships
UNION ALL
SELECT
  'crm_staff_assignments remaining',
  COUNT(*)
FROM crm_staff_assignments;

COMMIT;

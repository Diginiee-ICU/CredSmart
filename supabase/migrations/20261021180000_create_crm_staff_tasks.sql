BEGIN;

-- ============================================================================
-- Migration: 20261021180000_create_crm_staff_tasks.sql
-- Description: Idempotent Enterprise Staff Tasks & Lifecycle Management
-- ============================================================================

-- 1. Create staff_tasks table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  assigned_to UUID,
  assigned_by UUID,
  created_by UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'normal',
  requires_proof BOOLEAN DEFAULT FALSE,
  proof_required BOOLEAN DEFAULT FALSE,
  proof_notes TEXT,
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  review_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns idempotently for existing databases
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'todo';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_notes TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS review_feedback TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Data normalization & dual-sync backfill
UPDATE public.staff_tasks SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE public.staff_tasks SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE public.staff_tasks SET assigned_by = created_by WHERE assigned_by IS NULL AND created_by IS NOT NULL;
UPDATE public.staff_tasks SET created_by = assigned_by WHERE created_by IS NULL AND assigned_by IS NOT NULL;
UPDATE public.staff_tasks SET requires_proof = proof_required WHERE requires_proof IS NULL AND proof_required IS NOT NULL;
UPDATE public.staff_tasks SET proof_required = requires_proof WHERE proof_required IS NULL AND requires_proof IS NOT NULL;

-- Normalize legacy 'pending' status to 'todo' and 'medium' priority to 'normal'
UPDATE public.staff_tasks SET status = 'todo' WHERE status = 'pending' OR status IS NULL;
UPDATE public.staff_tasks SET priority = 'normal' WHERE priority = 'medium' OR priority IS NULL;

-- 4. Bidirectional trigger for tenant isolation
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_org_id_and_organization_id') THEN
    DROP TRIGGER IF EXISTS trg_sync_org_ids ON public.staff_tasks;
    CREATE TRIGGER trg_sync_org_ids
      BEFORE INSERT OR UPDATE ON public.staff_tasks
      FOR EACH ROW
      EXECUTE FUNCTION sync_org_id_and_organization_id();
  END IF;
END $$;

-- 5. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_id ON public.staff_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_organization_id ON public.staff_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON public.staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON public.staff_tasks(org_id, priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON public.staff_tasks(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON public.staff_tasks(org_id, created_at DESC);

-- 6. Duality alignment: ensure crm_staff_assignments has both user_id and staff_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_staff_assignments') THEN
    ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS staff_id UUID;
    UPDATE public.crm_staff_assignments SET user_id = staff_id WHERE user_id IS NULL AND staff_id IS NOT NULL;
    UPDATE public.crm_staff_assignments SET staff_id = user_id WHERE staff_id IS NULL AND user_id IS NOT NULL;
  END IF;
END $$;

-- 7. RLS Policies (for Supabase environment)
DO $$ BEGIN
  ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_org_access') THEN
    DROP POLICY IF EXISTS "Members can view staff tasks" ON public.staff_tasks;
    CREATE POLICY "Members can view staff tasks"
      ON public.staff_tasks FOR SELECT
      USING (has_org_access(COALESCE(org_id, organization_id)));

    DROP POLICY IF EXISTS "Members can insert staff tasks" ON public.staff_tasks;
    CREATE POLICY "Members can insert staff tasks"
      ON public.staff_tasks FOR INSERT
      WITH CHECK (has_org_access(COALESCE(org_id, organization_id)));

    DROP POLICY IF EXISTS "Members can update staff tasks" ON public.staff_tasks;
    CREATE POLICY "Members can update staff tasks"
      ON public.staff_tasks FOR UPDATE
      USING (has_org_access(COALESCE(org_id, organization_id)));

    DROP POLICY IF EXISTS "Members can delete staff tasks" ON public.staff_tasks;
    CREATE POLICY "Members can delete staff tasks"
      ON public.staff_tasks FOR DELETE
      USING (has_org_access(COALESCE(org_id, organization_id)));
  END IF;
END $$;

COMMIT;

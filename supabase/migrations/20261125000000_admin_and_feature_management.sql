-- ============================================================================
-- Migration: 20261125000000_admin_and_feature_management.sql
-- Live User Presence, Billings Analytics, Granular Feature Access & Approval
-- Target: PostgreSQL 16 / Supabase
-- ============================================================================

BEGIN;

-- 1) user_presence
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  current_path VARCHAR(255),
  platform VARCHAR(50) DEFAULT 'desktop-web',
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_presence_live ON public.user_presence(organization_id, last_active_at DESC);

-- 2) user_feature_locks
CREATE TABLE IF NOT EXISTS public.user_feature_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  locked_by UUID,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id, feature_key)
);
ALTER TABLE public.user_feature_locks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_feature_locks_lookup ON public.user_feature_locks(organization_id, user_id);

-- 3) feature_access_requests
CREATE TABLE IF NOT EXISTS public.feature_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  feature_key VARCHAR(50) NOT NULL,
  reason TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.feature_access_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feature_requests_org_status ON public.feature_access_requests(organization_id, status);

-- 4) feature_usage_logs
CREATE TABLE IF NOT EXISTS public.feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feature_usage_org_created ON public.feature_usage_logs(organization_id, created_at DESC);

COMMIT;

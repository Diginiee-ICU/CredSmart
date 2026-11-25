-- ============================================================================
-- Migration: 20261126000000_white_label_branding.sql
-- Multi-Tenant White-Label Branding, Platform Admin Approval & Key Activation
-- Target: PostgreSQL 16 / Supabase
-- ============================================================================

BEGIN;

-- 1) Platform Admin flag on users (if public.users exists in standalone DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;
    UPDATE public.users
    SET is_platform_admin = true
    WHERE LOWER(email) = 'ashwinbishnoi05@gmail.com';
  END IF;
END $$;

-- 2) white_label_requests
CREATE TABLE IF NOT EXISTS public.white_label_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requester_email VARCHAR(255) DEFAULT '',
  requester_name VARCHAR(255) DEFAULT '',
  requested_brand_name VARCHAR(120) NOT NULL,
  requested_domain VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  activation_key VARCHAR(64),
  activation_key_hash VARCHAR(128),
  failed_attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.white_label_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wl_requests_org_status
  ON public.white_label_requests(organization_id, status, created_at DESC);

-- 3) white_label_configs
CREATE TABLE IF NOT EXISTS public.white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.white_label_requests(id) ON DELETE SET NULL,
  is_activated BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ,

  -- Routing & Identity
  brand_slug VARCHAR(100),
  custom_domain VARCHAR(255),
  brand_name VARCHAR(120) NOT NULL DEFAULT 'CredSmart',
  brand_tagline VARCHAR(180) DEFAULT 'POS & Invoicing BillBook',
  powered_by_text VARCHAR(120) DEFAULT '',
  hide_platform_branding BOOLEAN NOT NULL DEFAULT true,

  -- Visual Assets
  logo_light_url TEXT DEFAULT '',
  logo_dark_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  splash_logo_url TEXT DEFAULT '',

  -- Theme Palette
  primary_color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#F97316',
  sidebar_theme VARCHAR(20) NOT NULL DEFAULT 'dark',

  -- Contact & SEO
  support_email VARCHAR(255) DEFAULT '',
  support_phone VARCHAR(40) DEFAULT '',
  website_url TEXT DEFAULT '',
  meta_title VARCHAR(180) DEFAULT '',
  meta_description TEXT DEFAULT '',
  custom_footer_text VARCHAR(255) DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_configs_slug_unique
  ON public.white_label_configs(LOWER(brand_slug))
  WHERE brand_slug IS NOT NULL AND brand_slug <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_configs_domain_unique
  ON public.white_label_configs(LOWER(custom_domain))
  WHERE custom_domain IS NOT NULL AND custom_domain <> '';

COMMIT;


-- Add invoicing fields to organizations
ALTER TABLE public.organizations
  ADD COLUMN gstin TEXT DEFAULT '',
  ADD COLUMN pan TEXT DEFAULT '',
  ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN invoice_prefix TEXT DEFAULT 'INV',
  ADD COLUMN logo_url TEXT DEFAULT '';

-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-logos');

-- Allow public read access to logos
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'store-logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "Authenticated users can delete logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-logos');

-- BU MIGRATION ZATEN UYGULANDI (Supabase MCP ile)
-- Sadece referans amaçlı:

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS color text;

CREATE TABLE IF NOT EXISTS public.shift_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_key text NOT NULL CHECK (template_key IN ('morning', 'mid', 'evening')),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (business_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_shift_templates_business
  ON public.shift_templates (business_id);

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shift_templates_member ON public.shift_templates;
CREATE POLICY shift_templates_member ON public.shift_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members
      WHERE business_members.business_id = shift_templates.business_id
        AND business_members.user_id = auth.uid()
        AND business_members.status = 'active'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_staff_date_unique
  ON public.shifts (staff_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_staff_business_active
  ON public.staff (business_id, active);

CREATE OR REPLACE FUNCTION public.shift_templates_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shift_templates_updated_at ON public.shift_templates;
CREATE TRIGGER trg_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.shift_templates_set_updated_at();

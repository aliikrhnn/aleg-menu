-- Önce şunu Supabase SQL Editor'da çalıştır!

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline_tr TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline_en TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
  "mon": {"open": "08:00", "close": "23:00", "closed": false},
  "tue": {"open": "08:00", "close": "23:00", "closed": false},
  "wed": {"open": "08:00", "close": "23:00", "closed": false},
  "thu": {"open": "08:00", "close": "23:00", "closed": false},
  "fri": {"open": "08:00", "close": "23:00", "closed": false},
  "sat": {"open": "09:00", "close": "23:00", "closed": false},
  "sun": {"open": "09:00", "close": "22:00", "closed": false}
}'::jsonb;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS order_config JSONB DEFAULT '{
  "online_enabled": true,
  "modes": {"dinein": true, "pickup": true, "delivery": false},
  "langs": {"tr": true, "en": false}
}'::jsonb;

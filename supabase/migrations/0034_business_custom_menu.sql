-- Migration 0034: businesses.custom_menu jsonb alanı
--
-- İşletme kendi tasarladığı menüyü yükleyebilir. Bu alan yüklenen
-- dosyanın metadata'sını saklar:
--   {
--     url: string,             -- public Supabase storage URL
--     path: string,            -- storage path (silmek için)
--     uploaded_at: string,     -- ISO timestamp
--     filename: string,        -- orijinal dosya adı
--     mime: string,            -- MIME tipi (image/png, image/jpeg, application/pdf)
--     width?: number,          -- görsel ise px genişlik (opsiyonel)
--     height?: number          -- görsel ise px yükseklik (opsiyonel)
--   }
--
-- NULL = işletme henüz custom menü yüklememiş.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS custom_menu jsonb DEFAULT NULL;

COMMENT ON COLUMN businesses.custom_menu IS
  'İşletmenin yüklediği özel menü tasarımı metadatası (jsonb). Sistem altına QR ekleyerek PDF üretir.';

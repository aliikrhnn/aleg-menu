-- order_items tablosunda options kolonu yoksa ekle
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Migration 0037: order_items.cancel_reason
--
-- Kalem iptali için ayrı kolon. Önceden complimentary_reason'a
-- yazılıyordu — ikram nedeni ile iptal nedeni karışıyordu.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN order_items.cancel_reason IS
  'Kalem iptal nedeni (status = cancelled iken doludur). complimentary_reason ile karıştırılmamalı.';

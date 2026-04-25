-- ============================================================
-- ALEG - 0028: Realtime publication düzeltme
-- ============================================================
-- waiter_calls ve call_buttons için realtime publication garanti

-- waiter_calls
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'waiter_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
  END IF;
END $$;

-- call_buttons (panel canlı güncellemesi için, opsiyonel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'call_buttons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_buttons;
  END IF;
END $$;

-- Replica identity FULL - realtime UPDATE için tam payload
ALTER TABLE waiter_calls REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_id TEXT,
  source_table TEXT,
  target_role TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_event ON notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_logs_target ON notification_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_created ON notification_logs(created_at DESC);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all notification logs" ON notification_logs;
CREATE POLICY "Admins can view all notification logs"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

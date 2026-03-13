-- Push notification subscriptions table
-- Stores each user's browser push subscription for Web Push API
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh_key text NOT NULL,
    auth_key text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own push subscriptions"
    ON push_subscriptions FOR ALL
    USING (user_id = auth.uid());

-- Admins can read all subscriptions (needed for sending notifications)
CREATE POLICY "Admins can read all subscriptions"
    ON push_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.id = auth.uid() AND ur.role = 'ADMIN'
        )
    );

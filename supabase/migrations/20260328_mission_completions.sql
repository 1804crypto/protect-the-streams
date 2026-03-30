-- Migration: 20260328_mission_completions.sql
-- Adds idempotency table for mission completions to prevent double-rewards on network retries

CREATE TABLE IF NOT EXISTS public.mission_completions (
    idempotency_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_mission_completions_user
    ON public.mission_completions (user_id);

-- Auto-expire old records after 7 days to keep table small
-- (Requires pg_cron or manual cleanup; this index supports time-based queries)
CREATE INDEX IF NOT EXISTS idx_mission_completions_created
    ON public.mission_completions (created_at);

-- RLS: Only service role should access this table
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Only" ON public.mission_completions
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

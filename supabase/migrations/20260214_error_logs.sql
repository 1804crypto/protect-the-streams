-- Error Logs table for production error monitoring
-- Persists ERROR and WARN level events from Logger
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('ERROR', 'WARN', 'INFO')),
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    environment TEXT DEFAULT 'production',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index for filtering by severity
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
-- Auto-cleanup: delete logs older than 30 days (optional, run via cron)
-- DELETE FROM public.error_logs WHERE created_at < NOW() - INTERVAL '30 days';
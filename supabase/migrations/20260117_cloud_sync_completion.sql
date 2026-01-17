-- Completion of Cloud Sync fields
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS streamer_natures JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS completed_missions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS faction TEXT DEFAULT 'NONE';
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_faction_minted BOOLEAN DEFAULT false;
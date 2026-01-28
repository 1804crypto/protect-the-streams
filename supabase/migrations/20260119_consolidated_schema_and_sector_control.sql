-- Consolidated Database Schema Migration
-- Ensures all required tables and columns are present
-- 1. Users Table (Incremental update to existing table)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address text UNIQUE NOT NULL,
    username text UNIQUE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    inventory JSONB DEFAULT '{}'::jsonb,
    is_banned BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Ensure incremental columns exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS secured_ids TEXT [] DEFAULT '{}';
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS streamer_natures JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS completed_missions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS faction TEXT DEFAULT 'NONE';
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_faction_minted BOOLEAN DEFAULT false;
-- Index for faster lookups by wallet address
CREATE INDEX IF NOT EXISTS users_wallet_address_idx ON public.users(wallet_address);
-- 2. Sector Control Table
CREATE TABLE IF NOT EXISTS public.sector_control (
    streamer_id TEXT PRIMARY KEY REFERENCES public.streamers(id) ON DELETE CASCADE,
    controlling_faction TEXT DEFAULT 'NONE',
    -- 'RED', 'PURPLE', 'NONE'
    red_influence INTEGER DEFAULT 0,
    purple_influence INTEGER DEFAULT 0,
    last_capture_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Ensure columns exist if table was already there
ALTER TABLE public.sector_control
ADD COLUMN IF NOT EXISTS controlling_faction TEXT DEFAULT 'NONE';
ALTER TABLE public.sector_control
ADD COLUMN IF NOT EXISTS red_influence INTEGER DEFAULT 0;
ALTER TABLE public.sector_control
ADD COLUMN IF NOT EXISTS purple_influence INTEGER DEFAULT 0;
ALTER TABLE public.sector_control
ADD COLUMN IF NOT EXISTS last_capture_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.sector_control
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Index for faction scans
CREATE INDEX IF NOT EXISTS sector_control_faction_idx ON public.sector_control(controlling_faction);
-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_control ENABLE ROW LEVEL SECURITY;
-- 4. Policies
-- Users: Public read, Service role write
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Users are viewable by everyone'
) THEN CREATE POLICY "Users are viewable by everyone" ON public.users FOR
SELECT USING (true);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Service Role can update everything'
) THEN CREATE POLICY "Service Role can update everything" ON public.users USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
END IF;
END $$;
-- Sector Control: Public read, Service role write
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Public Sector Control Read'
) THEN CREATE POLICY "Public Sector Control Read" ON public.sector_control FOR
SELECT USING (true);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Service Role Sector Update'
) THEN CREATE POLICY "Service Role Sector Update" ON public.sector_control USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
END IF;
END $$;
-- 5. RPC: Faction War Contribution
CREATE OR REPLACE FUNCTION public.contribute_to_faction_war(p_streamer_id TEXT, p_faction TEXT) RETURNS VOID AS $$ BEGIN -- Ensure entry exists
INSERT INTO public.sector_control (streamer_id, controlling_faction)
VALUES (p_streamer_id, 'NONE') ON CONFLICT (streamer_id) DO NOTHING;
-- Add influence
IF p_faction = 'RED' THEN
UPDATE public.sector_control
SET red_influence = red_influence + 1,
    updated_at = NOW()
WHERE streamer_id = p_streamer_id;
ELSIF p_faction = 'PURPLE' THEN
UPDATE public.sector_control
SET purple_influence = purple_influence + 1,
    updated_at = NOW()
WHERE streamer_id = p_streamer_id;
END IF;
-- Check for Flip
UPDATE public.sector_control
SET controlling_faction = CASE
        WHEN red_influence > purple_influence + 10 THEN 'RED'
        WHEN purple_influence > red_influence + 10 THEN 'PURPLE'
        ELSE controlling_faction
    END,
    last_capture_at = CASE
        WHEN (
            red_influence > purple_influence + 10
            AND controlling_faction != 'RED'
        )
        OR (
            purple_influence > red_influence + 10
            AND controlling_faction != 'PURPLE'
        ) THEN NOW()
        ELSE last_capture_at
    END
WHERE streamer_id = p_streamer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
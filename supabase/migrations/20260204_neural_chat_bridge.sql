-- 1. Faction Chat Table (The "Social Bridge")
CREATE TABLE IF NOT EXISTS faction_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faction_id TEXT NOT NULL,
    -- 'RED' or 'PURPLE'
    sender_id UUID,
    -- NULL for System/AI Dispatch
    sender_name TEXT NOT NULL,
    -- Display name (e.g. "Resistance Dispatch")
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'USER',
    -- 'USER', 'DISPATCH', 'STREAMER'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb -- For linking to specific sectors/battles
);
-- Enable RLS for Chat
ALTER TABLE faction_chat ENABLE ROW LEVEL SECURITY;
-- Policy: Read access for members of the faction (Simplified for now to public/authenticated)
CREATE POLICY "Faction Read Access" ON faction_chat FOR
SELECT USING (true);
-- In prod, check auth.jwt() -> user_metadata -> faction
-- Policy: Insert access for authenticated users
CREATE POLICY "Faction Write Access" ON faction_chat FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Policy: Service Role can write (for Edge Functions)
-- (Implicitly true for service_role, but good to document)
-- 2. Sector Attacks Table (The "Trigger")
CREATE TABLE IF NOT EXISTS sector_attacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region_id TEXT NOT NULL,
    -- e.g. "sector-7"
    attacker_faction TEXT NOT NULL,
    -- 'RED' or 'PURPLE'
    attacker_id UUID,
    -- Link to user profile
    defender_faction TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'ACTIVE',
    -- 'ACTIVE', 'RESOLVED'
    intensity FLOAT DEFAULT 0.0 -- From Sonic Depth engine
);
-- Enable RLS for Attacks
ALTER TABLE sector_attacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Attacks Read" ON sector_attacks FOR
SELECT USING (true);
CREATE POLICY "Authenticated Attacks Insert" ON sector_attacks FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- 3. Webhook Setup Instruction (Constraint: Cannot be fully automated via SQL)
-- Go to Supabase Dashboard -> Database -> Webhooks
-- Create Webhook:
-- Name: "resistance-dispatch-trigger"
-- Table: public.sector_attacks
-- Event: INSERT
-- Type: HTTP Request
-- Method: POST
-- URL: [YOUR_SUPABASE_FUNCTION_URL]/resistance-dispatch
-- Header: Authorization: Bearer [SERVICE_ROLE_KEY]
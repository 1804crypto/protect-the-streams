-- Create Streamers Table
CREATE TABLE IF NOT EXISTS streamers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- { influence, chaos, charisma, rebellion }
    trait TEXT NOT NULL,
    visual_prompt TEXT,
    image TEXT NOT NULL,
    lore JSONB DEFAULT '{}'::jsonb,
    -- { statusLog, battle1, battle2, climax }
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Moves Table
CREATE TABLE IF NOT EXISTS moves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streamer_id TEXT NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    -- CHAOS, REBELLION, etc.
    power INTEGER NOT NULL,
    pp INTEGER NOT NULL,
    description TEXT,
    is_ultimate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Items Table
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    effect TEXT NOT NULL,
    -- heal, restorePP, etc.
    value NUMERIC NOT NULL,
    rarity TEXT DEFAULT 'common',
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable Row Level Security (RLS)
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- Create Policies (Public Read, Admin Write)
CREATE POLICY "Public Streamers Read" ON streamers FOR
SELECT USING (true);
CREATE POLICY "Public Moves Read" ON moves FOR
SELECT USING (true);
CREATE POLICY "Public Items Read" ON items FOR
SELECT USING (true);
-- For development/seeding, we might want to allow insert/update if authenticated as service role
-- Note: Service role bypasses RLS, so we don't strictly need a policy for it, 
-- but if using the client with a specific user, we would.
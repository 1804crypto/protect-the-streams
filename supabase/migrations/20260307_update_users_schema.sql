-- Run this script in your Supabase SQL Editor to add the missing columns to the `users` table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS faction TEXT DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
-- Optional: You can also ensure wallet_address is unique if it isn't already
-- ALTER TABLE public.users ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);
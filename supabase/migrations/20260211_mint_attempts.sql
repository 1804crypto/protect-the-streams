-- Migration: 20260211_mint_attempts.sql
-- Description: Idempotent minting. Tracks mint attempts to prevent duplicate NFTs.

CREATE TABLE IF NOT EXISTS public.mint_attempts (
    idempotency_key TEXT PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    streamer_id TEXT NOT NULL,
    asset_id TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mint_wallet_streamer
ON public.mint_attempts(user_wallet, streamer_id);

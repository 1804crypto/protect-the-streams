-- Migration: 20260328_mint_unique_constraint.sql
-- Prevents duplicate completed mints for the same wallet+streamer combo.
-- The application-level check can be bypassed by race conditions;
-- this DB constraint is the authoritative guard.

-- Partial unique index: only enforced for COMPLETED mints
-- (allows multiple PENDING/FAILED attempts for the same combo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mint_unique_completed
    ON public.mint_attempts (user_wallet, streamer_id)
    WHERE status = 'COMPLETED';

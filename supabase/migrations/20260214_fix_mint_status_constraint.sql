-- Migration: Fix mint_attempts CHECK constraint to include BUILT status
-- Run this on the LIVE Supabase database before deploying the code changes.
-- The API route writes status='BUILT' after building the transaction,
-- but the original constraint only allowed PENDING/COMPLETED/FAILED.
ALTER TABLE public.mint_attempts DROP CONSTRAINT IF EXISTS mint_attempts_status_check;
ALTER TABLE public.mint_attempts
ADD CONSTRAINT mint_attempts_status_check CHECK (
        status IN ('PENDING', 'BUILT', 'COMPLETED', 'FAILED')
    );
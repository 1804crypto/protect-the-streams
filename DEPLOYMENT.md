
# 🚀 Deployment & Migration Guide

To achieve a **10/10** deployment status ("Zero-Drift"), follow these steps to ensure your database schema matches the application logic.

## 1. Database Migrations (One-Time Setup)

The following SQL must be applied to your Supabase project's **SQL Editor**. 
This script fixes the PvP HP Initialization bug and ensures the `Initialize PvP Match` RPC is correct.

### 📋 Copy & Paste This Block:

```sql
-- Migration: 20260211_fix_pvp_hp_init.sql
-- Fixes hardcoded HP=100 issue in initialize_pvp_match function

CREATE OR REPLACE FUNCTION initialize_pvp_match(
  p_match_id UUID,
  p_attacker_id UUID,
  p_attacker_stats JSONB,
  p_defender_id UUID,
  p_defender_stats JSONB,
  p_wager_amount NUMERIC
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attacker_hp INTEGER;
  v_defender_hp INTEGER;
  v_match_id UUID;
BEGIN
  -- 1. Extract HP from stats or default to calculated max
  -- Fix: Use the 'hp' or 'maxHp' field from the stats JSON, fallback to 100
  v_attacker_hp := COALESCE((p_attacker_stats->>'hp')::INTEGER, (p_attacker_stats->>'maxHp')::INTEGER, 100);
  v_defender_hp := COALESCE((p_defender_stats->>'hp')::INTEGER, (p_defender_stats->>'maxHp')::INTEGER, 100);

  -- 2. Create the match record
  INSERT INTO pvp_matches (
    id,
    attacker_id,
    defender_id,
    attacker_hp,
    defender_hp,
    attacker_stats,
    defender_stats,
    wager_amount,
    status,
    last_update
  ) VALUES (
    p_match_id,
    p_attacker_id,
    p_defender_id,
    v_attacker_hp,
    v_defender_hp,
    p_attacker_stats,
    p_defender_stats,
    p_wager_amount,
    'ACTIVE',
    NOW()
  )
  RETURNING id INTO v_match_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'attacker_hp', v_attacker_hp,
    'defender_hp', v_defender_hp
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

## 2. Verify Deployment

Run the application and check the **Console Logs**.
The new `Logger` system will output `[SYSTEM] PvPBattle: Connected` if all hooks are functioning correctly.

## 3. Environment Variables
Ensure these are set in Netlify/Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `NEXT_PUBLIC_COLLECTION_ADDRESS` (for Minting)

---
**Status:** READY FOR PRODUCTION
**Version:** v4.1 (Monolith Split)

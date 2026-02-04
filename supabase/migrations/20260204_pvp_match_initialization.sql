-- Migration: 20260204_pvp_match_initialization.sql
-- Description: Atomic PVP Match Initialization with Upfront Wager Deduction
CREATE OR REPLACE FUNCTION public.initialize_pvp_match(
        p_match_id TEXT,
        p_defender_id TEXT,
        p_wager_amount INTEGER,
        p_attacker_stats JSONB,
        p_defender_stats JSONB
    ) RETURNS JSONB AS $$
DECLARE v_attacker_id UUID := auth.uid();
v_attacker_balance INTEGER;
v_defender_balance INTEGER;
v_defender_uuid UUID;
BEGIN -- 1. Validate Input
IF v_attacker_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
END IF;
-- Attempt to cast defender_id to UUID (required for wagering)
BEGIN v_defender_uuid := p_defender_id::UUID;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_DEFENDER_ID');
END;
-- 2. Get Balances with Row Locking to prevent double-spend
SELECT pts_balance INTO v_attacker_balance
FROM public.users
WHERE id = v_attacker_id FOR
UPDATE;
SELECT pts_balance INTO v_defender_balance
FROM public.users
WHERE id = v_defender_uuid FOR
UPDATE;
-- 3. Verify Funds
IF v_attacker_balance < p_wager_amount THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'ATTACKER_INSUFFICIENT_FUNDS'
);
END IF;
IF v_defender_balance < p_wager_amount THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'DEFENDER_INSUFFICIENT_FUNDS'
);
END IF;
-- 4. Deduct Wagers
UPDATE public.users
SET pts_balance = pts_balance - p_wager_amount
WHERE id = v_attacker_id;
UPDATE public.users
SET pts_balance = pts_balance - p_wager_amount
WHERE id = v_defender_uuid;
-- 5. Create Match Record
INSERT INTO public.pvp_matches (
        id,
        attacker_id,
        defender_id,
        attacker_hp,
        defender_hp,
        attacker_stats,
        defender_stats,
        status,
        wager_amount,
        turn_player_id,
        last_update
    )
VALUES (
        p_match_id,
        v_attacker_id::TEXT,
        p_defender_id,
        100,
        -- Default Start HP
        100,
        p_attacker_stats,
        p_defender_stats,
        'ACTIVE',
        p_wager_amount,
        v_attacker_id::TEXT,
        -- Attacker starts
        NOW()
    );
RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
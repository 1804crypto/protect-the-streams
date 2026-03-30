-- Migration: 20260328_consolidated_pvp_fix.sql
-- Consolidates PvP fixes:
-- 1. initialize_pvp_match: Uses stats-based HP (not hardcoded 100)
-- 2. validate_pvp_move: Ensures GLR + wager payouts on match completion
--
-- Both functions are CREATE OR REPLACE so they safely overwrite any prior version.

-- ============================================================
-- 1. FIX: initialize_pvp_match — Dynamic HP from stats
-- ============================================================
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
BEGIN
-- 1. Validate Input
IF v_attacker_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
END IF;

-- Attempt to cast defender_id to UUID
BEGIN
    v_defender_uuid := p_defender_id::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_DEFENDER_ID');
END;

-- 2. Get Balances with Row Locking to prevent double-spend
SELECT pts_balance INTO v_attacker_balance
FROM public.users WHERE id = v_attacker_id FOR UPDATE;

SELECT pts_balance INTO v_defender_balance
FROM public.users WHERE id = v_defender_uuid FOR UPDATE;

-- 3. Verify Funds
IF v_attacker_balance < p_wager_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'ATTACKER_INSUFFICIENT_FUNDS');
END IF;
IF v_defender_balance < p_wager_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'DEFENDER_INSUFFICIENT_FUNDS');
END IF;

-- 4. Deduct Wagers
UPDATE public.users SET pts_balance = pts_balance - p_wager_amount WHERE id = v_attacker_id;
UPDATE public.users SET pts_balance = pts_balance - p_wager_amount WHERE id = v_defender_uuid;

-- 5. Create Match Record with DYNAMIC HP from stats (not hardcoded 100)
INSERT INTO public.pvp_matches (
    id, attacker_id, defender_id,
    attacker_hp, defender_hp,
    attacker_stats, defender_stats,
    status, wager_amount, turn_player_id, last_update
) VALUES (
    p_match_id,
    v_attacker_id::TEXT,
    p_defender_id,
    COALESCE((p_attacker_stats->>'hp')::INTEGER, 100),
    COALESCE((p_defender_stats->>'hp')::INTEGER, 100),
    p_attacker_stats,
    p_defender_stats,
    'ACTIVE',
    p_wager_amount,
    v_attacker_id::TEXT,
    NOW()
);

RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. FIX: validate_pvp_move — GLR points + wager payouts
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_pvp_move(
        p_match_id TEXT,
        p_sender_id TEXT,
        p_move_name TEXT,
        p_move_type TEXT,
        p_move_power INTEGER
    ) RETURNS JSONB AS $$
DECLARE v_match RECORD;
v_damage INTEGER;
v_effectiveness NUMERIC := 1.0;
v_is_crit BOOLEAN;
v_attacker_stat_value INTEGER;
v_stat_key TEXT;
v_target_hp_column TEXT;
v_attacker_stats JSONB;
v_defender_stats JSONB;
v_next_hp INTEGER;
v_is_complete BOOLEAN;
v_defender_type TEXT;
v_defender_id TEXT;
v_inf INTEGER;
v_cha INTEGER;
v_chr INTEGER;
v_reb INTEGER;
v_max_val INTEGER;
v_glr_gain INTEGER := 25;
v_glr_loss INTEGER := 15;
BEGIN
-- 1. Fetch Match State with Row Level Locking
SELECT * INTO v_match FROM public.pvp_matches WHERE id = p_match_id FOR UPDATE;

IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'MATCH_NOT_FOUND');
END IF;
IF v_match.status != 'ACTIVE' THEN
    RETURN jsonb_build_object('error', 'MATCH_ALREADY_FINISHED');
END IF;

-- 2. Validate Turn
IF v_match.turn_player_id IS NOT NULL AND v_match.turn_player_id != p_sender_id THEN
    RETURN jsonb_build_object('error', 'NOT_YOUR_TURN');
END IF;

-- 3. Determine Roles
IF v_match.attacker_id = p_sender_id THEN
    v_attacker_stats := v_match.attacker_stats;
    v_defender_stats := v_match.defender_stats;
    v_defender_id := v_match.defender_id;
    v_target_hp_column := 'defender_hp';
ELSIF v_match.defender_id = p_sender_id THEN
    v_attacker_stats := v_match.defender_stats;
    v_defender_stats := v_match.attacker_stats;
    v_defender_id := v_match.attacker_id;
    v_target_hp_column := 'attacker_hp';
ELSE
    RETURN jsonb_build_object('error', 'NOT_A_PLAYER_IN_THIS_MATCH');
END IF;

-- 4. Calculate Defender Type from stats
v_inf := COALESCE((v_defender_stats->>'influence')::INTEGER, 50);
v_cha := COALESCE((v_defender_stats->>'chaos')::INTEGER, 50);
v_chr := COALESCE((v_defender_stats->>'charisma')::INTEGER, 50);
v_reb := COALESCE((v_defender_stats->>'rebellion')::INTEGER, 50);

v_max_val := v_cha;
v_defender_type := 'CHAOS';
IF v_inf > v_max_val THEN v_max_val := v_inf; v_defender_type := 'INTEL'; END IF;
IF v_chr > v_max_val THEN v_max_val := v_chr; v_defender_type := 'CHARISMA'; END IF;
IF v_reb > v_max_val THEN v_max_val := v_reb; v_defender_type := 'REBELLION'; END IF;

-- 5. Type Matchup Logic
IF p_move_type = 'CHAOS' AND v_defender_type = 'INTEL' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'INTEL' AND v_defender_type = 'DISRUPT' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'DISRUPT' AND v_defender_type = 'CHARISMA' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'CHARISMA' AND v_defender_type = 'REBELLION' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'REBELLION' AND v_defender_type = 'CHAOS' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'INTEL' AND v_defender_type = 'CHAOS' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'DISRUPT' AND v_defender_type = 'INTEL' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'CHARISMA' AND v_defender_type = 'DISRUPT' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'REBELLION' AND v_defender_type = 'CHARISMA' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'CHAOS' AND v_defender_type = 'REBELLION' THEN v_effectiveness := 0.5;
END IF;

-- 6. Damage Calculation
v_stat_key := CASE
    WHEN p_move_type = 'INTEL' THEN 'influence'
    WHEN p_move_type = 'CHARISMA' THEN 'charisma'
    WHEN p_move_type = 'REBELLION' THEN 'rebellion'
    ELSE 'chaos'
END;
v_attacker_stat_value := COALESCE((v_attacker_stats->>v_stat_key)::INTEGER, 50);
v_is_crit := (random() < 0.10);
v_damage := (p_move_power * (v_attacker_stat_value::NUMERIC / 100.0) * (0.9 + random() * 0.2) * v_effectiveness)::INTEGER;
IF v_is_crit THEN v_damage := (v_damage * 1.5)::INTEGER; END IF;
v_damage := GREATEST(1, v_damage);

-- 7. Update Match State
IF v_target_hp_column = 'defender_hp' THEN
    v_next_hp := GREATEST(0, v_match.defender_hp - v_damage);
    UPDATE public.pvp_matches SET defender_hp = v_next_hp, turn_player_id = v_defender_id, last_update = NOW() WHERE id = p_match_id;
ELSE
    v_next_hp := GREATEST(0, v_match.attacker_hp - v_damage);
    UPDATE public.pvp_matches SET attacker_hp = v_next_hp, turn_player_id = v_defender_id, last_update = NOW() WHERE id = p_match_id;
END IF;

v_is_complete := (v_next_hp <= 0);

-- 8. Handle Completion — Award GLR + Wager Payouts
IF v_is_complete THEN
    UPDATE public.pvp_matches SET status = 'FINISHED', winner_id = p_sender_id WHERE id = p_match_id;

    -- Winner: +1 win, +GLR, +2x wager
    UPDATE public.users
    SET wins = wins + 1,
        glr_points = glr_points + v_glr_gain,
        pts_balance = pts_balance + (v_match.wager_amount * 2)
    WHERE id::TEXT = p_sender_id;

    -- Loser: +1 loss, -GLR (floor 0)
    UPDATE public.users
    SET losses = losses + 1,
        glr_points = GREATEST(0, glr_points - v_glr_loss)
    WHERE id::TEXT = v_defender_id;
END IF;

RETURN jsonb_build_object(
    'damage', v_damage,
    'effectiveness', v_effectiveness,
    'is_crit', v_is_crit,
    'next_hp', v_next_hp,
    'is_complete', v_is_complete,
    'turn_player_id', CASE WHEN v_is_complete THEN NULL ELSE v_defender_id END,
    'glr_change', CASE WHEN v_is_complete THEN v_glr_gain ELSE 0 END
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. NEW: refund_pvp_wager — Safely refund wagers on failed match init
-- ============================================================
CREATE OR REPLACE FUNCTION public.refund_pvp_wager(
    p_player_id TEXT,
    p_opponent_id TEXT,
    p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_player_uuid UUID;
    v_opponent_uuid UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;

    BEGIN
        v_player_uuid := p_player_id::UUID;
        v_opponent_uuid := p_opponent_id::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', 'INVALID_UUID');
    END;

    -- Refund both players
    UPDATE public.users SET pts_balance = pts_balance + p_amount WHERE id = v_player_uuid;
    UPDATE public.users SET pts_balance = pts_balance + p_amount WHERE id = v_opponent_uuid;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

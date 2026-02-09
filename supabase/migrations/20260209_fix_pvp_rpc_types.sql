-- Migration: 20260209_fix_pvp_rpc_types.sql
-- Description: Fixes type mismatch (UUID vs TEXT) in PvP RPC functions causing 400 errors.
-- 1. FIX: initialize_pvp_match
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
v_match_uuid UUID;
BEGIN -- 1. Validate Input
IF v_attacker_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
END IF;
-- Attempt to cast IDs to UUID
BEGIN v_defender_uuid := p_defender_id::UUID;
v_match_uuid := p_match_id::UUID;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_UUID_FORMAT');
END;
-- 2. Get Balances with Row Locking
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
-- 5. Create Match Record (Explicit UUID Cast)
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
        v_match_uuid,
        v_attacker_id::TEXT,
        -- Keep as TEXT if column is TEXT (based on previous schema)
        p_defender_id,
        100,
        100,
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
-- 2. FIX: validate_pvp_move
CREATE OR REPLACE FUNCTION public.validate_pvp_move(
        p_match_id TEXT,
        p_sender_id TEXT,
        p_move_name TEXT,
        p_move_type TEXT,
        p_move_power INTEGER
    ) RETURNS JSONB AS $$
DECLARE v_match RECORD;
v_match_uuid UUID;
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
BEGIN -- Cast match ID first
BEGIN v_match_uuid := p_match_id::UUID;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('error', 'INVALID_MATCH_UUID');
END;
-- 1. Fetch Match State with Row Level Locking
SELECT * INTO v_match
FROM public.pvp_matches
WHERE id = v_match_uuid FOR
UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('error', 'MATCH_NOT_FOUND');
END IF;
IF v_match.status != 'ACTIVE' THEN RETURN jsonb_build_object('error', 'MATCH_ALREADY_FINISHED');
END IF;
-- 2. Validate Turn
IF v_match.turn_player_id IS NOT NULL
AND v_match.turn_player_id != p_sender_id THEN RETURN jsonb_build_object('error', 'NOT_YOUR_TURN');
END IF;
-- 3. Determine Roles
IF v_match.attacker_id = p_sender_id THEN v_attacker_stats := v_match.attacker_stats;
v_defender_stats := v_match.defender_stats;
v_defender_id := v_match.defender_id;
v_target_hp_column := 'defender_hp';
ELSIF v_match.defender_id = p_sender_id THEN v_attacker_stats := v_match.defender_stats;
v_defender_stats := v_match.attacker_stats;
v_defender_id := v_match.attacker_id;
v_target_hp_column := 'attacker_hp';
ELSE RETURN jsonb_build_object('error', 'NOT_A_PLAYER_IN_THIS_MATCH');
END IF;
-- 4. Calculate Logic (Same as before)
v_inf := COALESCE((v_defender_stats->>'influence')::INTEGER, 50);
v_cha := COALESCE((v_defender_stats->>'chaos')::INTEGER, 50);
v_chr := COALESCE((v_defender_stats->>'charisma')::INTEGER, 50);
v_reb := COALESCE((v_defender_stats->>'rebellion')::INTEGER, 50);
v_max_val := v_cha;
v_defender_type := 'CHAOS';
IF v_inf > v_max_val THEN v_max_val := v_inf;
v_defender_type := 'INTEL';
END IF;
IF v_chr > v_max_val THEN v_max_val := v_chr;
v_defender_type := 'CHARISMA';
END IF;
IF v_reb > v_max_val THEN v_max_val := v_reb;
v_defender_type := 'REBELLION';
END IF;
-- Type Matchup Logic
IF p_move_type = 'CHAOS'
AND v_defender_type = 'INTEL' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'INTEL'
AND v_defender_type = 'DISRUPT' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'DISRUPT'
AND v_defender_type = 'CHARISMA' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'CHARISMA'
AND v_defender_type = 'REBELLION' THEN v_effectiveness := 1.5;
ELSIF p_move_type = 'REBELLION'
AND v_defender_type = 'CHAOS' THEN v_effectiveness := 1.5;
-- Weaknesses
ELSIF p_move_type = 'INTEL'
AND v_defender_type = 'CHAOS' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'DISRUPT'
AND v_defender_type = 'INTEL' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'CHARISMA'
AND v_defender_type = 'DISRUPT' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'REBELLION'
AND v_defender_type = 'CHARISMA' THEN v_effectiveness := 0.5;
ELSIF p_move_type = 'CHAOS'
AND v_defender_type = 'REBELLION' THEN v_effectiveness := 0.5;
END IF;
v_stat_key := CASE
    WHEN p_move_type = 'INTEL' THEN 'influence'
    WHEN p_move_type = 'CHARISMA' THEN 'charisma'
    WHEN p_move_type = 'REBELLION' THEN 'rebellion'
    ELSE 'chaos'
END;
v_attacker_stat_value := COALESCE((v_attacker_stats->>v_stat_key)::INTEGER, 50);
v_is_crit := (random() < 0.10);
v_damage := (
    p_move_power * (v_attacker_stat_value::NUMERIC / 100.0) * (0.9 + random() * 0.2) * v_effectiveness
)::INTEGER;
IF v_is_crit THEN v_damage := (v_damage * 1.5)::INTEGER;
END IF;
v_damage := GREATEST(1, v_damage);
-- 6. Update Match State
IF v_target_hp_column = 'defender_hp' THEN v_next_hp := GREATEST(0, v_match.defender_hp - v_damage);
UPDATE public.pvp_matches
SET defender_hp = v_next_hp,
    turn_player_id = v_defender_id,
    last_update = NOW()
WHERE id = v_match_uuid;
ELSE v_next_hp := GREATEST(0, v_match.attacker_hp - v_damage);
UPDATE public.pvp_matches
SET attacker_hp = v_next_hp,
    turn_player_id = v_defender_id,
    last_update = NOW()
WHERE id = v_match_uuid;
END IF;
v_is_complete := (v_next_hp <= 0);
-- 7. Handle Completion
IF v_is_complete THEN
UPDATE public.pvp_matches
SET status = 'FINISHED',
    winner_id = p_sender_id
WHERE id = v_match_uuid;
-- Update Winner
UPDATE public.users
SET wins = wins + 1,
    glr_points = glr_points + v_glr_gain,
    pts_balance = pts_balance + (v_match.wager_amount * 2)
WHERE id::TEXT = p_sender_id;
-- Update Loser
UPDATE public.users
SET losses = losses + 1,
    glr_points = GREATEST(0, glr_points - v_glr_loss)
WHERE id::TEXT = v_defender_id;
END IF;
RETURN jsonb_build_object(
    'damage',
    v_damage,
    'effectiveness',
    v_effectiveness,
    'is_crit',
    v_is_crit,
    'next_hp',
    v_next_hp,
    'is_complete',
    v_is_complete,
    'turn_player_id',
    CASE
        WHEN v_is_complete THEN NULL
        ELSE v_defender_id
    END,
    'glr_change',
    CASE
        WHEN v_is_complete THEN v_glr_gain
        ELSE 0
    END
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
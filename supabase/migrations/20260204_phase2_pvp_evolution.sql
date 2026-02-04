-- Phase 2 Evolution: Competitive Ranking and $PTS Wagering
-- 1. Update Users with GLR (Global Liberation Ranking) and PTS Cache
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS glr_points INTEGER DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS pts_balance INTEGER DEFAULT 0;
-- Index for Leaderboard
CREATE INDEX IF NOT EXISTS users_glr_points_idx ON public.users(glr_points DESC);
-- 2. Update PvP Matches with Wagering Fields
ALTER TABLE public.pvp_matches
ADD COLUMN IF NOT EXISTS wager_amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_wager_paid_attacker BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_wager_paid_defender BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wager_tx_sig_attacker TEXT,
    ADD COLUMN IF NOT EXISTS wager_tx_sig_defender TEXT;
-- 3. Create Global Liberation Ranking (GLR) View
CREATE OR REPLACE VIEW public.leaderboard_glr AS
SELECT id,
    username,
    wallet_address,
    glr_points,
    wins,
    losses,
    faction,
    level,
    RANK() OVER (
        ORDER BY glr_points DESC
    ) as global_rank
FROM public.users
WHERE username IS NOT NULL
ORDER BY glr_points DESC;
-- 4. Update the PvP Move RPC to include GLR adjustments
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
BEGIN -- 1. Fetch Match State with Row Level Locking
SELECT * INTO v_match
FROM public.pvp_matches
WHERE id = p_match_id FOR
UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('error', 'MATCH_NOT_FOUND');
END IF;
IF v_match.status != 'ACTIVE' THEN RETURN jsonb_build_object('error', 'MATCH_ALREADY_FINISHED');
END IF;
-- 2. Validate Turn (If turn_player_id is set)
IF v_match.turn_player_id IS NOT NULL
AND v_match.turn_player_id != p_sender_id THEN RETURN jsonb_build_object('error', 'NOT_YOUR_TURN');
END IF;
-- 3. Determine Attacker/Defender Roles
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
-- 4. Calculate Type Effectiveness
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
-- 5. Calculate Damage
v_stat_key := CASE
    WHEN p_move_type = 'INTEL' THEN 'influence'
    WHEN p_move_type = 'CHARISMA' THEN 'charisma'
    WHEN p_move_type = 'REBELLION' THEN 'rebellion'
    WHEN p_move_type = 'CHAOS' THEN 'chaos'
    WHEN p_move_type = 'DISRUPT' THEN 'chaos'
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
-- 6. Update Match State & Switch Turn
IF v_target_hp_column = 'defender_hp' THEN v_next_hp := GREATEST(0, v_match.defender_hp - v_damage);
UPDATE public.pvp_matches
SET defender_hp = v_next_hp,
    turn_player_id = v_defender_id,
    last_update = NOW()
WHERE id = p_match_id;
ELSE v_next_hp := GREATEST(0, v_match.attacker_hp - v_damage);
UPDATE public.pvp_matches
SET attacker_hp = v_next_hp,
    turn_player_id = v_defender_id,
    last_update = NOW()
WHERE id = p_match_id;
END IF;
v_is_complete := (v_next_hp <= 0);
-- 7. Handle Completion (with GLR and PTS updates)
IF v_is_complete THEN
UPDATE public.pvp_matches
SET status = 'FINISHED',
    winner_id = p_sender_id
WHERE id = p_match_id;
-- Update Winner (+GLR, +2x Wager if applicable)
UPDATE public.users
SET wins = wins + 1,
    glr_points = glr_points + v_glr_gain,
    pts_balance = pts_balance + (v_match.wager_amount * 2)
WHERE id::TEXT = p_sender_id;
-- Update Loser (+Loss, -GLR)
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
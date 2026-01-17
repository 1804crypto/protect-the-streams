-- Update users table with PvP and collection fields
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS secured_ids TEXT [] DEFAULT '{}';
-- Create PvP Move Validation RPC (Authoritative)
CREATE OR REPLACE FUNCTION public.validate_pvp_move(
        p_match_id TEXT,
        p_sender_id TEXT,
        p_move_name TEXT,
        p_move_type TEXT,
        p_move_power INTEGER
    ) RETURNS JSONB AS $$
DECLARE v_match RECORD;
v_damage INTEGER;
v_effectiveness NUMERIC;
v_is_crit BOOLEAN;
v_attacker_stat_value INTEGER;
v_stat_key TEXT;
v_target_hp_column TEXT;
v_attacker_stats JSONB;
v_next_hp INTEGER;
v_is_complete BOOLEAN;
BEGIN -- 1. Fetch Match State with Row Level Locking
SELECT * INTO v_match
FROM public.pvp_matches
WHERE id = p_match_id FOR
UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('error', 'MATCH_NOT_FOUND');
END IF;
IF v_match.status != 'ACTIVE' THEN RETURN jsonb_build_object('error', 'MATCH_ALREADY_FINISHED');
END IF;
-- 2. Validate Turn (Only if turn_player_id is assigned)
IF v_match.turn_player_id IS NOT NULL
AND v_match.turn_player_id != p_sender_id THEN RETURN jsonb_build_object('error', 'NOT_YOUR_TURN');
END IF;
-- 3. Determine Attacker/Defender Roles
IF v_match.attacker_id = p_sender_id THEN v_attacker_stats := v_match.attacker_stats;
v_target_hp_column := 'defender_hp';
ELSE v_attacker_stats := v_match.defender_stats;
v_target_hp_column := 'attacker_hp';
END IF;
-- 4. Calculate Damage (Server-Side Formula)
v_stat_key := LOWER(p_move_type);
v_attacker_stat_value := (v_attacker_stats->>v_stat_key)::INTEGER;
IF v_attacker_stat_value IS NULL THEN v_attacker_stat_value := 50;
END IF;
v_is_crit := (random() < 0.10);
v_effectiveness := 1.0;
-- Placeholder for type chart logic
v_damage := (
    p_move_power * (v_attacker_stat_value::NUMERIC / 100.0) * (0.9 + random() * 0.2) * v_effectiveness
)::INTEGER;
IF v_is_crit THEN v_damage := (v_damage * 1.5)::INTEGER;
END IF;
v_damage := GREATEST(1, v_damage);
-- 5. Update Match State & Switch Turn
IF v_target_hp_column = 'defender_hp' THEN v_next_hp := GREATEST(0, v_match.defender_hp - v_damage);
UPDATE public.pvp_matches
SET defender_hp = v_next_hp,
    turn_player_id = v_match.defender_id,
    last_update = NOW()
WHERE id = p_match_id;
ELSE v_next_hp := GREATEST(0, v_match.attacker_hp - v_damage);
UPDATE public.pvp_matches
SET attacker_hp = v_next_hp,
    turn_player_id = v_match.attacker_id,
    last_update = NOW()
WHERE id = p_match_id;
END IF;
v_is_complete := (v_next_hp <= 0);
-- 6. Handle Completion
IF v_is_complete THEN
UPDATE public.pvp_matches
SET status = 'FINISHED',
    winner_id = p_sender_id
WHERE id = p_match_id;
-- Authoritative Stats Update for known users
UPDATE public.users
SET wins = wins + 1
WHERE id::TEXT = p_sender_id;
UPDATE public.users
SET losses = losses + 1
WHERE id::TEXT = (
        CASE
            WHEN v_match.attacker_id = p_sender_id THEN v_match.defender_id
            ELSE v_match.attacker_id
        END
    );
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
    v_is_complete
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
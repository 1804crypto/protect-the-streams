-- Migration: 20260211_check_turn_timeout.sql
-- Description: Server-authoritative turn timeout. If a player hasn't acted within 60 seconds,
-- the opponent can claim the turn via RPC. This replaces the client-side 45s watchdog.

CREATE OR REPLACE FUNCTION public.check_turn_timeout(
    p_match_id TEXT,
    p_claimer_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_match RECORD;
    v_match_uuid UUID;
    v_seconds_elapsed NUMERIC;
BEGIN
    -- Cast match ID
    BEGIN
        v_match_uuid := p_match_id::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object('error', 'INVALID_MATCH_UUID');
    END;

    -- Fetch match with row lock
    SELECT * INTO v_match
    FROM public.pvp_matches
    WHERE id = v_match_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'MATCH_NOT_FOUND');
    END IF;

    -- If match already finished, return current state
    IF v_match.status = 'FINISHED' THEN
        RETURN jsonb_build_object(
            'timed_out', false,
            'match_status', 'FINISHED',
            'winner_id', v_match.winner_id,
            'attacker_hp', v_match.attacker_hp,
            'defender_hp', v_match.defender_hp
        );
    END IF;

    -- Verify claimer is a participant
    IF v_match.attacker_id != p_claimer_id AND v_match.defender_id != p_claimer_id THEN
        RETURN jsonb_build_object('error', 'NOT_A_PLAYER_IN_THIS_MATCH');
    END IF;

    -- If it's already the claimer's turn, no timeout needed
    IF v_match.turn_player_id = p_claimer_id THEN
        RETURN jsonb_build_object(
            'timed_out', false,
            'match_status', 'ACTIVE',
            'new_turn_player_id', p_claimer_id,
            'attacker_hp', v_match.attacker_hp,
            'defender_hp', v_match.defender_hp,
            'seconds_elapsed', 0
        );
    END IF;

    -- Calculate seconds since last update
    v_seconds_elapsed := EXTRACT(EPOCH FROM (NOW() - v_match.last_update));

    -- If 60+ seconds have passed, skip the opponent's turn
    IF v_seconds_elapsed >= 60 THEN
        UPDATE public.pvp_matches
        SET turn_player_id = p_claimer_id,
            last_update = NOW()
        WHERE id = v_match_uuid;

        RETURN jsonb_build_object(
            'timed_out', true,
            'match_status', 'ACTIVE',
            'new_turn_player_id', p_claimer_id,
            'attacker_hp', v_match.attacker_hp,
            'defender_hp', v_match.defender_hp,
            'seconds_elapsed', v_seconds_elapsed
        );
    END IF;

    -- Not yet timed out
    RETURN jsonb_build_object(
        'timed_out', false,
        'match_status', 'ACTIVE',
        'new_turn_player_id', v_match.turn_player_id,
        'attacker_hp', v_match.attacker_hp,
        'defender_hp', v_match.defender_hp,
        'seconds_waited', v_seconds_elapsed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

import { describe, it, expect } from 'vitest';
import type { CheckTurnTimeoutResult } from '@/types/pvp';

/**
 * Tests for check_turn_timeout RPC response handling logic.
 * The actual RPC runs in Supabase — these tests verify the client-side
 * state resolution from the RPC response.
 */

function resolveTimeoutResult(
    result: CheckTurnTimeoutResult,
    playerId: string,
    isAttacker: boolean
): {
    shouldSetTurn: boolean;
    isFinished: boolean;
    myHp: number;
    oppHp: number;
    winnerId: string | null;
} {
    if (result.match_status === 'FINISHED') {
        return {
            shouldSetTurn: false,
            isFinished: true,
            myHp: isAttacker ? result.attacker_hp : result.defender_hp,
            oppHp: isAttacker ? result.defender_hp : result.attacker_hp,
            winnerId: result.winner_id ?? null,
        };
    }

    const shouldSetTurn = result.new_turn_player_id === playerId;

    return {
        shouldSetTurn,
        isFinished: false,
        myHp: isAttacker ? result.attacker_hp : result.defender_hp,
        oppHp: isAttacker ? result.defender_hp : result.attacker_hp,
        winnerId: null,
    };
}

describe('check_turn_timeout resolution', () => {
    const PLAYER_ID = 'player-1';
    const OPPONENT_ID = 'player-2';

    it('returns shouldSetTurn=true when timed_out is true', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: true,
            match_status: 'ACTIVE',
            new_turn_player_id: PLAYER_ID,
            attacker_hp: 80,
            defender_hp: 60,
            seconds_elapsed: 65,
        };

        const resolved = resolveTimeoutResult(result, PLAYER_ID, true);
        expect(resolved.shouldSetTurn).toBe(true);
        expect(resolved.isFinished).toBe(false);
        expect(resolved.myHp).toBe(80);
        expect(resolved.oppHp).toBe(60);
    });

    it('returns shouldSetTurn=false when still waiting', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: false,
            match_status: 'ACTIVE',
            new_turn_player_id: OPPONENT_ID,
            attacker_hp: 80,
            defender_hp: 60,
            seconds_waited: 10,
        };

        const resolved = resolveTimeoutResult(result, PLAYER_ID, true);
        expect(resolved.shouldSetTurn).toBe(false);
        expect(resolved.isFinished).toBe(false);
    });

    it('handles FINISHED match status', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: false,
            match_status: 'FINISHED',
            attacker_hp: 0,
            defender_hp: 45,
            winner_id: OPPONENT_ID,
        };

        const resolved = resolveTimeoutResult(result, PLAYER_ID, true);
        expect(resolved.isFinished).toBe(true);
        expect(resolved.winnerId).toBe(OPPONENT_ID);
        expect(resolved.shouldSetTurn).toBe(false);
        expect(resolved.myHp).toBe(0);
        expect(resolved.oppHp).toBe(45);
    });

    it('correctly resolves HP for defender player', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: true,
            match_status: 'ACTIVE',
            new_turn_player_id: PLAYER_ID,
            attacker_hp: 80,
            defender_hp: 60,
            seconds_elapsed: 70,
        };

        // Player is DEFENDER
        const resolved = resolveTimeoutResult(result, PLAYER_ID, false);
        expect(resolved.myHp).toBe(60);
        expect(resolved.oppHp).toBe(80);
    });

    it('handles already-your-turn response', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: false,
            match_status: 'ACTIVE',
            new_turn_player_id: PLAYER_ID,
            attacker_hp: 100,
            defender_hp: 100,
            seconds_elapsed: 0,
        };

        const resolved = resolveTimeoutResult(result, PLAYER_ID, true);
        expect(resolved.shouldSetTurn).toBe(true);
        expect(resolved.isFinished).toBe(false);
    });

    it('handles missing winner_id in FINISHED match', () => {
        const result: CheckTurnTimeoutResult = {
            timed_out: false,
            match_status: 'FINISHED',
            attacker_hp: 0,
            defender_hp: 0,
        };

        const resolved = resolveTimeoutResult(result, PLAYER_ID, true);
        expect(resolved.winnerId).toBeNull();
    });
});

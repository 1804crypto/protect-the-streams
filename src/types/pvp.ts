import { MoveType } from '@/data/typeChart';
import { StreamerStats } from '@/data/streamers';

export interface PvPPlayerState {
    id: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: StreamerStats;
    streamerId: string;
    image?: string;
}

/** Payload broadcast over Supabase realtime ACTION event */
export interface PvPActionPayload {
    type: 'MOVE' | 'CHAT' | 'RECOVERY_REQUEST' | 'RECOVERY_RESPONSE';
    senderId: string;
    // MOVE fields
    moveName?: string;
    moveType?: MoveType;
    damage?: number;
    effectiveness?: number;
    crit?: boolean;
    // CHAT fields
    message?: string;
    timestamp?: number;
    // RECOVERY_RESPONSE fields
    myHp?: number;
    oppHp?: number;
    isTurn?: boolean;
}

/** Payload broadcast over Supabase realtime SYNC event */
export interface PvPSyncPayload {
    senderId: string;
    streamerId: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: StreamerStats;
    image?: string;
}

/** Shape returned by validate_pvp_move RPC */
export interface ValidateMoveResult {
    damage: number;
    effectiveness: number;
    is_crit: boolean;
    is_complete: boolean;
    next_hp: number;
    turn_player_id?: string | null;
    glr_change?: number;
    error?: string;
}

/** Shape returned by check_turn_timeout RPC */
export interface CheckTurnTimeoutResult {
    timed_out: boolean;
    new_turn_player_id?: string;
    match_status: string;
    attacker_hp: number;
    defender_hp: number;
    winner_id?: string;
    seconds_elapsed?: number;
    seconds_waited?: number;
    error?: string;
}

/** Row shape from pvp_matches table */
export interface PvPMatchRow {
    id: string;
    attacker_id: string;
    defender_id: string;
    attacker_hp: number;
    defender_hp: number;
    attacker_stats: StreamerStats & { name?: string; hp?: number; maxHp?: number };
    defender_stats: StreamerStats & { name?: string; hp?: number; maxHp?: number };
    turn_player_id: string | null;
    status: 'ACTIVE' | 'FINISHED';
    winner_id: string | null;
    wager_amount: number;
    last_update: string;
    created_at: string;
}

/** Presence state in matchmaking lobby */
export interface MatchmakingPresence {
    playerId: string;
    sessionId: string;
    streamerId: string;
    wager: number;
    stats: StreamerStats & { hp?: number };
    name: string;
    timestamp: number;
    status: 'SEARCHING' | 'MATCHED';
}

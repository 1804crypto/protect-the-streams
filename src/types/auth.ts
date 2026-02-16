import { NatureType } from '@/data/streamers';
import { MissionRecord } from '@/hooks/useCollectionStore';

/** JWT payload for session tokens */
export interface SessionPayload {
    userId: string;
    wallet: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}

/** Users table row shape from Supabase */
export interface UserRow {
    id: string;
    wallet_address: string;
    username: string | null;
    xp: number;
    level: number;
    inventory: Record<string, number>;
    is_banned: boolean;
    last_login: string;
    created_at: string;
    wins: number;
    losses: number;
    glr_points: number;
    pts_balance: number;
    secured_ids: string[];
    streamer_natures: Record<string, NatureType>;
    completed_missions: MissionRecord[];
    faction: 'RED' | 'PURPLE' | 'NONE';
    is_faction_minted: boolean;
    updated_at: string;
    equipment_slots: { weapon: string | null; armor: string | null; accessory: string | null };
}

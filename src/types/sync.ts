import { MissionRecord } from '@/hooks/useCollectionStore';
import { NatureType } from '@/data/streamers';

/** Request body for /api/player/sync */
export interface SyncRequest {
    deltaXp?: number;
    inventory?: Record<string, number>;
    missionId?: string;
    rank?: 'S' | 'A' | 'B' | 'F';
    duration?: number;
    deltaWins?: 0 | 1;
    deltaLosses?: 0 | 1;
    streamerNatures?: Record<string, NatureType>;
    completedMissions?: MissionRecord[];
    faction?: 'RED' | 'PURPLE' | 'NONE';
    isFactionMinted?: boolean;
}

/** Response from /api/player/sync */
export interface SyncResponse {
    success?: boolean;
    error?: string;
    newXp?: number;
    newLevel?: number;
    newPtsBalance?: number;
    ptsGained?: number;
}

/** Request body for /api/mission/complete */
export interface MissionCompleteRequest {
    missionId: string;
    hpRemaining: number;
    maxHp: number;
    turnsUsed: number;
    isBoss: boolean;
    duration: number;
}

/** Response from /api/mission/complete */
export interface MissionCompleteResponse {
    success: boolean;
    error?: string;
    rank: 'S' | 'A' | 'B' | 'F';
    xpGained: number;
    newXp: number;
    newLevel: number;
    ptsGained: number;
    newPtsBalance: number;
    itemsAwarded: string[];
    newInventory: Record<string, number>;
}

/** Request body for /api/shop/purchase */
export interface ShopPurchaseRequest {
    itemId: string;
    quantity: number;
    currency: 'PTS' | 'SOL' | 'USDC';
    purchaseId: string;
    txSignature?: string;
}

/** Response from /api/shop/purchase */
export interface ShopPurchaseResponse {
    success: boolean;
    error?: string;
    newInventory: Record<string, number>;
    newPtsBalance: number;
    purchaseId: string;
}

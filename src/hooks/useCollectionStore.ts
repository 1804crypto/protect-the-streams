"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STARTER_INVENTORY, getRewardItems } from '@/data/items';
import { NatureType, getRandomNature } from '@/data/streamers';
import { supabase } from '@/lib/supabaseClient';

export interface MissionRecord {
    id: string;
    rank: 'S' | 'A' | 'B' | 'F';
    clearedAt: number;
    xp: number;
    level: number;
}

export interface EquipmentSlots {
    weapon: string | null;
    armor: string | null;
    accessory: string | null;
}

interface CollectionState {
    securedIds: string[];
    completedMissions: MissionRecord[];
    inventory: Record<string, number>;
    difficultyMultiplier: number;
    streamerNatures: Record<string, NatureType>;
    totalResistanceScore: number;
    level: number; // Global Player Level
    userFaction: 'RED' | 'PURPLE' | 'NONE';
    isFactionMinted: boolean;
    activeMissionStart: number | null;
    lastMissionComplete: number | null; // Anti-Cheat: Track cooldown
    wins: number;
    losses: number;
    ptsBalance: number;
    unlockedNarratives: string[];
    equipmentSlots: EquipmentSlots;

    // Actions
    secureAsset: (_id: string) => void;
    addItem: (_itemId: string, _count?: number) => void;
    useItem: (_itemId: string) => boolean;
    equipItem: (_itemId: string, _slot: keyof EquipmentSlots) => void;
    unequipItem: (_slot: keyof EquipmentSlots) => void;
    updateDifficulty: (_mult: number) => void;
    updateResistanceScore: (_points: number) => void;
    setFaction: (_faction: 'RED' | 'PURPLE') => void;
    mintFactionCard: () => void;
    startMission: () => void; // Call when entering battle
    markMissionComplete: (_id: string, _rank?: 'S' | 'A' | 'B' | 'F', _xpGained?: number, _battleResult?: {
        hpRemaining: number; maxHp: number; turnsUsed: number; isBoss: boolean; duration: number;
    }) => void;
    syncFromCloud: (_userData: Partial<import('@/types/auth').UserRow>) => void;
    addWin: () => void;
    addLoss: () => void;
    refreshStats: () => Promise<void>;
    isAuthenticated: boolean;
    setAuthenticated: (_auth: boolean) => void;
}

// Internal Helper for Cloud Sync (with auto-retry + manual retry toast)
const MAX_SYNC_RETRIES = 2;

const syncStateToCloud = async (
    xpDelta: number,
    inventory: Record<string, number>,
    missionId?: string,
    rank?: string,
    duration?: number,
    set?: (partial: Partial<CollectionState> | ((state: CollectionState) => Partial<CollectionState>)) => void,
    additionalParams?: {
        deltaWins?: number,
        deltaLosses?: number,
        streamerNatures?: Record<string, NatureType>,
        completedMissions?: MissionRecord[],
        faction?: string,
        isFactionMinted?: boolean
    }
) => {
    const payload: Record<string, unknown> = {
        deltaXp: xpDelta,
        inventory: inventory
    };

    if (missionId) payload.missionId = missionId;
    if (rank) payload.rank = rank;
    if (duration) payload.duration = duration;
    if (additionalParams?.deltaWins !== undefined) payload.deltaWins = additionalParams.deltaWins;
    if (additionalParams?.deltaLosses !== undefined) payload.deltaLosses = additionalParams.deltaLosses;
    if (additionalParams?.streamerNatures !== undefined) payload.streamerNatures = additionalParams.streamerNatures;
    if (additionalParams?.completedMissions !== undefined) payload.completedMissions = additionalParams.completedMissions;
    if (additionalParams?.faction !== undefined) payload.faction = additionalParams.faction;
    if (additionalParams?.isFactionMinted !== undefined) payload.isFactionMinted = additionalParams.isFactionMinted;

    for (let attempt = 0; attempt <= MAX_SYNC_RETRIES; attempt++) {
        try {
            const res = await fetch('/api/player/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success && set) {
                set((state: CollectionState) => ({
                    totalResistanceScore: data.newXp,
                    level: data.newLevel,
                    ptsBalance: data.newPtsBalance !== undefined ? data.newPtsBalance : state.ptsBalance,
                    isAuthenticated: true
                }));
                console.log("Cloud Sync Verified. Level:", data.newLevel);
                return; // Success — exit retry loop
            } else if (data.error) {
                if (data.error === "Unauthorized" || res.status === 401) {
                    if (set) set({ isAuthenticated: false });
                    return; // Non-retryable
                }
                console.error("Cloud Sync Rejected:", data.error);
                // Rate limited — don't retry
                if (res.status === 429) return;
            }
        } catch (err) {
            console.error(`Cloud Sync Failed (attempt ${attempt + 1}/${MAX_SYNC_RETRIES + 1}):`, err);
        }

        // Exponential backoff before retry
        if (attempt < MAX_SYNC_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
    }

    // All retries exhausted — show manual retry toast
    const { toast: toastHelper } = await import('@/hooks/useToastStore');
    toastHelper.withRetry(
        "SYNC_FAILURE",
        "Cloud synchronization failed. Your progress is saved locally.",
        () => syncStateToCloud(xpDelta, inventory, missionId, rank, duration, set, additionalParams)
    );
};

// Helper for guest/fallback local mission reward computation
function applyLocalMissionRewards(
    _id: string,
    rank: string,
    xpGained: number,
    completedMissions: MissionRecord[],
    get: () => CollectionState,
    set: (partial: Partial<CollectionState> | ((state: CollectionState) => Partial<CollectionState>)) => void
) {
    const existingIndex = completedMissions.findIndex(m => m.id === _id);
    const newMissions = [...completedMissions];
    const rankWeight: Record<string, number> = { 'S': 3, 'A': 2, 'B': 1, 'F': 0 };

    if (existingIndex >= 0) {
        const existing = { ...newMissions[existingIndex] };
        existing.xp = (existing.xp || 0) + xpGained;
        let newLevel = 1;
        if (existing.xp >= 1000) newLevel = 5;
        else if (existing.xp >= 500) newLevel = 4;
        else if (existing.xp >= 250) newLevel = 3;
        else if (existing.xp >= 100) newLevel = 2;
        existing.level = newLevel;
        if (rankWeight[rank] > (rankWeight[existing.rank] || 0)) {
            existing.rank = rank as MissionRecord['rank'];
            existing.clearedAt = Date.now();
        }
        newMissions[existingIndex] = existing;
    } else {
        let level = 1;
        if (xpGained >= 1000) level = 5;
        else if (xpGained >= 500) level = 4;
        else if (xpGained >= 250) level = 3;
        else if (xpGained >= 100) level = 2;
        newMissions.push({
            id: _id,
            rank: rank as MissionRecord['rank'],
            clearedAt: Date.now(),
            xp: xpGained,
            level
        });
    }

    set({ completedMissions: newMissions });

    // Award items based on rank
    const rewards = getRewardItems(rank as 'S' | 'A' | 'B' | 'F');
    const { inventory } = get();
    const newInventory = { ...inventory };
    rewards.forEach(itemId => {
        newInventory[itemId] = (newInventory[itemId] || 0) + 1;
    });
    set({ inventory: newInventory });
}

// Main store hook
export const useCollectionStore = create<CollectionState>()(
    persist(
        (set, get) => ({
            securedIds: [],
            completedMissions: [],
            inventory: { ...STARTER_INVENTORY },
            difficultyMultiplier: 1,
            streamerNatures: {},
            totalResistanceScore: 0,
            level: 1,
            userFaction: 'NONE',
            isFactionMinted: false,
            activeMissionStart: null,
            lastMissionComplete: null,
            wins: 0,
            losses: 0,
            ptsBalance: 0,
            unlockedNarratives: [],
            equipmentSlots: { weapon: null, armor: null, accessory: null },
            isAuthenticated: false,

            setAuthenticated: (_auth: boolean) => set({ isAuthenticated: _auth }),

            secureAsset: (_id: string) => {
                const { securedIds, streamerNatures, inventory, unlockedNarratives } = get();
                if (securedIds.includes(_id)) return;

                const nature = getRandomNature();
                const newSecuredIds = [...securedIds, _id];
                const newUnlockedNarratives = unlockedNarratives.includes(_id)
                    ? unlockedNarratives
                    : [...unlockedNarratives, _id];

                set({
                    securedIds: newSecuredIds,
                    streamerNatures: { ...streamerNatures, [_id]: nature },
                    unlockedNarratives: newUnlockedNarratives
                });

                // Sync nature to Cloud (BUG 8 FIX: securedIds no longer sent from client)
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, {
                        streamerNatures: { ...streamerNatures, [_id]: nature }
                    });
                }
            },

            addItem: (_itemId: string, count = 1) => {
                const { inventory } = get();
                const newInventory = {
                    ...inventory,
                    [_itemId]: (inventory[_itemId] || 0) + count
                };

                set({ inventory: newInventory });

                // Sync Update
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }
            },

            useItem: (_itemId: string): boolean => {
                const { inventory } = get();
                if ((inventory[_itemId] || 0) <= 0) return false;

                const newInventory = {
                    ...inventory,
                    [_itemId]: Math.max(0, (inventory[_itemId] || 0) - 1)
                };

                set({ inventory: newInventory });

                // Sync Update (Consumption)
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }

                return true;
            },

            equipItem: (_itemId: string, _slot: keyof EquipmentSlots) => {
                const { inventory, equipmentSlots } = get();
                if ((inventory[_itemId] || 0) <= 0) return;

                const newInventory = { ...inventory };
                // Return currently equipped item to inventory
                const currentEquipped = equipmentSlots[_slot];
                if (currentEquipped) {
                    newInventory[currentEquipped] = (newInventory[currentEquipped] || 0) + 1;
                }
                // Remove new item from inventory
                newInventory[_itemId] = Math.max(0, (newInventory[_itemId] || 0) - 1);

                const newSlots = { ...equipmentSlots, [_slot]: _itemId };
                set({ inventory: newInventory, equipmentSlots: newSlots });

                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }
            },

            unequipItem: (_slot: keyof EquipmentSlots) => {
                const { inventory, equipmentSlots } = get();
                const equippedItem = equipmentSlots[_slot];
                if (!equippedItem) return;

                const newInventory = {
                    ...inventory,
                    [equippedItem]: (inventory[equippedItem] || 0) + 1
                };
                const newSlots = { ...equipmentSlots, [_slot]: null };
                set({ inventory: newInventory, equipmentSlots: newSlots });

                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }
            },

            updateDifficulty: (_mult: number) => set({ difficultyMultiplier: _mult }),

            updateResistanceScore: (_points: number) => set((state) => ({
                totalResistanceScore: state.totalResistanceScore + _points
            })),

            setFaction: (_faction: 'RED' | 'PURPLE') => {
                set({ userFaction: _faction, isFactionMinted: false });
                const { inventory, isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { faction: _faction });
                }
            },

            mintFactionCard: () => {
                set({ isFactionMinted: true });
                const { inventory, userFaction, isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { faction: userFaction, isFactionMinted: true });
                }
            },

            startMission: () => {
                const { lastMissionComplete } = get();
                const now = Date.now();
                // 10 second cooldown between missions
                if (lastMissionComplete && (now - lastMissionComplete) < 10000) {
                    console.warn("MISSION_COOLDOWN_ACTIVE: Scanning frequencies...");
                    return;
                }
                set({ activeMissionStart: now });
            },

            markMissionComplete: (_id: string, rank = 'B', xpGained = 50, battleResult?: {
                hpRemaining: number; maxHp: number; turnsUsed: number; isBoss: boolean; duration: number;
            }) => {
                const { completedMissions, activeMissionStart, isAuthenticated: isAuth } = get();

                // Calculate Duration
                const now = Date.now();
                const duration = battleResult?.duration ?? (activeMissionStart ? (now - activeMissionStart) : 0);

                // Anti-Cheat: Minimum mission duration (5 seconds)
                if (duration < 5000 && rank !== 'F') {
                    console.error("MISSION_GLITCH_DETECTED: Signal terminated. Anomalous activity found.");
                    set({ activeMissionStart: null });
                    return;
                }

                // Reset Start Time and Update Cooldown
                set({ activeMissionStart: null, lastMissionComplete: now });

                // SERVER-AUTHORITATIVE PATH: For authenticated users, server computes all rewards
                if (isAuth && battleResult) {
                    fetch('/api/mission/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            missionId: _id,
                            hpRemaining: battleResult.hpRemaining,
                            maxHp: battleResult.maxHp,
                            turnsUsed: battleResult.turnsUsed,
                            isBoss: battleResult.isBoss,
                            duration
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            set({
                                totalResistanceScore: data.newXp,
                                level: data.newLevel,
                                ptsBalance: data.newPtsBalance,
                                inventory: data.newInventory,
                                completedMissions: data.completedMissions
                            });
                        } else {
                            console.error("Server mission complete failed:", data.error);
                            // Fallback: apply local computation
                            applyLocalMissionRewards(_id, rank, xpGained, completedMissions, get, set);
                        }
                    })
                    .catch(err => {
                        console.error("Mission complete request failed:", err);
                        applyLocalMissionRewards(_id, rank, xpGained, completedMissions, get, set);
                    });
                    return;
                }

                // GUEST PATH: Local computation (no server call)
                applyLocalMissionRewards(_id, rank, xpGained, completedMissions, get, set);
            },

            syncFromCloud: (userData: Partial<import('@/types/auth').UserRow>) => {
                const updates: Partial<CollectionState> = {};
                if (userData.inventory !== undefined) updates.inventory = userData.inventory;
                if (userData.xp !== undefined) updates.totalResistanceScore = userData.xp;
                if (userData.level !== undefined) updates.level = userData.level;
                if (userData.wins !== undefined) updates.wins = userData.wins;
                if (userData.losses !== undefined) updates.losses = userData.losses;
                if (userData.secured_ids !== undefined) updates.securedIds = userData.secured_ids;
                if (userData.streamer_natures !== undefined) updates.streamerNatures = userData.streamer_natures;
                if (userData.completed_missions !== undefined) updates.completedMissions = userData.completed_missions;
                if (userData.faction !== undefined) updates.userFaction = userData.faction;
                if (userData.pts_balance !== undefined) updates.ptsBalance = userData.pts_balance;
                if (userData.is_faction_minted !== undefined) updates.isFactionMinted = userData.is_faction_minted;
                if (userData.equipment_slots !== undefined) updates.equipmentSlots = userData.equipment_slots;

                updates.isAuthenticated = true;

                if (Object.keys(updates).length > 0) {
                    set(updates as any);
                    console.log("Synced from cloud:", updates);
                }
            },

            addWin: () => {
                const { wins, inventory, isAuthenticated } = get();
                set({ wins: wins + 1 });
                if (isAuthenticated) {
                    // BUG 7 FIX: Send delta increment, not absolute value
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { deltaWins: 1 });
                }
            },

            addLoss: () => {
                const { losses, inventory, isAuthenticated } = get();
                set({ losses: losses + 1 });
                if (isAuthenticated) {
                    // BUG 7 FIX: Send delta increment, not absolute value
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { deltaLosses: 1 });
                }
            },

            refreshStats: async () => {
                try {
                    const res = await fetch('/api/auth/session');
                    const data = await res.json();
                    if (data.authenticated && data.user) {
                        get().syncFromCloud(data.user);
                        set({ isAuthenticated: true });
                    } else {
                        // Not authenticated — reset faction to prevent localStorage bypass
                        set({ isAuthenticated: false, userFaction: 'NONE', isFactionMinted: false });
                    }
                } catch (err) {
                    console.error("Failed to refresh stats:", err);
                    set({ isAuthenticated: false, userFaction: 'NONE', isFactionMinted: false });
                }
            }
        }),
        {
            name: 'pts_storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => Object.fromEntries(
                Object.entries(state).filter(([key]) => key !== 'isAuthenticated')
            ),
        }
    )
);

// Derived state helpers
export const getRebellionLevel = (state: CollectionState) => state.completedMissions.length;
export const getItemCount = (state: CollectionState, itemId: string) => state.inventory[itemId] || 0;
export const getSectorStatus = (state: CollectionState, id: string) => {
    const record = state.completedMissions.find(m => m.id === id);
    if (!record) return 'LOCKED';
    return record.rank;
};
export const getMissionRecord = (state: CollectionState, id: string) => state.completedMissions.find(m => m.id === id);
export const getNature = (state: CollectionState, id: string) => state.streamerNatures[id] || null;

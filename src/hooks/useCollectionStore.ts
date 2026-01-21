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
    activeMissionStart: number | null; // Anti-Cheat: Track start time
    wins: number;
    losses: number;

    // Actions
    secureAsset: (id: string) => void;
    addItem: (itemId: string, count?: number) => void;
    useItem: (itemId: string) => boolean;
    updateDifficulty: (mult: number) => void;
    updateResistanceScore: (points: number) => void;
    setFaction: (faction: 'RED' | 'PURPLE') => void;
    mintFactionCard: () => void;
    startMission: () => void; // Call when entering battle
    markMissionComplete: (id: string, rank?: 'S' | 'A' | 'B' | 'F', xpGained?: number) => void;
    syncFromCloud: (userData: any) => void;
    addWin: () => void;
    addLoss: () => void;
    refreshStats: () => Promise<void>;
    isAuthenticated: boolean;
    setAuthenticated: (auth: boolean) => void;
}

// Internal Helper for Cloud Sync
const syncStateToCloud = async (
    xpDelta: number,
    inventory: Record<string, number>,
    missionId?: string,
    rank?: string,
    duration?: number,
    set?: any,
    additionalParams?: {
        wins?: number,
        losses?: number,
        securedIds?: string[],
        streamerNatures?: any,
        completedMissions?: any[],
        faction?: string,
        isFactionMinted?: boolean
    }
) => {
    try {
        const payload: any = {
            deltaXp: xpDelta,
            inventory: inventory
        };

        if (missionId) payload.missionId = missionId;
        if (rank) payload.rank = rank;
        if (duration) payload.duration = duration;
        if (additionalParams?.wins !== undefined) payload.wins = additionalParams.wins;
        if (additionalParams?.losses !== undefined) payload.losses = additionalParams.losses;
        if (additionalParams?.securedIds !== undefined) payload.securedIds = additionalParams.securedIds;
        if (additionalParams?.streamerNatures !== undefined) payload.streamerNatures = additionalParams.streamerNatures;
        if (additionalParams?.completedMissions !== undefined) payload.completedMissions = additionalParams.completedMissions;
        if (additionalParams?.faction !== undefined) payload.faction = additionalParams.faction;
        if (additionalParams?.isFactionMinted !== undefined) payload.isFactionMinted = additionalParams.isFactionMinted;

        const res = await fetch('/api/player/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success && set) {
            set((state: any) => ({
                totalResistanceScore: data.newXp,
                level: data.newLevel,
                isAuthenticated: true // Confirm we are authenticated
            }));
            console.log("Cloud Sync Verified. Level:", data.newLevel);
        } else if (data.error) {
            if (data.error === "Unauthorized" || res.status === 401) {
                // Silently handle unauthorized - just means we are in guest mode
                if (set) set({ isAuthenticated: false });
                return;
            }
            console.error("Cloud Sync Rejected:", data.error);
        }
    } catch (err) {
        console.error("Cloud Sync Failed:", err);
    }
};

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
            wins: 0,
            losses: 0,
            isAuthenticated: false,

            setAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),

            secureAsset: (id: string) => {
                const { securedIds, streamerNatures, inventory } = get();
                if (securedIds.includes(id)) return;

                const nature = getRandomNature();
                const newSecuredIds = [...securedIds, id];
                set({
                    securedIds: newSecuredIds,
                    streamerNatures: { ...streamerNatures, [id]: nature }
                });

                // Sync Securing to Cloud
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, {
                        securedIds: newSecuredIds,
                        streamerNatures: { ...streamerNatures, [id]: nature }
                    });
                }
            },

            addItem: (itemId: string, count = 1) => {
                const { inventory } = get();
                const newInventory = {
                    ...inventory,
                    [itemId]: (inventory[itemId] || 0) + count
                };

                set({ inventory: newInventory });

                // Sync Update
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }
            },

            useItem: (itemId: string): boolean => {
                const { inventory } = get();
                if ((inventory[itemId] || 0) <= 0) return false;

                const newInventory = {
                    ...inventory,
                    [itemId]: Math.max(0, (inventory[itemId] || 0) - 1)
                };

                set({ inventory: newInventory });

                // Sync Update (Consumption)
                const { isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, newInventory, undefined, undefined, undefined, set);
                }

                return true;
            },

            updateDifficulty: (mult: number) => set({ difficultyMultiplier: mult }),

            updateResistanceScore: (points: number) => set((state) => ({
                totalResistanceScore: state.totalResistanceScore + points
            })),

            setFaction: (faction: 'RED' | 'PURPLE') => {
                set({ userFaction: faction, isFactionMinted: false });
                const { inventory, isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { faction });
                }
            },

            mintFactionCard: () => {
                set({ isFactionMinted: true });
                const { inventory, userFaction, isAuthenticated } = get();
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { faction: userFaction, isFactionMinted: true });
                }
            },

            startMission: () => set({ activeMissionStart: Date.now() }),

            markMissionComplete: (id: string, rank = 'B', xpGained = 50) => {
                const { completedMissions, addItem, updateResistanceScore, activeMissionStart } = get();

                // Calculate Duration
                const now = Date.now();
                const duration = activeMissionStart ? (now - activeMissionStart) : 0;

                // Reset Start Time
                set({ activeMissionStart: null });

                const existingIndex = completedMissions.findIndex(m => m.id === id);
                let newMissions = [...completedMissions];

                if (existingIndex >= 0) {
                    const existing = { ...newMissions[existingIndex] };
                    const oldRank = existing.rank;
                    const rankWeight: Record<string, number> = { 'S': 3, 'A': 2, 'B': 1, 'F': 0 };

                    existing.xp = (existing.xp || 0) + xpGained;

                    // Calculates local level purely for mission record metadata (legacy)
                    let newLevel = 1;
                    if (existing.xp >= 1000) newLevel = 5;
                    else if (existing.xp >= 500) newLevel = 4;
                    else if (existing.xp >= 250) newLevel = 3;
                    else if (existing.xp >= 100) newLevel = 2;
                    existing.level = newLevel;

                    if (rankWeight[rank] > rankWeight[oldRank]) {
                        existing.rank = rank;
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
                        id,
                        rank,
                        clearedAt: Date.now(),
                        xp: xpGained,
                        level
                    });
                }

                set({ completedMissions: newMissions });

                // Award points based on rank
                const rankPoints = rank === 'S' ? 500 : rank === 'A' ? 300 : rank === 'B' ? 100 : 20;

                // Award items based on rank
                const rewards = getRewardItems(rank);

                // We calculate new inventory locally to send correct state
                const { inventory } = get();
                const newInventory = { ...inventory };
                rewards.forEach(itemId => {
                    newInventory[itemId] = (newInventory[itemId] || 0) + 1;
                });

                set({ inventory: newInventory }); // Optimistic Item Update

                // GLOBAL FACTION WAR CONTRIBUTION
                const { userFaction } = get();
                if (userFaction !== 'NONE' && rank !== 'F') {
                    supabase.rpc('contribute_to_faction_war', {
                        p_streamer_id: id,
                        p_faction: userFaction
                    }).then(({ error }) => {
                        if (error) console.error("Faction War contribution failed:", error);
                        else console.log(`[FACTION_WAR] Contribution recorded for ${userFaction} in sector ${id}`);
                    });
                }

                // CLOUD SYNC
                const { isAuthenticated: isAuth } = get();
                if (isAuth) {
                    syncStateToCloud(xpGained, newInventory, id, rank, duration, set, { completedMissions: newMissions });
                }
            },

            syncFromCloud: (userData: any) => {
                const updates: Partial<CollectionState> = {};
                if (userData.inventory) updates.inventory = userData.inventory;
                if (userData.xp) updates.totalResistanceScore = userData.xp;
                if (userData.level) updates.level = userData.level;
                if (userData.wins) updates.wins = userData.wins;
                if (userData.losses) updates.losses = userData.losses;
                if (userData.secured_ids) updates.securedIds = userData.secured_ids;
                if (userData.streamer_natures) updates.streamerNatures = userData.streamer_natures;
                if (userData.completed_missions) updates.completedMissions = userData.completed_missions;
                if (userData.faction) updates.userFaction = userData.faction;
                if (userData.is_faction_minted !== undefined) updates.isFactionMinted = userData.is_faction_minted;

                updates.isAuthenticated = true;

                if (Object.keys(updates).length > 0) {
                    set(updates as any);
                    console.log("Synced from cloud:", updates);
                }
            },

            addWin: () => {
                const { wins, inventory, isAuthenticated } = get();
                const newWins = wins + 1;
                set({ wins: newWins });
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { wins: newWins });
                }
            },

            addLoss: () => {
                const { losses, inventory, isAuthenticated } = get();
                const newLosses = losses + 1;
                set({ losses: newLosses });
                if (isAuthenticated) {
                    syncStateToCloud(0, inventory, undefined, undefined, undefined, set, { losses: newLosses });
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
                        set({ isAuthenticated: false });
                    }
                } catch (err) {
                    console.error("Failed to refresh stats:", err);
                    set({ isAuthenticated: false });
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

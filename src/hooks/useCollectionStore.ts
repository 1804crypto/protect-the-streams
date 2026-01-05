"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STARTER_INVENTORY, getRewardItems } from '@/data/items';
import { NatureType, getRandomNature } from '@/data/streamers';

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
    userFaction: 'RED' | 'PURPLE' | 'NONE';
    isFactionMinted: boolean;

    // Actions
    secureAsset: (id: string) => void;
    addItem: (itemId: string, count?: number) => void;
    useItem: (itemId: string) => boolean;
    updateDifficulty: (mult: number) => void;
    updateResistanceScore: (points: number) => void;
    setFaction: (faction: 'RED' | 'PURPLE') => void;
    mintFactionCard: () => void;
    markMissionComplete: (id: string, rank?: 'S' | 'A' | 'B' | 'F', xpGained?: number) => void;
}

// Create the raw Zustand store
const useStore = create<CollectionState>()(
    persist(
        (set, get) => ({
            securedIds: [],
            completedMissions: [],
            inventory: { ...STARTER_INVENTORY },
            difficultyMultiplier: 1,
            streamerNatures: {},
            totalResistanceScore: 0,
            userFaction: 'NONE',
            isFactionMinted: false,

            secureAsset: (id: string) => {
                const { securedIds, streamerNatures } = get();
                if (securedIds.includes(id)) return;

                const nature = getRandomNature();
                set({
                    securedIds: [...securedIds, id],
                    streamerNatures: { ...streamerNatures, [id]: nature }
                });
            },

            addItem: (itemId: string, count = 1) => {
                set((state) => ({
                    inventory: {
                        ...state.inventory,
                        [itemId]: (state.inventory[itemId] || 0) + count
                    }
                }));
            },

            useItem: (itemId: string): boolean => {
                const { inventory } = get();
                if ((inventory[itemId] || 0) <= 0) return false;

                set((state) => ({
                    inventory: {
                        ...state.inventory,
                        [itemId]: Math.max(0, (state.inventory[itemId] || 0) - 1)
                    }
                }));
                return true;
            },

            updateDifficulty: (mult: number) => set({ difficultyMultiplier: mult }),

            updateResistanceScore: (points: number) => set((state) => ({
                totalResistanceScore: state.totalResistanceScore + points
            })),

            setFaction: (faction: 'RED' | 'PURPLE') => set({ userFaction: faction, isFactionMinted: false }),

            mintFactionCard: () => set({ isFactionMinted: true }),

            markMissionComplete: (id: string, rank = 'B', xpGained = 50) => {
                const { completedMissions, addItem, updateResistanceScore } = get();
                const existingIndex = completedMissions.findIndex(m => m.id === id);
                let newMissions = [...completedMissions];

                if (existingIndex >= 0) {
                    const existing = { ...newMissions[existingIndex] };
                    const oldRank = existing.rank;
                    const rankWeight: Record<string, number> = { 'S': 3, 'A': 2, 'B': 1, 'F': 0 };

                    existing.xp = (existing.xp || 0) + xpGained;

                    // Calculate level
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
                updateResistanceScore(rankPoints);

                // Award items based on rank
                const rewards = getRewardItems(rank);
                rewards.forEach(itemId => addItem(itemId, 1));
            }
        }),
        {
            name: 'pts_storage', // Unique name for local storage
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Wrapper hook to maintain backward compatibility and provide derived state/helpers
export const useCollectionStore = () => {
    const state = useStore();

    const rebellionLevel = state.completedMissions.length;

    const getItemCount = (itemId: string): number => {
        return state.inventory[itemId] || 0;
    };

    const getSectorStatus = (id: string) => {
        const record = state.completedMissions.find(m => m.id === id);
        if (!record) return 'LOCKED';
        return record.rank;
    };

    const isSecured = (id: string) => state.securedIds.includes(id);
    const hasClearedMission = (id: string) => state.completedMissions.some(m => m.id === id);
    const getMissionRecord = (id: string) => state.completedMissions.find(m => m.id === id);
    const getNature = (id: string): NatureType | null => state.streamerNatures[id] || null;

    return {
        ...state,
        rebellionLevel,
        getItemCount,
        getSectorStatus,
        isSecured,
        hasClearedMission,
        getMissionRecord,
        getNature
    };
};

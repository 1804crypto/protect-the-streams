"use client";

import { useState, useEffect } from 'react';
import { STARTER_INVENTORY, getRewardItems } from '@/data/items';
import { NatureType, getRandomNature } from '@/data/streamers';

export interface MissionRecord {
    id: string;
    rank: 'S' | 'A' | 'B' | 'F';
    clearedAt: number;
    xp: number;
    level: number;
}

export const useCollectionStore = () => {
    const [securedIds, setSecuredIds] = useState<string[]>([]);
    const [completedMissions, setCompletedMissions] = useState<MissionRecord[]>([]);
    const [inventory, setInventory] = useState<Record<string, number>>({});
    const [difficultyMultiplier, setDifficultyMultiplier] = useState(1);
    const [streamerNatures, setStreamerNatures] = useState<Record<string, NatureType>>({});
    const [totalResistanceScore, setTotalResistanceScore] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('pts_secured_assets');
        const savedMissions = localStorage.getItem('pts_completed_missions');
        const savedInventory = localStorage.getItem('pts_inventory');
        const savedDifficulty = localStorage.getItem('pts_difficulty_mult');
        const savedScore = localStorage.getItem('pts_resistance_score');

        if (savedDifficulty) setDifficultyMultiplier(parseFloat(savedDifficulty));
        if (savedScore) setTotalResistanceScore(parseInt(savedScore));

        if (saved) {
            try {
                setSecuredIds(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse collection");
            }
        }
        if (savedMissions) {
            try {
                setCompletedMissions(JSON.parse(savedMissions));
            } catch (e) {
                console.error("Failed to parse missions");
            }
        }
        if (savedInventory) {
            try {
                setInventory(JSON.parse(savedInventory));
            } catch (e) {
                console.error("Failed to parse inventory");
                setInventory({ ...STARTER_INVENTORY });
            }
        } else {
            // Initialize with starter inventory
            setInventory({ ...STARTER_INVENTORY });
            localStorage.setItem('pts_inventory', JSON.stringify(STARTER_INVENTORY));
        }

        // Load natures
        const savedNatures = localStorage.getItem('pts_streamer_natures');
        if (savedNatures) {
            try {
                setStreamerNatures(JSON.parse(savedNatures));
            } catch (e) {
                console.error("Failed to parse natures");
            }
        }
    }, []);

    const secureAsset = (id: string) => {
        if (securedIds.includes(id)) return;
        const newCollection = [...securedIds, id];
        setSecuredIds(newCollection);
        localStorage.setItem('pts_secured_assets', JSON.stringify(newCollection));

        // Assign random nature
        const nature = getRandomNature();
        setStreamerNatures(prev => {
            const updated = { ...prev, [id]: nature };
            localStorage.setItem('pts_streamer_natures', JSON.stringify(updated));
            return updated;
        });
    };

    const addItem = (itemId: string, count: number = 1) => {
        setInventory(prev => {
            const newInventory = { ...prev, [itemId]: (prev[itemId] || 0) + count };
            localStorage.setItem('pts_inventory', JSON.stringify(newInventory));
            return newInventory;
        });
    };

    const useItem = (itemId: string): boolean => {
        if ((inventory[itemId] || 0) <= 0) return false;

        setInventory(prev => {
            const newInventory = { ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) - 1) };
            localStorage.setItem('pts_inventory', JSON.stringify(newInventory));
            return newInventory;
        });
        return true;
    };

    const getItemCount = (itemId: string): number => {
        return inventory[itemId] || 0;
    };

    const rebellionLevel = completedMissions.length;

    const getSectorStatus = (id: string) => {
        const record = completedMissions.find(m => m.id === id);
        if (!record) return 'LOCKED';
        return record.rank;
    };

    const updateResistanceScore = (points: number) => {
        setTotalResistanceScore(prev => {
            const newScore = prev + points;
            localStorage.setItem('pts_resistance_score', newScore.toString());
            return newScore;
        });
    };

    const markMissionComplete = (id: string, rank: 'S' | 'A' | 'B' | 'F' = 'B', xpGained: number = 50) => {
        const existingIndex = completedMissions.findIndex(m => m.id === id);
        let newMissions = [...completedMissions];

        if (existingIndex >= 0) {
            const existing = { ...newMissions[existingIndex] };
            const oldRank = existing.rank;
            const rankWeight = { 'S': 3, 'A': 2, 'B': 1, 'F': 0 };

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

        setCompletedMissions(newMissions);
        localStorage.setItem('pts_completed_missions', JSON.stringify(newMissions));

        // Award points based on rank
        const rankPoints = rank === 'S' ? 500 : rank === 'A' ? 300 : rank === 'B' ? 100 : 20;
        updateResistanceScore(rankPoints);

        // Award items based on rank
        const rewards = getRewardItems(rank);
        rewards.forEach(itemId => addItem(itemId, 1));
    };

    const isSecured = (id: string) => securedIds.includes(id);
    const hasClearedMission = (id: string) => completedMissions.some(m => m.id === id);
    const getMissionRecord = (id: string) => completedMissions.find(m => m.id === id);
    const getNature = (id: string): NatureType | null => streamerNatures[id] || null;

    const updateDifficulty = (mult: number) => {
        setDifficultyMultiplier(mult);
        localStorage.setItem('pts_difficulty_mult', mult.toString());
    };

    return {
        securedIds,
        completedMissions,
        inventory,
        streamerNatures,
        difficultyMultiplier,
        totalResistanceScore,
        secureAsset,
        addItem,
        useItem,
        getItemCount,
        rebellionLevel,
        getSectorStatus,
        markMissionComplete,
        isSecured,
        hasClearedMission,
        getMissionRecord,
        getNature,
        updateDifficulty,
        updateResistanceScore
    };
};


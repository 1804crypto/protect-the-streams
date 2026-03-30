"use client";

import { useEffect, useRef } from 'react';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useAchievementStore } from '@/hooks/useAchievements';

/**
 * Invisible component that watches collection store changes
 * and checks for newly unlocked achievements.
 * Renders nothing — just triggers achievement toasts.
 */
export const AchievementTracker = () => {
    const wins = useCollectionStore(state => state.wins);
    const losses = useCollectionStore(state => state.losses);
    const securedIds = useCollectionStore(state => state.securedIds);
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const level = useCollectionStore(state => state.level);
    const ptsBalance = useCollectionStore(state => state.ptsBalance);
    const totalXP = useCollectionStore(state => state.totalResistanceScore);
    const checkAchievements = useAchievementStore(state => state.checkAchievements);

    const hasHydrated = useRef(false);

    useEffect(() => {
        // Skip the initial hydration render to avoid firing toasts on page load
        if (!hasHydrated.current) {
            hasHydrated.current = true;
            return;
        }

        checkAchievements({
            wins,
            losses,
            securedCount: securedIds.length,
            completedMissions: completedMissions.length,
            level,
            ptsBalance,
            totalXP,
            pvpWins: wins, // PvP wins are tracked in the same wins counter
        });
    }, [wins, losses, securedIds.length, completedMissions.length, level, ptsBalance, totalXP, checkAchievements]);

    return null;
};

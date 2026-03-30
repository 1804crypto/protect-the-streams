"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from '@/hooks/useToastStore';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
    wins: number;
    losses: number;
    securedCount: number;
    completedMissions: number;
    level: number;
    ptsBalance: number;
    totalXP: number;
    pvpWins: number;
}

const ACHIEVEMENTS: Achievement[] = [
    // First steps
    { id: 'first_mint', title: 'SIGNAL_ACQUIRED', description: 'Mint your first streamer defense card', icon: '🎴', condition: (s) => s.securedCount >= 1 },
    { id: 'first_win', title: 'FIRST_BLOOD', description: 'Win your first mission', icon: '⚔️', condition: (s) => s.wins >= 1 },
    { id: 'first_loss', title: 'BATTLE_SCARRED', description: 'Lose a mission — but learn from it', icon: '💔', condition: (s) => s.losses >= 1 },

    // Progression
    { id: 'level_5', title: 'RISING_OPERATIVE', description: 'Reach Level 5', icon: '📈', condition: (s) => s.level >= 5 },
    { id: 'level_10', title: 'VETERAN_AGENT', description: 'Reach Level 10', icon: '🎖️', condition: (s) => s.level >= 10 },
    { id: 'wins_5', title: 'STREAK_RUNNER', description: 'Win 5 missions', icon: '🔥', condition: (s) => s.wins >= 5 },
    { id: 'wins_25', title: 'SECTOR_DOMINATOR', description: 'Win 25 missions', icon: '👑', condition: (s) => s.wins >= 25 },
    { id: 'missions_10', title: 'MISSION_SPECIALIST', description: 'Complete 10 missions (win or lose)', icon: '🎯', condition: (s) => s.completedMissions >= 10 },

    // Collection
    { id: 'collect_3', title: 'SQUAD_BUILDER', description: 'Mint 3 streamer cards', icon: '🃏', condition: (s) => s.securedCount >= 3 },
    { id: 'collect_all', title: 'FULL_ROSTER', description: 'Mint all 10 streamer cards', icon: '🏆', condition: (s) => s.securedCount >= 10 },

    // Economy
    { id: 'pts_1000', title: 'MARKET_PLAYER', description: 'Accumulate 1,000 PTS', icon: '💰', condition: (s) => s.ptsBalance >= 1000 },
    { id: 'pts_10000', title: 'WAR_CHEST', description: 'Accumulate 10,000 PTS', icon: '💎', condition: (s) => s.ptsBalance >= 10000 },

    // PvP
    { id: 'pvp_first', title: 'ARENA_INITIATE', description: 'Win your first PvP battle', icon: '🥊', condition: (s) => s.pvpWins >= 1 },
    { id: 'pvp_10', title: 'ARENA_CHAMPION', description: 'Win 10 PvP battles', icon: '🏟️', condition: (s) => s.pvpWins >= 10 },

    // XP milestones
    { id: 'xp_5000', title: 'DATA_HOARDER', description: 'Accumulate 5,000 total XP', icon: '🧠', condition: (s) => s.totalXP >= 5000 },
];

interface AchievementState {
    unlockedIds: string[];
    checkAchievements: (stats: PlayerStats) => void;
    getUnlocked: () => Achievement[];
    getAll: () => Achievement[];
}

export const useAchievementStore = create<AchievementState>()(
    persist(
        (set, get) => ({
            unlockedIds: [],

            checkAchievements: (stats: PlayerStats) => {
                const { unlockedIds } = get();
                const newUnlocks: Achievement[] = [];

                for (const achievement of ACHIEVEMENTS) {
                    if (!unlockedIds.includes(achievement.id) && achievement.condition(stats)) {
                        newUnlocks.push(achievement);
                    }
                }

                if (newUnlocks.length > 0) {
                    set({ unlockedIds: [...unlockedIds, ...newUnlocks.map(a => a.id)] });

                    // Fire toast for each new achievement
                    for (const a of newUnlocks) {
                        toast.loot(
                            `${a.icon} ${a.title.replace(/_/g, ' ')}`,
                            a.description
                        );
                    }
                }
            },

            getUnlocked: () => {
                const { unlockedIds } = get();
                return ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
            },

            getAll: () => ACHIEVEMENTS,
        }),
        {
            name: 'pts-achievements',
        }
    )
);

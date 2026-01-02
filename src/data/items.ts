// Battle Items for PTS
// Inspired by Pokémon's item system

export type ItemEffect = 'heal' | 'restorePP' | 'boostAttack' | 'boostDefense' | 'revive';

export interface BattleItem {
    id: string;
    name: string;
    description: string;
    effect: ItemEffect;
    value: number;  // Amount of heal, PP restore, or boost multiplier
    rarity: 'common' | 'rare' | 'legendary';
    icon: string;   // Emoji for quick visual
}

export const items: Record<string, BattleItem> = {
    RESTORE_CHIP: {
        id: 'RESTORE_CHIP',
        name: 'Restore Chip',
        description: 'Restores 30 HP to active streamer.',
        effect: 'heal',
        value: 30,
        rarity: 'common',
        icon: '💊'
    },
    HYPER_RESTORE: {
        id: 'HYPER_RESTORE',
        name: 'Hyper Restore',
        description: 'Restores 75 HP to active streamer.',
        effect: 'heal',
        value: 75,
        rarity: 'rare',
        icon: '💉'
    },
    FULL_RESTORE: {
        id: 'FULL_RESTORE',
        name: 'Full Restore',
        description: 'Fully restores HP to active streamer.',
        effect: 'heal',
        value: 999,  // Will be capped to maxHP
        rarity: 'legendary',
        icon: '✨'
    },
    PP_RECHARGE: {
        id: 'PP_RECHARGE',
        name: 'PP Recharge',
        description: 'Restores 5 PP to all moves.',
        effect: 'restorePP',
        value: 5,
        rarity: 'common',
        icon: '🔋'
    },
    FULL_PP_RESTORE: {
        id: 'FULL_PP_RESTORE',
        name: 'Full PP Restore',
        description: 'Fully restores PP to all moves.',
        effect: 'restorePP',
        value: 999,  // Will restore all
        rarity: 'rare',
        icon: '⚡'
    },
    ATTACK_MATRIX: {
        id: 'ATTACK_MATRIX',
        name: 'Attack Matrix',
        description: 'Boosts attack damage by 50% for 3 turns.',
        effect: 'boostAttack',
        value: 1.5,
        rarity: 'rare',
        icon: '⚔️'
    },
    DEFENSE_MATRIX: {
        id: 'DEFENSE_MATRIX',
        name: 'Defense Matrix',
        description: 'Reduces incoming damage by 50% for 3 turns.',
        effect: 'boostDefense',
        value: 0.5,
        rarity: 'rare',
        icon: '🛡️'
    },
    PHOENIX_MODULE: {
        id: 'PHOENIX_MODULE',
        name: 'Phoenix Module',
        description: 'Revives a fallen party member with 50% HP.',
        effect: 'revive',
        value: 0.5,
        rarity: 'legendary',
        icon: '🔥'
    }
};

// Starting inventory for new players
export const STARTER_INVENTORY: Record<string, number> = {
    RESTORE_CHIP: 3,
    PP_RECHARGE: 2,
    ATTACK_MATRIX: 1,
};

// Items rewarded based on mission rank
export const MISSION_REWARDS: Record<'S' | 'A' | 'B' | 'F', string[]> = {
    S: ['HYPER_RESTORE', 'FULL_PP_RESTORE', 'ATTACK_MATRIX'],
    A: ['RESTORE_CHIP', 'PP_RECHARGE', 'DEFENSE_MATRIX'],
    B: ['RESTORE_CHIP', 'PP_RECHARGE'],
    F: ['RESTORE_CHIP'],
};

/**
 * Get random reward items based on rank
 */
export const getRewardItems = (rank: 'S' | 'A' | 'B' | 'F'): string[] => {
    const possibleRewards = MISSION_REWARDS[rank];
    const numRewards = rank === 'S' ? 3 : rank === 'A' ? 2 : 1;
    const rewards: string[] = [];

    for (let i = 0; i < numRewards; i++) {
        const randomItem = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
        rewards.push(randomItem);
    }

    return rewards;
};

// Battle Items for PTS
// Inspired by Pokémon's item system

export type ItemEffect = 'heal' | 'restorePP' | 'boostAttack' | 'boostDefense' | 'revive' | 'ultimateCharge';

export type ItemCategory = 'consumable' | 'equipment' | 'augment';

export interface BattleItem {
    id: string;
    name: string;
    description: string;
    effect: ItemEffect;
    value: number;  // Amount of heal, PP restore, or boost multiplier
    rarity: 'common' | 'rare' | 'legendary';
    icon: string;   // Emoji for quick visual
    category: ItemCategory;
    // Equipment-specific fields (NFT-ready)
    statBonus?: Partial<Record<'influence' | 'chaos' | 'charisma' | 'rebellion', number>>;
    slot?: 'weapon' | 'armor' | 'accessory';
    lore?: string;
}

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

export const items: Record<string, BattleItem> = {
    RESTORE_CHIP: { id: 'RESTORE_CHIP', name: 'Restore Chip', description: 'Fully restores HP', effect: 'heal', value: 100, rarity: 'common', icon: '💊', category: 'consumable' },
    PP_RECHARGE: { id: 'PP_RECHARGE', name: 'PP Recharge', description: 'Restores 10 PP', effect: 'restorePP', value: 10, rarity: 'common', icon: '🔋', category: 'consumable' },
    ATTACK_MATRIX: { id: 'ATTACK_MATRIX', name: 'Attack Matrix', description: 'Boosts Attack', effect: 'boostAttack', value: 1.5, rarity: 'rare', icon: '⚔️', category: 'consumable' },
    DEFENSE_MATRIX: { id: 'DEFENSE_MATRIX', name: 'Defense Matrix', description: 'Boosts Defense', effect: 'boostDefense', value: 1.5, rarity: 'rare', icon: '🛡️', category: 'consumable' },
    HYPER_RESTORE: { id: 'HYPER_RESTORE', name: 'Hyper Restore', description: 'Heals 200 HP', effect: 'heal', value: 200, rarity: 'legendary', icon: '💖', category: 'consumable' },
    FULL_PP_RESTORE: { id: 'FULL_PP_RESTORE', name: 'Full PP Restore', description: 'Fully restores PP', effect: 'restorePP', value: 100, rarity: 'legendary', icon: '⚡', category: 'consumable' },
    stim_pack: { id: 'stim_pack', name: 'Stim Pack', description: 'Quick heal', effect: 'heal', value: 30, rarity: 'common', icon: '💉', category: 'consumable' }
};

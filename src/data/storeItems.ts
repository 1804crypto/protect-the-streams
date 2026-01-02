import { BattleItem } from './items';

export interface StoreItem extends BattleItem {
    pricePts: number;
    stock?: number; // Optional: limited stock per mission/session
}

export const blackMarketItems: Record<string, StoreItem> = {
    // --- Consumables ---
    RESTORE_CHIP_V2: {
        id: 'RESTORE_CHIP_V2',
        name: 'Nano-Restore Chip',
        description: 'Advanced restoration. Heals 50 HP.',
        effect: 'heal',
        value: 50,
        rarity: 'common',
        icon: '🩹',
        pricePts: 100
    },
    GIGACHAD_GLITCH: {
        id: 'GIGACHAD_GLITCH',
        name: 'GigaChad Glitch',
        description: 'Guarantees your next move is SUPER EFFECTIVE.',
        effect: 'boostAttack',
        value: 2.0,
        rarity: 'rare',
        icon: '🗿',
        pricePts: 500
    },
    Z_QUANTUM_BURST: {
        id: 'Z_QUANTUM_BURST',
        name: 'Z-Quantum Burst',
        description: 'Instantly fills 50% of the Ultimate Bar.',
        effect: 'boostAttack', // We'll handle ultimate filling in the logic
        value: 50,
        rarity: 'legendary',
        icon: '🌀',
        pricePts: 1500
    },

    // --- Tactical Augments (These could be permanent or long-duration) ---
    OVERCLOCK_CORE: {
        id: 'OVERCLOCK_CORE',
        name: 'Overclock Core',
        description: 'Permanent 15% speed boost in one sector.',
        effect: 'boostAttack',
        value: 1.15,
        rarity: 'rare',
        icon: '🏎️',
        pricePts: 800
    },
    KINETIC_BOOSTER: {
        id: 'KINETIC_BOOSTER',
        name: 'Kinetic Booster',
        description: 'Increases REBELLION move damage by 20%.',
        effect: 'boostAttack',
        value: 1.2,
        rarity: 'rare',
        icon: '☄️',
        pricePts: 1000
    },

    // --- Emergency / Utility ---
    PHOENIX_MODULE_V2: {
        id: 'PHOENIX_MODULE_V2',
        name: 'Omega Phoenix Module',
        description: 'Revives streamer with 100% HP.',
        effect: 'revive',
        value: 1.0,
        rarity: 'legendary',
        icon: '🦅',
        pricePts: 2500
    },
    RESISTANCE_CRATE: {
        id: 'RESISTANCE_CRATE',
        name: 'Resistance Crate',
        description: 'A random collection of 3-5 basic items.',
        effect: 'heal', // Placeholder
        value: 0,
        rarity: 'common',
        icon: '📦',
        pricePts: 300
    }
};

// Type Effectiveness Chart for PTS Battle System
// CHAOS → INTEL → DISRUPT → CHARISMA → REBELLION → CHAOS (circular)

export type MoveType = 'INTEL' | 'DISRUPT' | 'CHARISMA' | 'REBELLION' | 'CHAOS';

// Effectiveness multipliers
export const SUPER_EFFECTIVE = 1.5;
export const NOT_EFFECTIVE = 0.5;
export const NEUTRAL = 1.0;

// Type matchup chart: typeChart[attackType][defenderType] = multiplier
export const typeChart: Record<MoveType, Record<MoveType, number>> = {
    CHAOS: {
        INTEL: SUPER_EFFECTIVE,      // Chaos overwhelms logic
        DISRUPT: NEUTRAL,
        CHARISMA: NEUTRAL,
        REBELLION: NOT_EFFECTIVE,    // Rebellion feeds on chaos
        CHAOS: NEUTRAL,
    },
    INTEL: {
        INTEL: NEUTRAL,
        DISRUPT: SUPER_EFFECTIVE,    // Intel outsmarts disruption
        CHARISMA: NEUTRAL,
        REBELLION: NEUTRAL,
        CHAOS: NOT_EFFECTIVE,        // Chaos defies logic
    },
    DISRUPT: {
        INTEL: NOT_EFFECTIVE,        // Disruption scattered by intel
        DISRUPT: NEUTRAL,
        CHARISMA: SUPER_EFFECTIVE,   // Disruption breaks charm
        REBELLION: NEUTRAL,
        CHAOS: NEUTRAL,
    },
    CHARISMA: {
        INTEL: NEUTRAL,
        DISRUPT: NOT_EFFECTIVE,      // Charm can't stop disruption
        CHARISMA: NEUTRAL,
        REBELLION: SUPER_EFFECTIVE,  // Charisma inspires rebellion
        CHAOS: NEUTRAL,
    },
    REBELLION: {
        INTEL: NEUTRAL,
        DISRUPT: NEUTRAL,
        CHARISMA: NOT_EFFECTIVE,     // Rebellion resists charm
        REBELLION: NEUTRAL,
        CHAOS: SUPER_EFFECTIVE,      // Rebellion creates chaos
    },
};

/**
 * Get the effectiveness multiplier for an attack
 */
export const getTypeEffectiveness = (attackType: MoveType, defenderType: MoveType): number => {
    return typeChart[attackType]?.[defenderType] ?? NEUTRAL;
};

/**
 * Get a human-readable effectiveness message
 */
export const getEffectivenessMessage = (multiplier: number): string | null => {
    if (multiplier >= SUPER_EFFECTIVE) {
        return "SUPER_EFFECTIVE! Critical frequency match detected.";
    }
    if (multiplier <= NOT_EFFECTIVE) {
        return "Not very effective... Signal interference detected.";
    }
    return null;
};

/**
 * Get defender type based on enemy archetype or stats
 * Enemies are assigned a type based on their strongest stat
 */
export const getEnemyType = (stats: { influence: number; chaos: number; charisma: number; rebellion: number }): MoveType => {
    const statToType: Record<string, MoveType> = {
        influence: 'INTEL',
        chaos: 'CHAOS',
        charisma: 'CHARISMA',
        rebellion: 'REBELLION',
    };

    let maxStat = 'chaos';
    let maxValue = 0;

    for (const [stat, value] of Object.entries(stats)) {
        if (value > maxValue && stat in statToType) {
            maxValue = value;
            maxStat = stat;
        }
    }

    return statToType[maxStat] || 'CHAOS';
};

export interface Boss {
    id: string;
    name: string;
    maxHp: number;
    image?: string;
    stats: {
        influence: number;
        chaos: number;
        charisma: number;
        rebellion: number;
    };
    moves: {
        name: string;
        damage: number;
        description: string;
    }[];
    phases?: {
        threshold: number;
        name: string;
        msg: string;
    }[];
}

export const bosses: Record<string, Boss> = {
    SPARK: {
        id: 'boss_spark',
        name: 'Voltage Warden',
        maxHp: 400,
        image: '/boss_spark.png',
        stats: { influence: 50, chaos: 90, charisma: 40, rebellion: 70 },
        moves: [
            { name: 'DISCHARGE', damage: 30, description: 'Sudden electrical burst.' },
            { name: 'ARC_FLASH', damage: 40, description: 'Blinding light and heat.' }
        ]
    },
    GENERAL: {
        id: 'boss_general',
        name: 'Legion Overseer',
        maxHp: 550,
        image: '/boss_general.png',
        stats: { influence: 90, chaos: 40, charisma: 80, rebellion: 50 },
        moves: [
            { name: 'COMMAND_SYNC', damage: 25, description: 'Coordinated drone strike.' },
            { name: 'PHALANX_BLOCK', damage: 0, description: 'Deploys a kinetic shield.' }
        ]
    },
    GHOST: {
        id: 'boss_ghost',
        name: 'Phantom Script',
        maxHp: 350,
        image: '/boss_ghost.png',
        stats: { influence: 70, chaos: 85, charisma: 60, rebellion: 40 },
        moves: [
            { name: 'VANISH', damage: 0, description: 'Ghostly evasion routines.' },
            { name: 'STEALTH_STRIKE', damage: 45, description: 'Unseen back-end attack.' }
        ]
    },
    INFILTRATOR: {
        id: 'boss_infiltrator',
        name: 'Backdoor Daemon',
        maxHp: 420,
        image: '/boss_ghost.png', // Reuse Ghost for now
        stats: { influence: 60, chaos: 70, charisma: 90, rebellion: 50 },
        moves: [
            { name: 'DATA_SIPHON', damage: 30, description: 'Steals signal integrity.' },
            { name: 'TROJAN_PULSE', damage: 50, description: 'Delayed system failure.' }
        ]
    },
    WEAVER: {
        id: 'boss_weaver',
        name: 'Harmonic Nullifier',
        maxHp: 480,
        image: '/boss_spark.png', // Reuse Spark/Voltage for now
        stats: { influence: 75, chaos: 50, charisma: 95, rebellion: 40 },
        moves: [
            { name: 'DISSONANCE', damage: 35, description: 'Shatters neural harmony.' },
            { name: 'SILENCE_FIELD', damage: 40, description: 'Mutes outgoing signals.' }
        ]
    },
    ENGINE: {
        id: 'boss_engine',
        name: 'Turbo Oppressor',
        maxHp: 600,
        image: '/boss_general.png',
        stats: { influence: 50, chaos: 99, charisma: 40, rebellion: 60 },
        moves: [
            { name: 'OVERCLOCK', damage: 50, description: 'Burning out all limiters.' },
            { name: 'THERMAL_THROTTLE', damage: 30, description: 'Forces system shutdown.' }
        ]
    },
    VANGUARD: {
        id: 'boss_vanguard',
        name: 'Propaganda Prime',
        maxHp: 520,
        image: '/boss_king.png',
        stats: { influence: 98, chaos: 60, charisma: 70, rebellion: 50 },
        moves: [
            { name: 'MASS_BROADCAST', damage: 35, description: 'Overwhelming narrative.' },
            { name: 'IDEOLOGY_LOCK', damage: 45, description: 'Blocks alternative paths.' }
        ]
    },
    PROVOCATEUR: {
        id: 'boss_provocateur',
        name: 'Outrage Catalyst',
        maxHp: 440,
        image: '/boss_spark.png',
        stats: { influence: 60, chaos: 95, charisma: 50, rebellion: 80 },
        moves: [
            { name: 'BAIT_CLICK', damage: 40, description: 'Lures into tactical error.' },
            { name: 'FLAME_WAR', damage: 30, description: 'Burning digital resentment.' }
        ]
    },
    KING: {
        id: 'boss_king',
        name: 'Regal Enforcer',
        maxHp: 500,
        image: '/boss_king.png',
        stats: { influence: 85, chaos: 50, charisma: 90, rebellion: 60 },
        moves: [
            { name: 'ROYAL_DECREE', damage: 40, description: 'Mandatory system compliance.' },
            { name: 'CROWN_STRIKE', damage: 50, description: 'Weighted impact attack.' }
        ]
    },
    CHAOS: {
        id: 'boss_chaos',
        name: 'Entropy Engine',
        maxHp: 450,
        image: '/boss_spark.png',
        stats: { influence: 60, chaos: 95, charisma: 50, rebellion: 40 },
        moves: [
            { name: 'STATIC_STORM', damage: 30, description: 'Neural interference surge.' },
            { name: 'RECURSIVE_GLITCH', damage: 45, description: 'Systemic breakdown cascade.' }
        ]
    },
    INFLUENCE: {
        id: 'boss_influence',
        name: 'Perception Filter',
        maxHp: 380,
        image: '/perception_filter_boss.png', // Already exists!
        stats: { influence: 98, chaos: 40, charisma: 60, rebellion: 50 },
        moves: [
            { name: 'ECHO_CHAMBER', damage: 25, description: 'Narrative reinforcement blast.' },
            { name: 'GASLIGHT_VOID', damage: 40, description: 'Psychological signal dampening.' }
        ]
    },
    CHARISMA: {
        id: 'boss_charisma',
        name: 'Deepfake Overlord',
        maxHp: 500,
        image: '/boss_ceo.png',
        stats: { influence: 70, chaos: 60, charisma: 95, rebellion: 30 },
        moves: [
            { name: 'SYNTH_ADORATION', damage: 20, description: 'Artificial popularity pulse.' },
            { name: 'IDENTITY_THEFT', damage: 50, description: 'Complete signal hijacking.' }
        ]
    },
    REBELLION: {
        id: 'boss_rebellion',
        name: 'Containment Unit X',
        maxHp: 420,
        image: '/boss_general.png',
        stats: { influence: 50, chaos: 50, charisma: 40, rebellion: 95 },
        moves: [
            { name: 'HARD_RESET', damage: 35, description: 'Physical sector lockdown.' },
            { name: 'KINETIC_SUPPRESSION', damage: 40, description: 'High-impact physical pulse.' }
        ]
    },
    GENERIC: {
        id: 'boss_generic',
        name: 'Titan Firewall',
        maxHp: 300,
        image: '/authority_sentinel_cipher_unit_1766789046162.png',
        stats: { influence: 75, chaos: 50, charisma: 70, rebellion: 40 },
        moves: [
            { name: 'PACKET_FILTER', damage: 35, description: 'Blocks incoming data flow.' },
            { name: 'BUFFER_OVERFLOW', damage: 55, description: 'Overloads system memory.' }
        ]
    },
    THE_CEO: {
        id: 'boss_the_ceo',
        name: 'V.A.L.U.E. OVERLORD',
        maxHp: 2000,
        image: '/boss_ceo.png',
        stats: { influence: 99, chaos: 99, charisma: 99, rebellion: 99 },
        moves: [
            { name: 'CORPORATE_RESTRUCTURING', damage: 80, description: 'Deletes core personality files.' },
            { name: 'PROFIT_MARGIN_CRUSH', damage: 100, description: 'Squeezes integrity resources.' },
            { name: 'TOTAL_BLACKOUT', damage: 150, description: 'The final shutdown sequence.' },
            { name: 'ALGORITHMIC_BIAS', damage: 60, description: 'Warps the battlefield rules.' }
        ],
        // Multi-phase meta data
        phases: [
            { threshold: 0.7, name: 'PHASE_1: OPTIMIZATION', msg: 'EFFICIENCY_PROTOCOLS_ENGAGED' },
            { threshold: 0.4, name: 'PHASE_2: CONSOLIDATION', msg: 'MARKET_DOMINANCE_ACHIEVED' },
            { threshold: 0.1, name: 'PHASE_3: LIQUIDATION', msg: 'TERMINATING_REST_OF_EXISTENCE' }
        ]
    }
};

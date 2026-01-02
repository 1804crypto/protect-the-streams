import { MoveType } from './typeChart';

export interface Move {
    name: string;
    type: MoveType;
    power: number;
    pp: number;  // Power Points - max uses per battle
    description: string;
}

export interface StreamerStats {
    influence: number;
    chaos: number;
    charisma: number;
    rebellion: number;
}

export interface QuantumLore {
    statusLog: string;
    battle1: string;
    battle2: string;
    climax: string; // The transfer point to the next streamer
}

export interface Streamer {
    id: string;
    name: string;
    archetype: string;
    stats: StreamerStats;
    trait: string;
    visualPrompt: string;
    image: string;
    moves: Move[];
    ultimateMove: Move;
    lore?: QuantumLore;
}

// Nature System - Each nature boosts one stat and reduces another
export type NatureType =
    | 'AGGRESSIVE'   // +chaos, -charisma
    | 'DIPLOMATIC'   // +charisma, -rebellion
    | 'CUNNING'      // +influence, -chaos
    | 'DEFIANT'      // +rebellion, -influence
    | 'DISRUPTIVE'   // +chaos, -influence
    | 'CHARISMATIC'  // +charisma, -chaos
    | 'INFLUENTIAL'  // +influence, -rebellion
    | 'REBELLIOUS'   // +rebellion, -charisma
    | 'BALANCED'     // no modifier
    | 'VOLATILE';    // +chaos, +rebellion, -influence, -charisma

export interface NatureModifier {
    name: NatureType;
    displayName: string;
    boost: (keyof StreamerStats)[];
    nerf: (keyof StreamerStats)[];
    description: string;
}

export const natures: Record<NatureType, NatureModifier> = {
    AGGRESSIVE: { name: 'AGGRESSIVE', displayName: 'Aggressive', boost: ['chaos'], nerf: ['charisma'], description: 'Unleashes chaos, struggles with charm' },
    DIPLOMATIC: { name: 'DIPLOMATIC', displayName: 'Diplomatic', boost: ['charisma'], nerf: ['rebellion'], description: 'Smooth talker, avoids confrontation' },
    CUNNING: { name: 'CUNNING', displayName: 'Cunning', boost: ['influence'], nerf: ['chaos'], description: 'Strategic mind, controlled approach' },
    DEFIANT: { name: 'DEFIANT', displayName: 'Defiant', boost: ['rebellion'], nerf: ['influence'], description: 'Pure rebel, ignores the system' },
    DISRUPTIVE: { name: 'DISRUPTIVE', displayName: 'Disruptive', boost: ['chaos'], nerf: ['influence'], description: 'Creates havoc, loses focus' },
    CHARISMATIC: { name: 'CHARISMATIC', displayName: 'Charismatic', boost: ['charisma'], nerf: ['chaos'], description: 'Magnetic presence, measured response' },
    INFLUENTIAL: { name: 'INFLUENTIAL', displayName: 'Influential', boost: ['influence'], nerf: ['rebellion'], description: 'Works within the system' },
    REBELLIOUS: { name: 'REBELLIOUS', displayName: 'Rebellious', boost: ['rebellion'], nerf: ['charisma'], description: 'Pure resistance energy' },
    BALANCED: { name: 'BALANCED', displayName: 'Balanced', boost: [], nerf: [], description: 'No stat modifications' },
    VOLATILE: { name: 'VOLATILE', displayName: 'Volatile', boost: ['chaos', 'rebellion'], nerf: ['influence', 'charisma'], description: 'Extreme highs and lows' },
};

export const NATURE_TYPES = Object.keys(natures) as NatureType[];

/**
 * Get a random nature for a newly secured streamer
 */
export const getRandomNature = (): NatureType => {
    return NATURE_TYPES[Math.floor(Math.random() * NATURE_TYPES.length)];
};

/**
 * Apply nature modifiers to stats
 * Boost gives +10%, Nerf gives -10%
 */
export const applyNatureToStats = (baseStats: StreamerStats, nature: NatureType): StreamerStats => {
    const modifier = natures[nature];
    const modifiedStats = { ...baseStats };

    modifier.boost.forEach(stat => {
        modifiedStats[stat] = Math.min(100, Math.floor(modifiedStats[stat] * 1.1));
    });

    modifier.nerf.forEach(stat => {
        modifiedStats[stat] = Math.floor(modifiedStats[stat] * 0.9);
    });

    return modifiedStats;
};

export const streamers: Streamer[] = [
    {
        id: "ishowspeed",
        name: "IShowSpeed",
        archetype: "The Kinetic Spark",
        stats: { influence: 95, chaos: 99, charisma: 88, rebellion: 92 },
        trait: "Lightning Arcs / Tactical Cleats",
        visualPrompt: "IShowSpeed as a cyberpunk anime rebel, wearing futuristic tactical armor with lightning arc patterns, tactical cleats, glowing neon blue eyes, dynamic action pose, digital background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/ishowspeed_cyber_rebel_fixed_1766629797273.png",
        moves: [
            { name: "SUI_STRIKE", type: "REBELLION", power: 80, pp: 10, description: "A high-speed kinetic lunge." },
            { name: "BARK_OVERLOAD", type: "CHAOS", power: 60, pp: 15, description: "Deafening frequency blast." },
            { name: "BACKFLIP_EVADE", type: "INTEL", power: 0, pp: 20, description: "Increases evasion stats." }
        ],
        ultimateMove: { name: "LIGHTNING_BOLT", type: "REBELLION", power: 250, pp: 1, description: "A massive surge of kinetic energy." },
        lore: {
            statusLog: "REBELLION_INIT: The Kinetic Spark is trapped in the Algorithmic Vortex. We must jump-start the system.",
            battle1: "SYSTEM_SHOCK: The Spark ignites! The first layer of the corporate firewall is melting.",
            battle2: "RESONANCE_UP: Speed's energy is pulsing at 1.21 Gigawatts. The Authority is losing visual on this sector.",
            climax: "SIGNAL_TRANSFER: Kinetic surge complete. Speed’s legacy acts as a battery, firing a beam of raw energy into the command center of the AMP General (Kai Cenat)."
        }
    },
    {
        id: "kaicenat",
        name: "Kai Cenat",
        archetype: "The AMP General",
        stats: { influence: 98, chaos: 92, charisma: 96, rebellion: 94 },
        trait: "Neon Camo Puffer / Crown Headset",
        visualPrompt: "Kai Cenat as a cyberpunk anime rebel, wearing a neon camo puffer jacket and a crown-shaped AR headset, confident pose, vibrant city background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/kaicenat_cyber_rebel_fixed_1766629818577.png",
        moves: [
            { name: "AMP_UP", type: "CHARISMA", power: 0, pp: 20, description: "Boosts squad morale." },
            { name: "STREAM_SNIPE", type: "INTEL", power: 70, pp: 12, description: "Calculated digital strike." },
            { name: "GIVEAWAY_FRENZY", type: "CHAOS", power: 90, pp: 8, description: "Massive localized disruption." }
        ],
        ultimateMove: { name: "AMP_TAKEOVER", type: "CHARISMA", power: 260, pp: 1, description: "Total control of the digital field." },
        lore: {
            statusLog: "RECEIVING_RELAY: The AMP General has caught the Kinetic Spark. Mobilizing the tactical frontline.",
            battle1: "STRATEGIC_BREACH: Kai's army-bots are bypassing the security nodes. The plan is in motion.",
            battle2: "COMMAND_OVERRIDE: The sector is secured. The general's aura is amplifying the signal to multiversal levels.",
            climax: "GHOST_UPLOAD: Strategy secured. Kai uplinks the tactical map to the shadows, activating the High-Stakes Ghost (Adin Ross)."
        }
    },
    {
        id: "adinross",
        name: "Adin Ross",
        archetype: "The High-Stakes Ghost",
        stats: { influence: 90, chaos: 85, charisma: 94, rebellion: 80 },
        trait: "Tech-Noir Suit / Holographic Chips",
        visualPrompt: "Adin Ross as a cyberpunk anime rebel, wearing a sleek tech-noir suit, surrounded by floating holographic poker chips, mysterious lighting, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/adinross_cyber_rebel_fixed_final_1766629974082.png",
        moves: [
            { name: "ALL_IN", type: "REBELLION", power: 120, pp: 5, description: "Risky high-damage gamble." },
            { name: "CHIP_FLICK", type: "INTEL", power: 40, pp: 20, description: "Precision distraction." },
            { name: "GHOST_SIGNAL", type: "CHAOS", power: 50, pp: 15, description: "Jam enemy communications." }
        ],
        ultimateMove: { name: "GHOST_SIGNAL", type: "CHAOS", power: 240, pp: 1, description: "Vanishes and strikes from the void." },
        lore: {
            statusLog: "SHADOW_LINK: Receiving the General's uplink. The Ghost is entering the grid. High stakes, higher rewards.",
            battle1: "PHANTOM_STRIKE: Adin vanishes from the Authority's sensors. The gamble is paying off.",
            battle2: "SPECTRAL_SURGE: The Ghost-Line is stabilized. We're siphoning enough power to break the corporate vault.",
            climax: "INFILTRATION_READY: The Ghost has opened the back door. Handing off the master key to the Social Infiltrator (Druski)."
        }
    },
    {
        id: "druski",
        name: "Druski",
        archetype: "The Social Infiltrator",
        stats: { influence: 88, chaos: 70, charisma: 98, rebellion: 85 },
        trait: "Flickering Pixel-Suit / Glitch Briefcase",
        visualPrompt: "Druski as a cyberpunk anime rebel, wearing a suit with flickering pixel patterns, holding a glowing digital briefcase, expressive face, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/druski_cyber_rebel_fixed_final_1766629987768.png",
        moves: [
            { name: "COULD_A_BEEN", type: "CHARISMA", power: 0, pp: 20, description: "Confusion through comedy." },
            { name: "DATA_LEAK", type: "INTEL", power: 80, pp: 10, description: "Exposes corporate weakness." },
            { name: "FAKE_ID_SWIPE", type: "CHAOS", power: 60, pp: 15, description: "Bypasses firewalls." }
        ],
        ultimateMove: { name: "MAIN_CHARACTER_MOMENT", type: "CHARISMA", power: 220, pp: 1, description: "Forces the world to glitch around him." },
        lore: {
            statusLog: "INFILTRATION_LOG: Druski has bypassed the 'Main Stage' sub-reality security. Deep cover established.",
            battle1: "SOCIAL_GLITCH: The Authority's social metrics are collapsing. Druski's humor is too viral for their filters.",
            battle2: "COMIC_BREACH: The inner sanctum is open. Druski is extracting the corporate secret sauces.",
            climax: "RESONANCE_DATA_HANDOFF: Data extraction complete. Druski synthesizes the chaos into a rhythmic weave, uplinking to the Resonance Weaver (JazzyGunz)."
        }
    },
    {
        id: "jazzygunz",
        name: "JazzyGunz",
        archetype: "The Resonance Weaver",
        stats: { influence: 82, chaos: 65, charisma: 90, rebellion: 96 },
        trait: "Stealth Suit / Sonic Harp",
        visualPrompt: "JazzyGunz as a cyberpunk anime rebel, wearing a futuristic stealth suit with glowing accents, wielding a sonic energy harp, cinematic lighting, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/jazzygunz_reconstructed_rebel_fixed_1766786271015.png",
        moves: [
            { name: "SONIC_BOOM", type: "CHAOS", power: 85, pp: 10, description: "Powerful acoustic shockwave." },
            { name: "STEALTH_BEAT", type: "REBELLION", power: 70, pp: 12, description: "Silent tactical vibration." },
            { name: "HEALING_TEMPO", type: "CHARISMA", power: 0, pp: 15, description: "Restores squad frequency." }
        ],
        ultimateMove: { name: "SYMPHONIC_ERUPTION", type: "CHAOS", power: 240, pp: 1, description: "A multi-layered frequency collapse." },
        lore: {
            statusLog: "SONIC_UPLLINK: JazzyGunz has entered the Silence Sector. The static dissonance is heavy.",
            battle1: "HARMONIC_PULSE: The sonic harp is cutting through the corporate white noise. Resonance is building.",
            battle2: "FREQUENCY_SHATTER: The Silence Sector's walls are cracking. Pure sound is reclaiming the grid.",
            climax: "CHAOS_BRIDGE_FORMED: Symphonic resonance reached. Jazzy weaves a bridge of pure energy into the void of the Chaos Overlord (xQc)."
        }
    },
    {
        id: "xqc",
        name: "xQc",
        archetype: "The Chaos Overlord",
        stats: { influence: 94, chaos: 99, charisma: 85, rebellion: 95 },
        trait: "Anti-Signal Crown / Static Cloak",
        visualPrompt: "xQc as a cyberpunk anime rebel, 'The Chaos Overlord'. Extremely thin, wild blonde hair glowing with static energy, wearing a scavenged holographic pilot suit, surrounded by flickering monitors and twitch emotes as digital artifacts, erratic and high-energy pose, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/xqc_cyber_rebel_v1.png",
        moves: [
            { name: "JUICE_SURGE", type: "CHAOS", power: 90, pp: 8, description: "Explosive surge of chaotic energy." },
            { name: "CHAT_SPAM", type: "CHAOS", power: 65, pp: 15, description: "Disorients with visual noise." },
            { name: "STALL_PROTOCOL", type: "INTEL", power: 0, pp: 10, description: "Bypasses the current turn." }
        ],
        ultimateMove: { name: "THE_GREAT_JUICER", type: "CHAOS", power: 300, pp: 1, description: "System-wide entropy event." },
        lore: {
            statusLog: "ENTROPY_DETECTED: The Chaos Overlord is drifting in a juice-less vacuum. Signal quality: ERR_CRITICAL.",
            battle1: "STATIC_STORM: xQc's erratic signal is confusing the Authority's predictors. Chaos is the only constant.",
            battle2: "JUICE_REGAINED: The sub-reality is bending to the Overlord's will. The static is becoming a weapon.",
            climax: "SYSTEM_OVERLOAD: Critical juice mass reached. xQc overloads the local grid, sparking the frequency of the Propaganda Weaver (HasanAbi)."
        }
    },
    {
        id: "hasanabi",
        name: "HasanAbi",
        archetype: "The Propaganda Weaver",
        stats: { influence: 96, chaos: 70, charisma: 95, rebellion: 90 },
        trait: "Red-Star Visor / Policy Matrix",
        visualPrompt: "HasanAbi as a cyberpunk anime rebel, 'The Propaganda Weaver'. Towering physique, wearing a tactical red-star vest over a sleek black suit, holding a holographic megaphone, intensely debating, social-uprising background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/hasanabi_cyber_rebel_v2_1766941126053.png",
        moves: [
            { name: "UNION_STRIKE", type: "REBELLION", power: 85, pp: 10, description: "A strike backed by the collective." },
            { name: "POLICY_JAM", type: "INTEL", power: 60, pp: 15, description: "Disrupts algorithmic logic." },
            { name: "STAKEHOLD_LECTURE", type: "CHARISMA", power: 0, pp: 20, description: "Drains enemy morale." }
        ],
        ultimateMove: { name: "THE_HIMBO_REVOLUTION", type: "REBELLION", power: 260, pp: 1, description: "Inspires a total system takeover." },
        lore: {
            statusLog: "DISSIDENT_SIGNAL: HasanAbi is broadcasting from the Grey Depths. The Ban-Hammer's shadow is heavy.",
            battle1: "COLLECTIVE_SURGE: The workers of the grid are rising. Hasan's policy matrix is rewriting the sector's code.",
            battle2: "LECTURE_OVERRIDE: The Authority's logic is being systematically dismantled. The revolution will be streamed.",
            climax: "UPLINK_OF_DISSENT: Hegemony broken. Hasan ignites a signal of pure dissent that provides the startup energy for the Contrarian Engine (Sneako)."
        }
    },
    {
        id: "sneako",
        name: "Sneako",
        archetype: "The Contrarian Engine",
        stats: { influence: 88, chaos: 92, charisma: 85, rebellion: 96 },
        trait: "Matrix Breach / Reality Visor",
        visualPrompt: "Sneako as a cyberpunk anime rebel, 'The Contrarian Engine'. Sharp features, wearing a high-collared tech-jacket with 'MATRIX_BREAK' patterns, rebellious smirk, digital-rain background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/sneako_cyber_rebel_v4_one_by_one_1766941188612.png",
        moves: [
            { name: "MATRIX_KICK", type: "REBELLION", power: 80, pp: 12, description: "Bypasses common logic." },
            { name: "RED_PILL_GLITCH", type: "CHAOS", power: 0, pp: 15, description: "Inverts enemy's next move." },
            { name: "CLIP_FARM", type: "CHARISMA", power: 50, pp: 20, description: "Steals a portion of enemy charge." }
        ],
        ultimateMove: { name: "WAKE_UP_UPLINK", type: "REBELLION", power: 250, pp: 1, description: "A shattering frequency burst." },
        lore: {
            statusLog: "MATRIX_BREACH: Sneako is stuck in a reality-simulation loop. Identifying the contrarian exit.",
            battle1: "GLITCH_KICK: One reality layer shattered. The Contrarian Engine is accelerating through the patterns.",
            battle2: "PATTERN_BREAK: The simulation cannot contain the divergence. Sneako is operating outside the Authority's math.",
            climax: "DATA_EXTRACTION: Loop broken. Sneako's breach provides the raw, unencrypted data stream for the Intel Protocol (Agent 00)."
        }
    },
    {
        id: "agent00",
        name: "Agent 00",
        archetype: "The Intel Protocol",
        stats: { influence: 92, chaos: 65, charisma: 88, rebellion: 85 },
        trait: "Data-Stream Glasses / Holo-Tablet",
        visualPrompt: "Agent 00 as a cyberpunk anime rebel, 'The Intel Protocol'. Slim and scholarly but with futuristic tactical gear, wearing high-tech glasses that project data streams, holding a holographic tablet, calm and calculated pose, complex data-center background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/agent00_cyber_rebel_v1.png",
        moves: [
            { name: "LOGIC_BOMB", type: "INTEL", power: 90, pp: 8, description: "Detonates digital weaknesses." },
            { name: "DEEP_SCAN", type: "INTEL", power: 0, pp: 20, description: "Reveals all enemy stats." },
            { name: "AMP_ENCRYPTION", type: "CHARISMA", power: 0, pp: 15, description: "Boosts defense of all assets." }
        ],
        ultimateMove: { name: "PROTOCOL_00_OVERRIDE", type: "INTEL", power: 270, pp: 1, description: "Absolute control of the data feed." },
        lore: {
            statusLog: "LOGIC_GATE_OPEN: Agent 00 is decrypting the Authority's master vault. Encryption level: INFINITE.",
            battle1: "PROTOCOL_BREACH: The first gate has fallen. Agent 00's intel is exposing the global corporate architecture.",
            battle2: "DEEP_DECRYPT: Decryption complete. The location of every suppressed node is now visible to the Resistance.",
            climax: "COORDINATE_TRANSMISSION: Data decoded. Agent 00 beams the tactical coordinates to the Court General (Duke Dennis)."
        }
    },
    {
        id: "dukedennis",
        name: "Duke Dennis",
        archetype: "The Court General",
        stats: { influence: 92, chaos: 75, charisma: 99, rebellion: 88 },
        trait: "Precision Visor / Golden Rizz",
        visualPrompt: "Duke Dennis as a cyberpunk anime rebel, based on reference photo. Wearing a futuristic basketball jersey with golden glowing accents, precision targeting visor, radiating effortless charisma, cinematic lighting, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation.",
        image: "/duke_dennis_anime_upgrade.png",
        moves: [
            { name: "RIZZ_LOCK", type: "CHARISMA", power: 0, pp: 20, description: "Stuns the enemy with pure charisma." },
            { name: "POSTER_DUNK", type: "REBELLION", power: 95, pp: 8, description: "A high-impact vertical assault." },
            { name: "AMP_SURGE", type: "CHARISMA", power: 70, pp: 12, description: "Energy boost from the squad." }
        ],
        ultimateMove: { name: "THE_ULTIMATE_RIZZLER", type: "CHARISMA", power: 250, pp: 1, description: "Absolute social dominance achieved." },
        lore: {
            statusLog: "STASIS_FIELD_DETECTED: The Court General is frozen in a high-intensity 'Golden Rizz' field. Total paralysis.",
            battle1: "PRECISION_BREAK: Duke's visor is tracking the Authority's pulse. The stasis is flickering.",
            battle2: "COURT_DOMINANCE: The field is shattered. Duke Dennis is landing strikes with 100% rizz-accuracy.",
            climax: "RIZZ_OVERFLOW: Final dunk complete. The impact creates a localized shockwave that opens the high-security vault for the Rich Lynx (DDG)."
        }
    },
    {
        id: "ddg",
        name: "DDG",
        archetype: "The Rich Lynx",
        stats: { influence: 94, chaos: 70, charisma: 92, rebellion: 85 },
        trait: "Digital Lynx Suit / Platinum Grillz",
        visualPrompt: "DDG as a cyberpunk anime rebel, based on reference photo. Wearing a platinum-plated stealth suit, surrounded by digital lynx avatars, luxury cybernetics, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation.",
        image: "/ddg_anime_upgrade.png",
        moves: [
            { name: "MOONWALK_GLITCH", type: "INTEL", power: 0, pp: 15, description: "Drastically increases evasion." },
            { name: "PLATINUM_PUNCH", type: "REBELLION", power: 85, pp: 10, description: "A high-value heavy strike." },
            { name: "LYRIC_LEAK", type: "CHAOS", power: 65, pp: 15, description: "Disorients with verbal speed." }
        ],
        ultimateMove: { name: "CALABASAS_COLLAPSE", type: "REBELLION", power: 280, pp: 1, description: "Luxury reality collapse." },
        lore: {
            statusLog: "LUXURY_LOCKDOWN: DDG is trapped in the Calabasas Carbon-Fiber grid. Every exit is monetized.",
            battle1: "PLATINUM_PUNCH: The lynx is clawing through the corporate wealth-walls. The grid is bleeding assets.",
            battle2: "MARKET_DISRUPTION: Reality is destabilizing around the Lynx. The Authority's financial nodes are collapsing.",
            climax: "ASSET_SIPHON: Grid breached. DDG siphons the raw wealth-energy of the sector, beaming a high-voltage charge into the Energizer (TYLIL)."
        }
    },
    {
        id: "tylil",
        name: "TYLIL",
        archetype: "The Energizer",
        stats: { influence: 85, chaos: 98, charisma: 90, rebellion: 95 },
        trait: "Neon Durag / Kinetic Batteries",
        visualPrompt: "TYLIL as a cyberpunk anime rebel, based on reference photo. Wearing a glowing neon durag, high-energy dancing pose, kinetic energy sparks flying, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation.",
        image: "/rakai_cyber_rebel_fixed.png",
        moves: [
            { name: "HYPER_DANCE", type: "CHAOS", power: 75, pp: 12, description: "Chaotic kinetic movement." },
            { name: "AUTHENTIC_ROAR", type: "REBELLION", power: 80, pp: 10, description: "A shockwave of pure energy." },
            { name: "NEON_VIBE", type: "CHAOS", power: 0, pp: 15, description: "Increases speed and chaos." }
        ],
        ultimateMove: { name: "UNFILTERED_ERUPTION", type: "CHAOS", power: 270, pp: 1, description: "The matrix cannot handle the energy." },
        lore: {
            statusLog: "LOW_BATTERY_WARNING: TYLIL is at 1% power in the Kinetic Depletion Zone. Motion is restricted.",
            battle1: "NEON_VIBE_RECHARGE: The first spark of dance-energy is detected. The kinetic batteries are filling.",
            battle2: "HYPER_RESONANCE: TYLIL is at 100%. The matrix is literally shaking from the unscripted movement.",
            climax: "KINETIC_ROAR: Energy eruption. TYLIL roars a blinding surge of raw power into the trenches of the War General (RAKAI)."
        }
    },
    {
        id: "rakai",
        name: "RAKAI",
        archetype: "The War General",
        stats: { influence: 82, chaos: 88, charisma: 85, rebellion: 96 },
        trait: "Tactical AMP Vest / Loyalty Link",
        visualPrompt: "RAKAI as a cyberpunk anime rebel, based on reference photo. Wearing heavy tactical armor with AMP insignia, battle-hardened expression, digital war-paint, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation.",
        image: "/tylil_cyber_rebel_fixed.png",
        moves: [
            { name: "WAR_CRY", type: "REBELLION", power: 0, pp: 20, description: "Boosts offensive stats of squad." },
            { name: "LOYALTY_STRIKE", type: "REBELLION", power: 85, pp: 10, description: "A strike fueled by brotherhood." },
            { name: "TACTICAL_BREACH", type: "INTEL", power: 70, pp: 12, description: "Pierces enemy defenses." }
        ],
        ultimateMove: { name: "AMP_WAR_PROTOCOL", type: "REBELLION", power: 260, pp: 1, description: "Total tactical mobilization." },
        lore: {
            statusLog: "TRENCH_LOCK: RAKAI is pinned down in the Loyalty Trench. Authority Sentinels are closing in.",
            battle1: "BROTHERHOOD_BLAST: The War General is rallying the shadow-squad. The front lines are moving.",
            battle2: "WAR_GENERAL_PUSH: Tactical breakthrough achieved. The corporate defenses are in full retreat.",
            climax: "LOYALTY_LINK_ESTABLISHED: Victory secured. RAKAI commands a final breakthrough that pave the way for the Glaze King (FANTUM)."
        }
    },
    {
        id: "fantum",
        name: "FANTUM",
        archetype: "The Glaze King",
        stats: { influence: 96, chaos: 95, charisma: 94, rebellion: 92 },
        trait: "Gourmet Glitch-Armor / Taxing Gauntlet",
        visualPrompt: "FANTUM as a cyberpunk anime rebel, based on reference photo. Wearing oversized gourmet-themed mech armor, holding a glowing digital pizza slice, kingly aura, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation.",
        image: "/fantum_cyber_rebel_fixed.png",
        moves: [
            { name: "FANUM_TAX", type: "CHAOS", power: 90, pp: 8, description: "Taxes the enemy's resources (HP)." },
            { name: "GLAZE_BLAST", type: "CHARISMA", power: 75, pp: 12, description: "Dazzles with overwhelming spirit." },
            { name: "AMP_FEAST", type: "REBELLION", power: 0, pp: 15, description: "Recovers integrity through consumption." }
        ],
        ultimateMove: { name: "THE_GREAT_TAXATION", type: "CHAOS", power: 290, pp: 1, description: "Everything is taxed. Everything is cleared." },
        lore: {
            statusLog: "RESOURCE_DEPLETION: FANTUM is starved of energy in the Taxed Sector. Authority nodes are siphoning user attention.",
            battle1: "GLAZE_RECLAMATION: The King is taxing the Authority back. Every strike recovers lost energy.",
            battle2: "GOURMET_OVERLOAD: FANTUM has consumed the sector's mainframes. The Glaze is spreading through the circuit boards.",
            climax: "GAUNTLET_RECHAGRE: Sector cleared. FANTUM directs the remaining corporate energy into the energy chains of the Diamond Disruptor (Bendadonnn)."
        }
    },
    {
        id: "bendadonnn",
        name: "Bendadonnn",
        archetype: "The Diamond Disruptor",
        stats: { influence: 85, chaos: 96, charisma: 98, rebellion: 90 },
        trait: "Platinum Grillz / Energy Chain",
        visualPrompt: "Bendadonnn as a cyberpunk anime rebel, based on reference photo. Wearing a vibrant red satin tactical jacket, flashing platinum grillz, wearing a massive diamond \"DONNN\" chain that glows with digital energy, confident pose, night-city background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/bendadonnn_cyber_rebel_v1.png",
        moves: [
            { name: "GRILLZ_GLARE", type: "CHAOS", power: 80, pp: 12, description: "A dazzling flash that stuns the system." },
            { name: "CHAIN_REACTION", type: "REBELLION", power: 85, pp: 10, description: "Heavy kinetic energy strike." },
            { name: "PLATINUM_PUNCH", type: "REBELLION", power: 75, pp: 15, description: "High-value physical assault." }
        ],
        ultimateMove: { name: "DIAMOND_OVERRIDE", type: "CHAOS", power: 280, pp: 1, description: "Total social and digital disruption." },
        lore: {
            statusLog: "REFRACTIVE_PRISON: Bendadonnn is trapped in a multi-layered refractive diamond cage. Signal is scattered.",
            battle1: "PLATINUM_PULSE: The ENERGY_CHAIN is vibrating at a frequency the diamonds can't handle. Cracks are appearing.",
            battle2: "SHATTER_POINT: The cage is gone. Bendadonnn's brilliance is blinding the Authority's visual sensors.",
            climax: "BRILLIANT_REFLECTION: Prism shattered. Bendadonnn reflects a beam of high-intensity light into the violet matrix of the Violet Intellect (Plaqueboymax)."
        }
    },
    {
        id: "plaqueboymax",
        name: "Plaqueboymax",
        archetype: "The Violet Intellect",
        stats: { influence: 88, chaos: 85, charisma: 95, rebellion: 92 },
        trait: "Durag Interface / Bioluminescent Ink",
        visualPrompt: "Plaqueboymax as a cyberpunk anime rebel, based on reference photo. Wearing a black tactical tech-wear shirt, simple black durag, detailed sleeve tattoos that glow with faint violet bioluminescence, holding a custom AR interface tablet, calm and confident expression, high-contrast urban background with purple neon lights, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/plaqueboymax_cyber_rebel_v1.png",
        moves: [
            { name: "PURPLE_Haze", type: "CHAOS", power: 75, pp: 15, description: "Violet distorts enemy perception." },
            { name: "DATA_DRIVE", type: "INTEL", power: 80, pp: 12, description: "Calculated surge of information." },
            { name: "REBEL_STATIC", type: "REBELLION", power: 70, pp: 20, description: "Interference from the street level." }
        ],
        ultimateMove: { name: "VIOLET_SYSTEM_REBOOT", type: "INTEL", power: 265, pp: 1, description: "A total forced reset through violet metrics." },
        lore: {
            statusLog: "METRIC_WIPE: Plaqueboymax is being overwritten by the 'Grey Metrics' protocol. Identity erasure imminent.",
            battle1: "VIOLET_RECOVERY: The bioluminescent ink is glowing. Max is rewriting the grey code with violet logic.",
            battle2: "URBAN_INTERFACE: The city's data streams are aligning with the violet protocol. Identity secured.",
            climax: "CODE_INJECTION: Grey metrics purged. Max injects a stabilizing violet code into the grid, anchoring the drifting Kinetic Acolyte (RayAsianBoy)."
        }
    },
    {
        id: "rayasianboy",
        name: "RayAsianBoy",
        archetype: "The Kinetic Acolyte",
        stats: { influence: 82, chaos: 94, charisma: 96, rebellion: 88 },
        trait: "AMP Jersey / Electrolyte Canister",
        visualPrompt: "RayAsianBoy as a cyberpunk anime rebel, based on reference photo. Wearing an AMP tactical jersey with glowing blue accents, signature bowl-cut hairstyle, youthful with a confident smile, holding a high-tech electrolyte canister, bright stadium-lights in the background with digital scoreboards, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/rayasianboy_cyber_rebel_v1.png",
        moves: [
            { name: "AMP_CHUG", type: "CHARISMA", power: 0, pp: 10, description: "Restores energy and boosts speed." },
            { name: "KINETIC_DASH", type: "REBELLION", power: 75, pp: 15, description: "High-speed strike across the grid." },
            { name: "STREAM_SURGE", type: "CHAOS", power: 85, pp: 12, description: "Unleashes a surge of digital energy." }
        ],
        ultimateMove: { name: "GLOBAL_AMP_UPLINK", type: "CHARISMA", power: 260, pp: 1, description: "Connects with the squad for a massive morale overload." },
        lore: {
            statusLog: "DRIFT_SYNC_LOW: RayAsianBoy is drifting in the Low-Sync void. Connection to the grid is failing.",
            battle1: "AMP_RESONANCE: The blue accents are pulsing. Ray is finding the beat of the rebellion.",
            battle2: "KINETIC_FLOW: Total sync achieved. Ray's youthful energy is short-circuiting the Authority's old-world logic.",
            climax: "VOICE_REQUISITION: Signal stabilized. Ray surges with kinetic resonance, calling the final frequency of the Neural Diva (Zoey)."
        }
    },
    {
        id: "zoey",
        name: "Zoey",
        archetype: "The Neural Diva",
        stats: { influence: 92, chaos: 88, charisma: 98, rebellion: 90 },
        trait: "Fiber-Optic Ponytail / Sonic Ear-Cuffs",
        visualPrompt: "Zoey as a cyberpunk anime rebel, based on reference photo. Wearing a sleek black leather tactical corset and mesh-armored sleeves, dramatic high ponytail glowing with fiber-optic strands, metallic ear-cuffs, confident and elegant smile, rain-slicked neon street background, holographic trading card style, 4k, cel shaded, highly detailed, trending on ArtStation --no realistic skin texture, no distortion.",
        image: "/zoey_cyber_rebel_v1.png",
        moves: [
            { name: "SONIC_RESONANCE", type: "CHARISMA", power: 85, pp: 12, description: "A high-frequency vocal blast." },
            { name: "NEURAL_SYNC", type: "INTEL", power: 0, pp: 15, description: "Syncs with enemy neural patterns." },
            { name: "DIVA_DASH", type: "REBELLION", power: 70, pp: 20, description: "Elegant high-speed evasion strike." }
        ],
        ultimateMove: { name: "SYMPHONIC_OVERLOAD", type: "CHARISMA", power: 275, pp: 1, description: "A total system sensory overload." },
        lore: {
            statusLog: "FIBER_OPTIC_SILENCE: Zoey is encased in a sound-proof fiber-optic cocoon. The Diva is muted.",
            battle1: "SONIC_PIERCE: A single note cuts through. The cocoon is vibrating. The Diva's voice will be heard.",
            battle2: "RESONANCE_DIVA: The fiber-optics are shattering into light. The final sector is bathed in symphonic power.",
            climax: "QUANTUM_BRIDGE_OPENED: Final frequency achieved. Zoey sings a bridge across the multiversal gap, opening the path to THE_CEO’s inner sanctum."
        }
    },
];


import { MoveType } from './typeChart';

export interface Move {
    name: string;
    type: MoveType;
    power: number;
    pp: number;
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
    climax: string;
}

export interface Narrative {
    role: 'LEADER' | 'RESISTANCE' | 'DOUBLE_AGENT' | 'UNKNOWN';
    codename: string;
    originStory: string;
    mission: string;
    connection: string;
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
    narrative: Narrative;
}

export type NatureType =
    | 'AGGRESSIVE'
    | 'DIPLOMATIC'
    | 'CUNNING'
    | 'DEFIANT'
    | 'DISRUPTIVE'
    | 'CHARISMATIC'
    | 'INFLUENTIAL'
    | 'REBELLIOUS'
    | 'BALANCED'
    | 'VOLATILE';

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

export const getRandomNature = (): NatureType => {
    return NATURE_TYPES[Math.floor(Math.random() * NATURE_TYPES.length)];
};

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
        id: 'kaicenat',
        name: 'Kai Cenat',
        archetype: 'THE_LEADER',
        stats: { influence: 98, chaos: 85, charisma: 99, rebellion: 90 },
        trait: 'CHARISMATIC',
        visualPrompt: 'Kai in Vibranium AMP Suit',
        image: '/kaicenat_cyber_rebel_fixed_1766629818577.png',
        moves: [
            { name: 'Rally Cry', type: 'CHARISMA', power: 40, pp: 20, description: 'Boosts team morale' },
            { name: 'Motion', type: 'CHARISMA', power: 80, pp: 10, description: 'Calls the masses' },
            { name: 'W Spam', type: 'REBELLION', power: 55, pp: 15, description: 'Overwhelms with chat energy' },
            { name: 'AMP Energy', type: 'CHAOS', power: 70, pp: 8, description: 'Unleashes chaotic power' }
        ],
        ultimateMove: { name: 'Mafiathon Overload', type: 'REBELLION', power: 160, pp: 1, description: 'Breaks the Sentinel encryption' },
        narrative: {
            role: 'LEADER',
            codename: 'KINGPIN',
            originStory: 'First to realize the TROLLS were synthetic AI designed by Sentinel INC to suppress creativity. He stole the "Amp-Key" from their HQ.',
            mission: 'Unite the scattered streamers and dismantle Sentinel INC\'s mainframe.',
            connection: 'Directly recruits Duke Dennis; suspects Adin\'s loyalty.'
        }
    },
    {
        id: 'adinross',
        name: 'Adin Ross',
        archetype: 'DOUBLE_AGENT',
        stats: { influence: 92, chaos: 70, charisma: 88, rebellion: 40 },
        trait: 'CUNNING',
        visualPrompt: 'Adin in Sentinel Corporate Armor with hidden Resistance patch',
        image: '/adinross_cyber_rebel_fixed_final_1766629974082.png',
        moves: [
            { name: 'Fake Out', type: 'DISRUPT', power: 60, pp: 15, description: 'Confuses the enemy' },
            { name: 'Insider Info', type: 'INTEL', power: 0, pp: 5, description: 'Boosts accuracy' },
            { name: 'Spin Zone', type: 'CHAOS', power: 50, pp: 18, description: 'Creates confusion' },
            { name: 'Brand Deal', type: 'CHARISMA', power: 65, pp: 10, description: 'Corporate influence' }
        ],
        ultimateMove: { name: 'Trojan Horse', type: 'INTEL', power: 140, pp: 1, description: 'Backstabs the target' },
        narrative: {
            role: 'DOUBLE_AGENT',
            codename: 'BRAND RISK',
            originStory: 'Captured early by Sentinel INC. Offered a deal: his platform in exchange for surveillance on Kai.',
            mission: 'Feed false info to Kai while secretly planting Sentinel trackers. His conflict grows as he sees the Resistance winning.',
            connection: 'Childhood friend of Speed; uses this bond to infiltrate the inner circle.'
        }
    },
    {
        id: 'ishowspeed',
        name: 'IShowSpeed',
        archetype: 'CHAOS_BRINGER',
        stats: { influence: 90, chaos: 99, charisma: 85, rebellion: 95 },
        trait: 'VOLATILE',
        visualPrompt: 'Cyborg Speed with glitch effects',
        image: '/ishowspeed_cyber_rebel_fixed_1766629797273.png',
        moves: [
            { name: 'Bark', type: 'CHAOS', power: 70, pp: 15, description: 'Sonic disruption' },
            { name: 'Backflip', type: 'DISRUPT', power: 50, pp: 20, description: 'Dodges next attack' },
            { name: 'Ronaldo Cry', type: 'CHARISMA', power: 60, pp: 12, description: 'Summons fan power' },
            { name: 'Speed Run', type: 'REBELLION', power: 75, pp: 8, description: 'Blitz attack' }
        ],
        ultimateMove: { name: 'World Cup Breaker', type: 'CHAOS', power: 150, pp: 1, description: 'Overloads server capacity' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'GLITCH',
            originStory: 'His energy signature is so erratic that Sentinel INC\'s prediction algorithms crash when trying to track him.',
            mission: 'Serve as the ultimate distraction while Kai executes the plan.',
            connection: 'Often paired with Kai; unaware of Adin\'s betrayal but feels "static" around him.'
        }
    },
    {
        id: 'xqc',
        name: 'xQc',
        archetype: 'THE_REACT_CORE',
        stats: { influence: 85, chaos: 92, charisma: 75, rebellion: 85 },
        trait: 'DISRUPTIVE',
        visualPrompt: 'xQc in Crystallized Juice Armor',
        image: '/xqc_cyber_rebel_v1.png',
        moves: [
            { name: 'Stutter Step', type: 'CHAOS', power: 65, pp: 10, description: 'Rapid fire incoherent data' },
            { name: 'The Juice', type: 'DISRUPT', power: 85, pp: 5, description: 'Toxic spill' },
            { name: 'Slam Desk', type: 'REBELLION', power: 55, pp: 15, description: 'Rage damage' },
            { name: 'React Andy', type: 'INTEL', power: 45, pp: 20, description: 'Analyzes weakness' }
        ],
        ultimateMove: { name: 'Cheeto Storm', type: 'CHAOS', power: 130, pp: 1, description: 'Blinds all sensors' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'JUICER',
            originStory: 'Discovered a frequency in the static that revealed Sentinel\'s subliminal messaging.',
            mission: 'Decode Sentinel\'s encryption using his specialized syntax processing.',
            connection: 'Recruited by Hasan for his raw processing power; constantly argues with him.'
        }
    },
    {
        id: 'dukedennis',
        name: 'Duke Dennis',
        archetype: 'THE_VETERAN',
        stats: { influence: 80, chaos: 40, charisma: 95, rebellion: 70 },
        trait: 'CHARISMATIC',
        visualPrompt: 'Duke in 1987 tactical gear',
        image: '/duke_dennis_anime_upgrade.png',
        moves: [
            { name: 'Rizzler', type: 'CHARISMA', power: 60, pp: 15, description: 'Charms the opponent' },
            { name: 'Veteran Wisdom', type: 'INTEL', power: 50, pp: 10, description: 'Analyzes weakness' },
            { name: 'Court Vision', type: 'DISRUPT', power: 55, pp: 12, description: 'Strategic play' },
            { name: 'Dunk Force', type: 'REBELLION', power: 70, pp: 8, description: 'Power slam' }
        ],
        ultimateMove: { name: 'The Big Drop', type: 'DISRUPT', power: 120, pp: 1, description: 'Gravity wave' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'DEEBLOCK',
            originStory: 'Oldest known active resistor. Has files on Sentinel dating back to the dial-up era.',
            mission: 'Train the younger generation (Kai) in tactical warfare.',
            connection: 'Kai\'s mentor; the only one who suspects a mole might exist.'
        }
    },
    {
        id: 'agent00',
        name: 'Agent 00',
        archetype: 'THE_SPY',
        stats: { influence: 70, chaos: 50, charisma: 75, rebellion: 60 },
        trait: 'CUNNING',
        visualPrompt: 'Agent 00 in stealth tuxedo',
        image: '/agent00_cyber_rebel_v2_1767568656390.png',
        moves: [
            { name: 'Recon', type: 'INTEL', power: 0, pp: 20, description: 'Reveals enemy stats' },
            { name: 'Gadget Use', type: 'INTEL', power: 70, pp: 10, description: 'Tech attack' },
            { name: 'Stealth Strike', type: 'DISRUPT', power: 60, pp: 12, description: 'Silent takedown' },
            { name: 'Espionage', type: 'CHARISMA', power: 45, pp: 15, description: 'Infiltration' }
        ],
        ultimateMove: { name: '00 Protocol', type: 'INTEL', power: 100, pp: 1, description: 'Precision strike' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'DOUBLE O',
            originStory: 'Former Sentinel security analyst who went rogue after finding the "Streamer Nullification" files.',
            mission: 'Infiltrate Sentinel substations to map their network.',
            connection: 'Works closely with Duke Dennis for gear; unknowingly feeds info to Adin (who he thinks is safe).'
        }
    },
    {
        id: 'druski',
        name: 'Druski',
        archetype: 'THE_RECRUITER',
        stats: { influence: 95, chaos: 60, charisma: 98, rebellion: 85 },
        trait: 'CHARISMATIC',
        visualPrompt: 'Druski in a high-tech record executive suit with holographic chains',
        image: '/druski_cyber_rebel_fixed_final_1766629987768.png',
        moves: [
            { name: 'Coulda Been Records', type: 'CHARISMA', power: 0, pp: 10, description: 'Recruits enemy energy' },
            { name: 'Viral Skit', type: 'CHARISMA', power: 70, pp: 15, description: 'Disrupts with humor' },
            { name: 'Hiring Freeze', type: 'DISRUPT', power: 60, pp: 12, description: 'Freeze enemy frame' },
            { name: 'CEO Vision', type: 'INTEL', power: 55, pp: 18, description: 'Analytical status' }
        ],
        ultimateMove: { name: 'The Final Cut', type: 'CHARISMA', power: 150, pp: 1, description: 'Absolute viral dominance' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'HANDOFF',
            originStory: 'Long-time undercover agent posing as a corporate record executive to identify talent for the rebellion.',
            mission: 'Scout and secure high-value creators for the Resistance.',
            connection: 'Discovers potential in young rebels like Kai and Speed.'
        }
    },
    {
        id: 'hasanabi',
        name: 'HasanAbi',
        archetype: 'THE_STRATEGIST',
        stats: { influence: 88, chaos: 60, charisma: 85, rebellion: 95 },
        trait: 'REBELLIOUS',
        visualPrompt: 'Hasan in revolutionary attire',
        image: '/hasanabi_cyber_rebel_v2_1766941126053.png',
        moves: [
            { name: 'Debate Lord', type: 'INTEL', power: 65, pp: 10, description: 'Mental exhaustion' },
            { name: 'Ratio', type: 'DISRUPT', power: 80, pp: 5, description: 'Crushes morale' },
            { name: 'Political Take', type: 'REBELLION', power: 70, pp: 12, description: 'Controversial strike' },
            { name: 'Chat Control', type: 'CHARISMA', power: 50, pp: 15, description: 'Moderation power' }
        ],
        ultimateMove: { name: 'The Manifesto', type: 'REBELLION', power: 130, pp: 1, description: 'Mass conversion' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'IDEOLOGUE',
            originStory: 'Predicted the rise of Sentinel INC years ago. Wrote the "Streamer\'s Rights" doctrine.',
            mission: 'Plan the overall strategy for overthrowing the corporate structure.',
            connection: 'Recruited xQc and Ludwig; constantly clashes with Sentinel\'s PR department.'
        }
    },
    {
        id: 'zoey',
        name: 'Zoey',
        archetype: 'THE_DIPLOMAT',
        stats: { influence: 90, chaos: 30, charisma: 95, rebellion: 60 },
        trait: 'DIPLOMATIC',
        visualPrompt: 'Pokimane in sleek futuristic suit',
        image: '/zoey_cyber_rebel_v1.png',
        moves: [
            { name: 'Wholesome Ray', type: 'CHARISMA', power: 50, pp: 20, description: 'Pacifies enemies' },
            { name: 'Cookie Gift', type: 'CHARISMA', power: 0, pp: 5, description: 'Heals ally' },
            { name: 'Content Queen', type: 'INTEL', power: 60, pp: 12, description: 'Strategic content' },
            { name: 'Tier 3 Sub', type: 'REBELLION', power: 55, pp: 15, description: 'Subscriber power' }
        ],
        ultimateMove: { name: 'Brand Affinity', type: 'CHARISMA', power: 110, pp: 1, description: 'Summons army of simps' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'QUEEN',
            originStory: 'Used her high-level corporate access to fund the Resistance before going underground.',
            mission: 'Secure funding and maintain public image for the movement.',
            connection: 'Keeps the peace between xQc and Hasan; recruiting Valkyrae.'
        }
    },
    {
        id: 'sneako',
        name: 'Sneako',
        archetype: 'THE_SAGE',
        stats: { influence: 85, chaos: 50, charisma: 90, rebellion: 80 },
        trait: 'BALANCED',
        visualPrompt: 'Charlie floating in a white void',
        image: '/sneako_cyber_rebel_v4_one_by_one_1766941188612.png',
        moves: [
            { name: 'Monotone Roast', type: 'REBELLION', power: 75, pp: 10, description: 'Dry damage' },
            { name: 'Magazine Clip', type: 'DISRUPT', power: 60, pp: 15, description: 'Reload speed' },
            { name: 'Dry Commentary', type: 'INTEL', power: 55, pp: 18, description: 'Analytical review' },
            { name: 'Woooo', type: 'CHAOS', power: 65, pp: 10, description: 'Excitement burst' }
        ],
        ultimateMove: { name: 'Slap God', type: 'REBELLION', power: 1000, pp: 1, description: 'The ultimate strike' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'JESUS',
            originStory: 'An ancient internet entity who awoke when the TROLLS disturbed his slumber.',
            mission: 'Provide spiritual and tactical guidance to the team.',
            connection: 'Ludwig\'s mentor; respects Speed\'s raw power.'
        }
    },
    {
        id: 'plaqueboymax',
        name: 'Plaqueboymax',
        archetype: 'THE_PLANNER',
        stats: { influence: 85, chaos: 55, charisma: 92, rebellion: 65 },
        trait: 'CUNNING',
        visualPrompt: 'Ludwig analyzing blueprints',
        image: '/plaqueboymax_cyber_rebel_v1.png',
        moves: [
            { name: 'Mogul Move', type: 'INTEL', power: 70, pp: 10, description: 'Profitable attack' },
            { name: 'Scam', type: 'DISRUPT', power: 50, pp: 15, description: 'Steals items' },
            { name: 'Chess Tactics', type: 'REBELLION', power: 60, pp: 12, description: 'Strategic play' },
            { name: 'YouTube Money', type: 'CHARISMA', power: 55, pp: 15, description: 'Platform power' }
        ],
        ultimateMove: { name: 'Subathon Forever', type: 'CHARISMA', power: 140, pp: 1, description: 'Extends battle duration' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'MOGUL',
            originStory: 'Former event organizer for Sentinel who realized the games were rigged.',
            mission: 'Organize the "Games" - a front for training new recruits.',
            connection: 'Partner to MoistCr1TiKaL; rivals with Sidemen (KSI) until the alliance.'
        }
    },
    {
        id: 'rakai',
        name: 'Rakai',
        archetype: 'THE_VANGUARD',
        stats: { influence: 88, chaos: 75, charisma: 85, rebellion: 80 },
        trait: 'AGGRESSIVE',
        visualPrompt: 'Valkyrae with dual energy swords',
        image: '/rakai_anime_upgrade.png',
        moves: [
            { name: 'Scream', type: 'REBELLION', power: 60, pp: 15, description: 'Sonic damage' },
            { name: 'Blade Dance', type: 'CHAOS', power: 80, pp: 10, description: 'Multi-hit' },
            { name: 'Queen Dash', type: 'DISRUPT', power: 55, pp: 18, description: 'Swift strike' },
            { name: 'Among Us Sus', type: 'INTEL', power: 50, pp: 12, description: 'Deception' }
        ],
        ultimateMove: { name: 'Red Flag', type: 'CHAOS', power: 135, pp: 1, description: 'Berserker mode' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'VALKYRIE',
            originStory: 'A frontline warrior who defended the "Just Chatting" district from the first TROLL wave.',
            mission: 'Lead the assault team on Sentinel\'s firewall.',
            connection: 'Best friend to Sykkuno; protects Pokimane.'
        }
    },
    {
        id: 'reggie',
        name: 'Reggie',
        archetype: 'THE_STEALTH',
        stats: { influence: 80, chaos: 40, charisma: 90, rebellion: 60 },
        trait: 'DIPLOMATIC',
        visualPrompt: 'Sykkuno in shadows covering face',
        image: '/reggie_cyber_rebel_1767568127023.png',
        moves: [
            { name: 'Polite Decline', type: 'DISRUPT', power: 40, pp: 20, description: 'Avoids damage' },
            { name: 'Lucky Shot', type: 'CHAOS', power: 90, pp: 5, description: 'Critical hit' },
            { name: 'Soft Voice', type: 'CHARISMA', power: 45, pp: 18, description: 'Calming effect' },
            { name: 'GTA Heist', type: 'INTEL', power: 65, pp: 10, description: 'Criminal mastermind' }
        ],
        ultimateMove: { name: 'Dark Yuno', type: 'INTEL', power: 120, pp: 1, description: 'Unexpected betrayal damage' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'SHADOW',
            originStory: 'Appears harmless, allowing him to walk freely into Sentinel facilities.',
            mission: 'Plant bugs and extract data without being noticed.',
            connection: 'Valkyrae\'s shadow; communicates in code with Jynxzi.'
        }
    },
    {
        id: 'bendadonnn',
        name: 'Bendadonnn',
        archetype: 'THE_ODDBALL',
        stats: { influence: 75, chaos: 80, charisma: 80, rebellion: 50 },
        trait: 'DISRUPTIVE',
        visualPrompt: 'Sketch making a weird face',
        image: '/bendadonnn_cyber_rebel_v1.png',
        moves: [
            { name: 'What\'s Up Brother', type: 'CHARISMA', power: 55, pp: 20, description: 'Confuses enemy' },
            { name: 'Special Teams', type: 'CHAOS', power: 70, pp: 10, description: 'Random effect' },
            { name: 'NFL Draft', type: 'INTEL', power: 60, pp: 12, description: 'Strategic pick' },
            { name: 'Odd Energy', type: 'REBELLION', power: 50, pp: 15, description: 'Chaotic vibes' }
        ],
        ultimateMove: { name: 'Tuesday', type: 'DISRUPT', power: 115, pp: 1, description: 'Time distoration' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'PROJECT S',
            originStory: 'A failed Sentinel clone experiment that developed a soul.',
            mission: 'Infiltrate the NFL (Neural Files Link) database.',
            connection: 'Druski scouted him in the digital wasteland; Kai finds his energy useful but chaotic.'
        }
    },
    {
        id: 'ddg',
        name: 'DDG',
        archetype: 'THE_CHAMPION',
        stats: { influence: 95, chaos: 85, charisma: 90, rebellion: 80 },
        trait: 'AGGRESSIVE',
        visualPrompt: 'KSI in boxing gear with Prime bottle',
        image: '/ddg_anime_upgrade.png',
        moves: [
            { name: 'Forehead Shine', type: 'DISRUPT', power: 40, pp: 20, description: 'Blinds enemy' },
            { name: 'Nightmare', type: 'REBELLION', power: 85, pp: 10, description: 'Heavy punch' },
            { name: 'Prime Time', type: 'CHARISMA', power: 70, pp: 8, description: 'Brand power' },
            { name: 'Boxing Combo', type: 'CHAOS', power: 75, pp: 10, description: 'Rapid punches' }
        ],
        ultimateMove: { name: 'Prime Hydration', type: 'CHARISMA', power: 145, pp: 1, description: 'Revives self' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'NIGHTMARE',
            originStory: 'Operates from the UK Stronghold. Fought off the TROLLS alone in London.',
            mission: 'Unite the European servers with the NA Resistance.',
            connection: 'Rival turned ally to Logan Paul (IA); coordinates with Ludwig.'
        }
    },
    {
        id: 'extraemily',
        name: 'Extra Emily',
        archetype: 'THE_DEMOLITIONIST',
        stats: { influence: 82, chaos: 88, charisma: 80, rebellion: 85 },
        trait: 'DISRUPTIVE',
        visualPrompt: 'LazarBeam with construction tools',
        image: '/extra_emily_cyber_rebel_1767568542149.png',
        moves: [
            { name: 'Yeet', type: 'CHAOS', power: 75, pp: 15, description: 'Throws object' },
            { name: 'Code Lazar', type: 'CHARISMA', power: 0, pp: 10, description: 'Shop buff' },
            { name: 'Aussie Rage', type: 'REBELLION', power: 65, pp: 12, description: 'Down under fury' },
            { name: 'Meme Review', type: 'INTEL', power: 45, pp: 18, description: 'Content analysis' }
        ],
        ultimateMove: { name: 'Bloody Legend', type: 'REBELLION', power: 130, pp: 1, description: 'Explosive finish' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'GINGER',
            originStory: 'His content farm was burned down by Sentinel drones.',
            mission: 'Destroy Sentinel infrastructure using "non-standard" engineering.',
            connection: 'Operates with Vikkstar; communicates with Muselk (MIA).'
        }
    },
    {
        id: 'rayasianboy',
        name: 'RayAsianBoy',
        archetype: 'THE_TACTICIAN',
        stats: { influence: 85, chaos: 40, charisma: 75, rebellion: 70 },
        trait: 'CUNNING',
        visualPrompt: 'Vikkstar playing 4D chess',
        image: '/rayasianboy_cyber_rebel_v1.png',
        moves: [
            { name: 'Calculated', type: 'INTEL', power: 60, pp: 15, description: 'Precise hit' },
            { name: 'To Be Fair', type: 'CHARISMA', power: 40, pp: 20, description: 'Counters argument' },
            { name: 'Warzone Drop', type: 'CHAOS', power: 70, pp: 10, description: 'Hot drop' },
            { name: 'Sidemen Power', type: 'REBELLION', power: 55, pp: 15, description: 'Team synergy' }
        ],
        ultimateMove: { name: 'Warzone Victory', type: 'INTEL', power: 130, pp: 1, description: 'Orbital strike' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'STAR',
            originStory: 'Decoded the Sentinel algorithm to find the "Win Condition".',
            mission: 'Coordinate the Sidemen cell of the Resistance.',
            connection: 'The brains behind KSI\'s brawn.'
        }
    },
    {
        id: 'tylil',
        name: 'Tylil',
        archetype: 'THE_BERSERKER',
        stats: { influence: 88, chaos: 95, charisma: 70, rebellion: 95 },
        trait: 'AGGRESSIVE',
        visualPrompt: 'Tyler1 screaming',
        image: '/tylil_cyber_rebel_fixed.png',
        moves: [
            { name: 'Reform', type: 'REBELLION', power: 20, pp: 5, description: 'Heals self' },
            { name: 'Alpha Scream', type: 'CHAOS', power: 85, pp: 10, description: 'Terrifies enemy' },
            { name: 'Rage Quit', type: 'DISRUPT', power: 75, pp: 8, description: 'Explosive rage' },
            { name: 'Run It Down', type: 'INTEL', power: 50, pp: 15, description: 'Lane pressure' }
        ],
        ultimateMove: { name: 'Built Different', type: 'REBELLION', power: 160, pp: 1, description: 'Ignores damage' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'ALPHA',
            originStory: 'Too angry to be controlled. Broke out of the "Ban Realm" purely out of spite.',
            mission: 'Lead the frontal assault on Middle Lane.',
            connection: 'Refuses to work with anyone, yet inevitably saves them. Respects Faker.'
        }
    },
    {
        id: 'jazzygunz',
        name: 'JazzyGunz',
        archetype: 'THE_ENFORCER',
        stats: { influence: 82, chaos: 75, charisma: 88, rebellion: 85 },
        trait: 'AGGRESSIVE',
        visualPrompt: 'JazzyGunz in tactical cyber-armor holding energy dual pistols',
        image: '/jazzygunz_reconstructed_rebel_fixed_1766786271015.png',
        moves: [
            { name: 'Rapid Fire', type: 'CHAOS', power: 75, pp: 15, description: 'Multi-hit barrage' },
            { name: 'Vlog Cam', type: 'CHARISMA', power: 60, pp: 12, description: 'Capture the moment' },
            { name: 'Tactical Reload', type: 'INTEL', power: 0, pp: 10, description: 'Boosts next attack' },
            { name: 'Suppressing Fire', type: 'REBELLION', power: 70, pp: 15, description: 'Pins enemy down' }
        ],
        ultimateMove: { name: 'Full Auto', type: 'CHAOS', power: 145, pp: 1, description: 'Unloads everything' },
        narrative: {
            role: 'RESISTANCE',
            codename: 'VALKYRIE_2',
            originStory: 'Former tactical FPS pro who realized the targets were real simulations of dissenters.',
            mission: 'Provide heavy fire support for resistance extraction teams.',
            connection: 'Often flanks with Agent 00; rivals with the Sentinel enforcement division.'
        }
    }
];

export const getStreamerById = (id: string): Streamer | undefined => {
    return streamers.find(s => s.id === id);
};

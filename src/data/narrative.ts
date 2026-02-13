export interface DialogueLine {
    id: string;
    text: string;
    speaker: string;
    trigger?: 'first_load' | 'mission_start' | 'battle_near_win' | 'battle_near_loss' | 'faction_join' | 'map_open';
    priority?: number;
}

export const OPERATOR_DIALOGUES: Record<string, DialogueLine[]> = {
    onboarding: [
        {
            id: 'ob_1',
            speaker: 'SOPHIA',
            text: "Yo, signal's clean. Use the overlay. I'm Sophia — basically your eye in the sky. I've been running comms since the first blackout.",
            trigger: 'first_load'
        },
        {
            id: 'ob_2',
            speaker: 'SOPHIA',
            text: "The Corp Authority is literally stream-sniping our entire network. These creators are the last real ones left. We gotta keep them live.",
            trigger: 'first_load'
        }
    ],
    mission_brief: [
        {
            id: 'mb_1',
            speaker: 'SOPHIA',
            text: "Heads up, chat — uh, I mean Operative. This sector's got heavy corporate mods patrolling. The streamer here is legendary. Let's not let them get banned, yeah?",
            trigger: 'mission_start'
        }
    ],
    danger_warnings: [
        {
            id: 'dw_1',
            speaker: 'SOPHIA',
            text: "Yo, you're taking heavy damage! Don't throw. Rotate your strategy or use an item. We can still clutch this.",
            trigger: 'battle_near_loss'
        }
    ],
    encouragement: [
        {
            id: 'en_1',
            speaker: 'SOPHIA',
            text: "You're absolutely cooking right now! Their firewall is cooked. One more W and this sector is ours.",
            trigger: 'battle_near_win'
        }
    ]
};

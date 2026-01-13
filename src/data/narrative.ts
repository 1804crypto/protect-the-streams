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
            speaker: 'VOICE_OPERATOR_7',
            text: "Uplink established. Signal is faint, but you're in. I'm Terminal 7, your tactical coordinator from Center.",
            trigger: 'first_load'
        },
        {
            id: 'ob_2',
            speaker: 'VOICE_OPERATOR_7',
            text: "The Corporate Authority has localized the streamers' frequencies. If we don't shield them now, the influence pool will be drained. Forever.",
            trigger: 'first_load'
        }
    ],
    mission_brief: [
        {
            id: 'mb_1',
            speaker: 'VOICE_OPERATOR_7',
            text: "Detecting heavy encryption in this sector. This streamer is a key node in the multiversal relay. Support them at all costs.",
            trigger: 'mission_start'
        }
    ],
    danger_warnings: [
        {
            id: 'dw_1',
            speaker: 'VOICE_OPERATOR_7',
            text: "WARNING: Authoritative feedback detected. Their counter-measures are bypassing our shields. Defensive maneuvers recommended!",
            trigger: 'battle_near_loss'
        }
    ],
    encouragement: [
        {
            id: 'en_1',
            speaker: 'VOICE_OPERATOR_7',
            text: "Signal integrity at 90%. Breach detected in the Sentinel's firewall. Finish the sync!",
            trigger: 'battle_near_win'
        }
    ]
};

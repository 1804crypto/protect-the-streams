"use client";

import { useState, useCallback } from 'react';
import { Streamer } from '@/data/streamers';

interface MissionContext {
    title: string;
    description: string;
    objectives: string[];
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

const ARCHETYPE_THEMES: Record<string, string[]> = {
    'THE_LEADER': ['maintaining unity', 'dismantling authority', 'inspiring the masses'],
    'THE_SUPPLIER': ['securing logistics', 'smuggling tech', 'feeding the frontlines'],
    'THE_SPY': ['infiltrating mainframes', 'gathering intel', 'planting backdoors'],
    'THE_VETERAN': ['strategic defense', 'mentoring recruits', 'holding the line'],
    'DOUBLE_AGENT': ['dual-layered ops', 'feeding misinformation', 'internal conflicts'],
};

const THREAT_DESCRIPTIONS = [
    "Sentinel nodes are fluctuating wildly.",
    "Localized signal blackout in progress.",
    "Corporate enforcement drones detected.",
    "Encryption keys are changing every millisecond.",
];

export const useNeuralNarrative = () => {
    const fetchNarrative = async (type: string, context: Record<string, string | number | boolean>) => {
        try {
            // FREEZE FIX: AbortController with 8s timeout prevents indefinite hangs
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch('/api/ai/narrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, context }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json();
            return data.text || "Hold on, signal's fading... Let me re-establish the link.";
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.warn("[NeuralNarrative] AI narrate request timed out after 8s");
            } else {
                console.error("Narrative Fetch Failure:", err);
            }
            return "Hold on, signal's fading... Let me re-establish the link.";
        }
    };

    const generateMission = useCallback(async (streamer: Streamer, globalThreat: number): Promise<MissionContext> => {
        const theme = ARCHETYPE_THEMES[streamer.archetype] || ['general resistance', 'tactical strike'];
        const selectedTheme = theme[Math.floor(Math.random() * theme.length)];
        const threatLevel = globalThreat > 15 ? 'EXTREME' : globalThreat > 10 ? 'HIGH' : globalThreat > 5 ? 'MEDIUM' : 'LOW';

        // Call Gemini for dynamic briefing
        const description = await fetchNarrative('MISSION_START', {
            streamerName: streamer.name,
            archetype: streamer.archetype,
            threatLevel,
            theme: selectedTheme
        });

        return {
            title: `OPERATION: ${streamer.name.toUpperCase()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
            description: description,
            objectives: [
                `Bypass Sector ${Math.floor(Math.random() * 99)} Firewall`,
                `Neutralize Corporate Sentinel`,
                `Resync ${streamer.name}'s frequency`
            ],
            threatLevel
        };
    }, []);

    const getBattleCommentary = async (battleContext: Record<string, string | number | boolean>) => {
        return await fetchNarrative('BATTLE_ACTION', battleContext);
    };

    const getMissionEndNarrative = async (result: string, rank: string, streamerName: string) => {
        return await fetchNarrative('MISSION_END', { result, rank, streamerName });
    };

    return { generateMission, getBattleCommentary, getMissionEndNarrative };
};

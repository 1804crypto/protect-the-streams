"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioStore } from './useAudioStore';
import { useCollectionStore } from './useCollectionStore';

// Configuration
const CROSSFADE_TIME = 2.0; // Seconds for smooth transitions
const STEMS = {
    BASE: '/audio/stems/stem_base.mp3',
    MID: '/audio/stems/stem_mid.mp3',
    HIGH: '/audio/stems/stem_high.mp3',
    AGITATION: '/audio/stems/stem_agitation.mp3'
};

export const useNeuralMusic = (
    isActive: boolean,
    params: {
        neuralSync: number; // 0-100 (Ultimate Charge)
        enemyCount: number; // 0 or 1+
        currentHp: number;
        maxHp: number;
    }
) => {
    const isMuted = useAudioStore(state => state.isMuted);
    const difficultyMultiplier = useCollectionStore(state => state.difficultyMultiplier); // Proxies for Global Threat Level

    const audioCtxRef = useRef<AudioContext | null>(null);
    const stemsRef = useRef<Record<string, { source: AudioBufferSourceNode | null, gain: GainNode | null, buffer: AudioBuffer | null }>>({
        BASE: { source: null, gain: null, buffer: null },
        MID: { source: null, gain: null, buffer: null },
        HIGH: { source: null, gain: null, buffer: null },
        AGITATION: { source: null, gain: null, buffer: null }
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const [intensity, setIntensity] = useState(0);

    // 1. Initialize Audio Context & Load Stems
    useEffect(() => {
        if (!isActive || typeof window === 'undefined') return;

        const initAudio = async () => {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;

            // Load all buffers if not loaded
            const loadPromises = Object.entries(STEMS).map(async ([key, url]) => {
                if (stemsRef.current[key].buffer) return; // Already loaded

                try {
                    // For now, we simulate loading or try to fetch (will likely fail 404 in dev but logic holds)
                    // We'll create empty buffers if fetch fails to prevent crash during dev
                    let buffer: AudioBuffer;
                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error("File not found");
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = await ctx.decodeAudioData(arrayBuffer);
                    } catch (e) {
                        console.warn(`[SONIC_DEPTH] Stem not found: ${url}. Using silent placeholder.`);
                        // Create 2 second silent buffer
                        buffer = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
                    }

                    stemsRef.current[key].buffer = buffer;
                } catch (err) {
                    console.error(`[SONIC_DEPTH] Failed to load ${key}`, err);
                }
            });

            await Promise.all(loadPromises);
            setIsLoaded(true);
            startPlayback();
        };

        if (!isLoaded && isActive) {
            initAudio();
        }

        return () => {
            // Cleanup handled in separate effect or component unmount logic if needed
            // But for now, we want persistence during the session, so we don't aggressively close
            // unless isActive turns false (handled below)
        };
    }, [isActive, isLoaded]); // Only run once on activation

    // 2. Playback Control
    const startPlayback = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx || !isLoaded) return;

        // Resume if suspended
        if (ctx.state === 'suspended') ctx.resume();

        Object.keys(STEMS).forEach(key => {
            const stem = stemsRef.current[key];
            if (stem.source) return; // Already playing

            if (!stem.buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = stem.buffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime); // Start silent

            source.connect(gain);
            gain.connect(ctx.destination);

            source.start(0);

            stem.source = source;
            stem.gain = gain;
        });

        // Set initial volumes
        // updateMixing called via effect
    }, [isLoaded]);

    const stopPlayback = useCallback(() => {
        Object.values(stemsRef.current).forEach(stem => {
            if (stem.source) {
                try { stem.source.stop(); } catch { }
                stem.source.disconnect();
                stem.source = null;
            }
            if (stem.gain) {
                stem.gain.disconnect();
                stem.gain = null;
            }
        });
    }, []);

    // Handle Active State changes
    useEffect(() => {
        if (!isActive) {
            stopPlayback();
        } else if (isLoaded) {
            startPlayback();
        }
    }, [isActive, isLoaded, startPlayback, stopPlayback]);


    // 3. Intensity Handshake
    const calculateSonicIntensity = useCallback(() => {
        if (!params) return 0;
        const { neuralSync, enemyCount, currentHp, maxHp } = params;

        // Normalize Neural Sync (0-100 -> 0.0-1.0)
        let syncFactor = Math.min(1, Math.max(0, neuralSync / 100));

        // Threat Factor: Increased by difficulty and low HP
        let threatFactor = (difficultyMultiplier - 1) * 0.2; // e.g., 1.5x difficulty adds 0.1
        if (maxHp > 0 && currentHp / maxHp < 0.3) threatFactor += 0.3; // Low HP adds urgency

        // Enemy Presence
        let enemyFactor = enemyCount > 0 ? 0.2 : 0;

        let totalIntensity = syncFactor + threatFactor + enemyFactor;

        // Cap at 1.0 unless Overdrive
        return Math.min(1.0, Math.max(0.0, totalIntensity));
    }, [params, difficultyMultiplier]);

    // 4. Cross-Fade Protocol
    const updateMixing = useCallback((newIntensity: number) => {
        const ctx = audioCtxRef.current;
        const t = ctx?.currentTime || 0;

        if (!ctx || isMuted) {
            // If muted, silence all
            Object.values(stemsRef.current).forEach(stem => {
                if (stem.gain) stem.gain.gain.setTargetAtTime(0, t, 0.1);
            });
            return;
        }

        // Logic (Cumulative Cross-Fade):
        // 0.0 - 0.3: Base only
        // 0.4 - 0.6: + Mid
        // 0.7 - 0.9: + High
        // 1.0: + Agitation (Quantum Sync)

        // BASE: Always on if active
        if (stemsRef.current.BASE.gain) {
            stemsRef.current.BASE.gain.gain.setTargetAtTime(0.8, t, CROSSFADE_TIME);
        }

        // MID: Fade in > 0.3
        if (stemsRef.current.MID.gain) {
            const target = newIntensity > 0.3 ? 0.7 : 0;
            stemsRef.current.MID.gain.gain.setTargetAtTime(target, t, CROSSFADE_TIME);
        }

        // HIGH: Fade in > 0.6
        if (stemsRef.current.HIGH.gain) {
            const target = newIntensity > 0.6 ? 0.6 : 0;
            stemsRef.current.HIGH.gain.gain.setTargetAtTime(target, t, CROSSFADE_TIME);
        }

        // AGITATION: Only at 0.95+
        if (stemsRef.current.AGITATION.gain) {
            const target = newIntensity >= 0.95 ? 0.9 : 0;
            stemsRef.current.AGITATION.gain.gain.setTargetAtTime(target, t, CROSSFADE_TIME);
        }

    }, [isMuted]);

    // 5. Loop: Update physics
    useEffect(() => {
        if (isActive && isLoaded) {
            const newIntensity = calculateSonicIntensity();
            setIntensity(newIntensity);
            updateMixing(newIntensity);
        }
    }, [calculateSonicIntensity, updateMixing, isActive, isLoaded, params]); // Depend on params changing

    return {
        intensity,
        isLoaded
    };
};

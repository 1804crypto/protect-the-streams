"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useAudioStore } from './useAudioStore';

// Singleton AudioContext moved outside the hook to persist across components
let globalAudioCtx: AudioContext | null = null;

export const useAudioSystem = () => {
    // Uses the global store for synchronized muting/unmuting
    const { isMuted, setIsMuted, toggleMute: storeToggleMute } = useAudioStore();

    // Ambient system refs
    const droneNode = useRef<OscillatorNode | null>(null);
    const droneGain = useRef<GainNode | null>(null);
    const subBassNode = useRef<OscillatorNode | null>(null);
    const shimmerNode = useRef<OscillatorNode | null>(null);
    const lfoNode = useRef<OscillatorNode | null>(null);

    // Initializer helper
    const initCtx = useCallback(() => {
        if (!globalAudioCtx && typeof window !== 'undefined') {
            globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (globalAudioCtx?.state === 'suspended') {
            globalAudioCtx.resume();
        }
        return globalAudioCtx;
    }, []);

    // Core SFX player with envelope
    const playSfx = useCallback((freq: number, type: OscillatorType, duration: number, volume = 0.1, detune = 0) => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.detune.setValueAtTime(detune, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.1, 20), ctx.currentTime + duration);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }, [isMuted, initCtx]);

    // Noise generator for impacts
    const playNoise = useCallback((duration: number, volume = 0.1) => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + duration);
    }, [isMuted, initCtx]);

    // Procedural "Voice-Line" Synthesis
    const playVoiceLine = useCallback((seed: string) => {
        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseFreq = 100 + (hash % 200);

        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const freq = baseFreq + Math.random() * 500;
                playSfx(freq, 'sawtooth', 0.04, 0.04, Math.random() * 50 - 25);
            }, i * 50);
        }
    }, [playSfx]);

    // === UI SFX ===
    const playHover = useCallback(() => {
        playSfx(200, 'square', 0.08, 0.06);
    }, [playSfx]);

    const playClick = useCallback(() => {
        playSfx(300, 'sine', 0.15, 0.08);
        setTimeout(() => playSfx(450, 'sine', 0.1, 0.05), 30);
    }, [playSfx]);

    const playSuccess = useCallback(() => {
        playSfx(440, 'sine', 0.2, 0.08);
        setTimeout(() => playSfx(554, 'sine', 0.2, 0.08), 80);
        setTimeout(() => playSfx(659, 'sine', 0.3, 0.1), 160);
    }, [playSfx]);

    // === BATTLE SFX ===
    const playDamage = useCallback(() => {
        playNoise(0.15, 0.15);
        playSfx(80, 'sine', 0.2, 0.12);
        playSfx(200, 'sawtooth', 0.1, 0.08, 50);
    }, [playSfx, playNoise]);

    const playHeal = useCallback(() => {
        const harmonics = [440, 554, 659, 880];
        harmonics.forEach((freq, i) => {
            setTimeout(() => {
                playSfx(freq, 'sine', 0.3, 0.06);
            }, i * 80);
        });
    }, [playSfx]);

    const playChargeUp = useCallback(() => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }, [isMuted, initCtx]);

    const playUltimate = useCallback(() => {
        playNoise(0.4, 0.2);
        playSfx(40, 'sine', 0.5, 0.15);
        setTimeout(() => {
            playSfx(150, 'sawtooth', 0.3, 0.12);
            playNoise(0.2, 0.1);
        }, 50);
        setTimeout(() => {
            [800, 1000, 1200].forEach((freq, i) => {
                setTimeout(() => playSfx(freq, 'sine', 0.2, 0.04), i * 30);
            });
        }, 100);
    }, [playSfx, playNoise]);

    const playVictory = useCallback(() => {
        const chords = [
            { notes: [523, 659, 784], delay: 0 },
            { notes: [587, 740, 880], delay: 200 },
            { notes: [659, 830, 988], delay: 400 },
            { notes: [784, 988, 1175], delay: 600 },
        ];
        chords.forEach(chord => {
            setTimeout(() => {
                chord.notes.forEach((freq, i) => {
                    setTimeout(() => playSfx(freq, 'sine', 0.4, 0.06), i * 20);
                });
            }, chord.delay);
        });
    }, [playSfx]);

    const playDefeat = useCallback(() => {
        const notes = [440, 392, 349, 294, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                playSfx(freq, 'sine', 0.3, 0.08);
                if (i > 2) playSfx(freq * 0.5, 'sine', 0.4, 0.06);
            }, i * 150);
        });
    }, [playSfx]);

    const playMiss = useCallback(() => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }, [isMuted, initCtx]);

    const playCritical = useCallback(() => {
        playDamage();
        setTimeout(() => playDamage(), 50);
        playSfx(400, 'sawtooth', 0.3, 0.1, 200);
        playNoise(0.3, 0.2);
    }, [playDamage, playSfx, playNoise]);

    const playBossIntro = useCallback(() => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(40, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
        setTimeout(() => playUltimate(), 1200);
    }, [isMuted, initCtx, playUltimate]);

    const playTurnStart = useCallback(() => {
        playSfx(1000, 'sine', 0.05, 0.03);
    }, [playSfx]);

    const playExpGain = useCallback(() => {
        playSfx(880, 'sine', 0.05, 0.04);
    }, [playSfx]);

    // === ENHANCED AMBIENT SYSTEM ===
    useEffect(() => {
        const ctx = initCtx();
        if (!isMuted && ctx) {
            if (!droneNode.current) {
                const drone = ctx.createOscillator();
                const dGain = ctx.createGain();
                drone.type = 'sine';
                drone.frequency.setValueAtTime(40, ctx.currentTime);
                dGain.gain.setValueAtTime(0, ctx.currentTime);
                dGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 3);
                drone.connect(dGain);
                dGain.connect(ctx.destination);
                drone.start();
                droneNode.current = drone;
                droneGain.current = dGain;
            }

            if (!subBassNode.current) {
                const subBass = ctx.createOscillator();
                const subGain = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                subBass.type = 'sine';
                subBass.frequency.setValueAtTime(30, ctx.currentTime);
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
                lfoGain.gain.setValueAtTime(5, ctx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(subBass.frequency);
                subGain.gain.setValueAtTime(0, ctx.currentTime);
                subGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 4);
                subBass.connect(subGain);
                subGain.connect(ctx.destination);
                lfo.start();
                subBass.start();
                subBassNode.current = subBass;
                lfoNode.current = lfo;
            }

            if (!shimmerNode.current) {
                const shimmer = ctx.createOscillator();
                const shimGain = ctx.createGain();
                const shimLfo = ctx.createOscillator();
                const shimLfoGain = ctx.createGain();
                shimmer.type = 'sine';
                shimmer.frequency.setValueAtTime(2500, ctx.currentTime);
                shimLfo.type = 'sine';
                shimLfo.frequency.setValueAtTime(0.3, ctx.currentTime);
                shimLfoGain.gain.setValueAtTime(500, ctx.currentTime);
                shimLfo.connect(shimLfoGain);
                shimLfoGain.connect(shimmer.frequency);
                shimGain.gain.setValueAtTime(0, ctx.currentTime);
                shimGain.gain.linearRampToValueAtTime(0.003, ctx.currentTime + 5);
                shimmer.connect(shimGain);
                shimGain.connect(ctx.destination);
                shimLfo.start();
                shimmer.start();
                shimmerNode.current = shimmer;
            }
        } else {
            [droneNode, subBassNode, shimmerNode, lfoNode].forEach(nodeRef => {
                if (nodeRef.current) {
                    try { nodeRef.current.stop(); } catch { }
                    nodeRef.current = null;
                }
            });
            droneGain.current = null;
        }
    }, [isMuted, initCtx]);

    const toggleMute = useCallback(() => {
        initCtx();
        storeToggleMute();
    }, [initCtx, storeToggleMute]);

    const forceUnmute = useCallback(() => {
        initCtx();
        setIsMuted(false);
    }, [initCtx, setIsMuted]);

    const playEvent = useCallback(() => {
        playSfx(1200, 'sine', 0.1, 0.05);
        setTimeout(() => playSfx(1800, 'sine', 0.05, 0.03), 50);
    }, [playSfx]);

    const playItemUse = useCallback((type: 'heal' | 'boost') => {
        if (type === 'heal') {
            playHeal();
        } else {
            playSfx(600, 'sawtooth', 0.15, 0.07);
            setTimeout(() => playSfx(900, 'sawtooth', 0.2, 0.05), 100);
        }
    }, [playHeal, playSfx]);

    const playMapAmbient = useCallback(() => {
        playNoise(0.05, 0.02);
    }, [playNoise]);

    const playScanning = useCallback(() => {
        const ctx = initCtx();
        if (isMuted || !ctx) return () => { };
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(2, ctx.currentTime);
        lfoGain.gain.setValueAtTime(400, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        lfo.start();
        return () => {
            if (!ctx) return;
            try {
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                setTimeout(() => {
                    osc.stop();
                    lfo.stop();
                }, 150);
            } catch (e) { }
        };
    }, [isMuted, initCtx]);

    const playMoveSound = useCallback((type: string) => {
        const ctx = initCtx();
        if (isMuted || !ctx) return;
        const moveType = type.toUpperCase();
        switch (moveType) {
            case 'CHAOS':
                playSfx(60, 'sawtooth', 0.4, 0.1, 100);
                setTimeout(() => playNoise(0.2, 0.05), 50);
                break;
            case 'REBELLION':
                playNoise(0.15, 0.15);
                playSfx(120, 'square', 0.1, 0.1);
                break;
            case 'INTEL':
                playSfx(1500, 'sine', 0.1, 0.08);
                setTimeout(() => playSfx(2000, 'sine', 0.05, 0.05), 40);
                break;
            case 'CHARISMA':
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
                break;
            case 'INFLUENCE':
                [300, 300, 300].forEach((freq, i) => {
                    setTimeout(() => playSfx(freq, 'triangle', 0.2, 0.05 / (i + 1)), i * 100);
                });
                break;
            default:
                playClick();
        }
    }, [isMuted, initCtx, playSfx, playNoise, playClick]);

    return {
        isMuted,
        toggleMute,
        forceUnmute,
        playHover,
        playClick,
        playSuccess,
        playVoiceLine,
        playEvent,
        playItemUse,
        playMapAmbient,
        playDamage,
        playHeal,
        playChargeUp,
        playUltimate,
        playMoveSound,
        playMiss,
        playCritical,
        playBossIntro,
        playTurnStart,
        playExpGain,
        playVictory,
        playDefeat,
        playScanning
    };
};

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

export const useAudioSystem = () => {
    const [isMuted, setIsMuted] = useState(true);
    const audioCtx = useRef<AudioContext | null>(null);

    // Ambient system refs
    const droneNode = useRef<OscillatorNode | null>(null);
    const droneGain = useRef<GainNode | null>(null);
    const subBassNode = useRef<OscillatorNode | null>(null);
    const shimmerNode = useRef<OscillatorNode | null>(null);
    const lfoNode = useRef<OscillatorNode | null>(null);

    // Core SFX player with envelope
    const playSfx = useCallback((freq: number, type: OscillatorType, duration: number, volume = 0.1, detune = 0) => {
        if (isMuted || !audioCtx.current) return;

        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
        osc.detune.setValueAtTime(detune, audioCtx.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.1, 20), audioCtx.current.currentTime + duration);

        gain.gain.setValueAtTime(0, audioCtx.current.currentTime);
        gain.gain.linearRampToValueAtTime(volume, audioCtx.current.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        osc.start();
        osc.stop(audioCtx.current.currentTime + duration);
    }, [isMuted]);

    // Noise generator for impacts
    const playNoise = useCallback((duration: number, volume = 0.1) => {
        if (isMuted || !audioCtx.current) return;

        const bufferSize = audioCtx.current.sampleRate * duration;
        const buffer = audioCtx.current.createBuffer(1, bufferSize, audioCtx.current.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.current.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.current.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioCtx.current.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, audioCtx.current.currentTime + duration);

        const gain = audioCtx.current.createGain();
        gain.gain.setValueAtTime(volume, audioCtx.current.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.current.destination);

        noise.start();
        noise.stop(audioCtx.current.currentTime + duration);
    }, [isMuted]);

    // Procedural "Voice-Line" Synthesis (Glitchy Cyber Speak)
    const playVoiceLine = useCallback((seed: string) => {
        if (isMuted || !audioCtx.current) return;

        const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseFreq = 100 + (hash % 200);

        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const freq = baseFreq + Math.random() * 500;
                playSfx(freq, 'sawtooth', 0.04, 0.04, Math.random() * 50 - 25);
            }, i * 50);
        }
    }, [isMuted, playSfx]);

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
        if (isMuted || !audioCtx.current) return;

        // Impact noise burst
        playNoise(0.15, 0.15);

        // Low thud
        playSfx(80, 'sine', 0.2, 0.12);

        // Distorted mid hit
        playSfx(200, 'sawtooth', 0.1, 0.08, 50);
    }, [isMuted, playSfx, playNoise]);

    const playHeal = useCallback(() => {
        if (isMuted || !audioCtx.current) return;

        // Ascending harmonic sweep
        const harmonics = [440, 554, 659, 880];
        harmonics.forEach((freq, i) => {
            setTimeout(() => {
                playSfx(freq, 'sine', 0.3, 0.06);
            }, i * 80);
        });
    }, [isMuted, playSfx]);

    const playChargeUp = useCallback(() => {
        if (isMuted || !audioCtx.current) return;

        // Building tension oscillator
        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.current.currentTime + 0.5);

        gain.gain.setValueAtTime(0.02, audioCtx.current.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, audioCtx.current.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        osc.start();
        osc.stop(audioCtx.current.currentTime + 0.5);
    }, [isMuted]);

    const playUltimate = useCallback(() => {
        if (isMuted || !audioCtx.current) return;

        // Epic multi-layered explosion
        playNoise(0.4, 0.2);

        // Deep bass drop
        playSfx(40, 'sine', 0.5, 0.15);

        // Mid frequency impact
        setTimeout(() => {
            playSfx(150, 'sawtooth', 0.3, 0.12);
            playNoise(0.2, 0.1);
        }, 50);

        // High frequency shimmer
        setTimeout(() => {
            [800, 1000, 1200].forEach((freq, i) => {
                setTimeout(() => playSfx(freq, 'sine', 0.2, 0.04), i * 30);
            });
        }, 100);
    }, [isMuted, playSfx, playNoise]);

    // === STINGERS ===
    const playVictory = useCallback(() => {
        if (isMuted || !audioCtx.current) return;

        // Triumphant ascending major chord
        const chords = [
            { notes: [523, 659, 784], delay: 0 },      // C major
            { notes: [587, 740, 880], delay: 200 },    // D major  
            { notes: [659, 830, 988], delay: 400 },    // E major
            { notes: [784, 988, 1175], delay: 600 },   // G major
        ];

        chords.forEach(chord => {
            setTimeout(() => {
                chord.notes.forEach((freq, i) => {
                    setTimeout(() => playSfx(freq, 'sine', 0.4, 0.06), i * 20);
                });
            }, chord.delay);
        });
    }, [isMuted, playSfx]);

    const playDefeat = useCallback(() => {
        if (isMuted || !audioCtx.current) return;

        // Descending minor resolution
        const notes = [440, 392, 349, 294, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                playSfx(freq, 'sine', 0.3, 0.08);
                if (i > 2) playSfx(freq * 0.5, 'sine', 0.4, 0.06); // Add bass
            }, i * 150);
        });
    }, [isMuted, playSfx]);

    // === ENHANCED AMBIENT SYSTEM ===
    useEffect(() => {
        if (!isMuted && audioCtx.current) {
            // Main drone (40Hz bass)
            if (!droneNode.current) {
                const drone = audioCtx.current.createOscillator();
                const dGain = audioCtx.current.createGain();

                drone.type = 'sine';
                drone.frequency.setValueAtTime(40, audioCtx.current.currentTime);

                dGain.gain.setValueAtTime(0, audioCtx.current.currentTime);
                dGain.gain.linearRampToValueAtTime(0.025, audioCtx.current.currentTime + 3);

                drone.connect(dGain);
                dGain.connect(audioCtx.current.destination);

                drone.start();
                droneNode.current = drone;
                droneGain.current = dGain;
            }

            // Sub-bass with slow sweep (25-35Hz)
            if (!subBassNode.current) {
                const subBass = audioCtx.current.createOscillator();
                const subGain = audioCtx.current.createGain();
                const lfo = audioCtx.current.createOscillator();
                const lfoGain = audioCtx.current.createGain();

                subBass.type = 'sine';
                subBass.frequency.setValueAtTime(30, audioCtx.current.currentTime);

                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.1, audioCtx.current.currentTime);
                lfoGain.gain.setValueAtTime(5, audioCtx.current.currentTime);

                lfo.connect(lfoGain);
                lfoGain.connect(subBass.frequency);

                subGain.gain.setValueAtTime(0, audioCtx.current.currentTime);
                subGain.gain.linearRampToValueAtTime(0.015, audioCtx.current.currentTime + 4);

                subBass.connect(subGain);
                subGain.connect(audioCtx.current.destination);

                lfo.start();
                subBass.start();
                subBassNode.current = subBass;
                lfoNode.current = lfo;
            }

            // High shimmer layer (2-3kHz)
            if (!shimmerNode.current) {
                const shimmer = audioCtx.current.createOscillator();
                const shimGain = audioCtx.current.createGain();
                const shimLfo = audioCtx.current.createOscillator();
                const shimLfoGain = audioCtx.current.createGain();

                shimmer.type = 'sine';
                shimmer.frequency.setValueAtTime(2500, audioCtx.current.currentTime);

                shimLfo.type = 'sine';
                shimLfo.frequency.setValueAtTime(0.3, audioCtx.current.currentTime);
                shimLfoGain.gain.setValueAtTime(500, audioCtx.current.currentTime);

                shimLfo.connect(shimLfoGain);
                shimLfoGain.connect(shimmer.frequency);

                shimGain.gain.setValueAtTime(0, audioCtx.current.currentTime);
                shimGain.gain.linearRampToValueAtTime(0.003, audioCtx.current.currentTime + 5);

                shimmer.connect(shimGain);
                shimGain.connect(audioCtx.current.destination);

                shimLfo.start();
                shimmer.start();
                shimmerNode.current = shimmer;
            }
        } else {
            // Cleanup all ambient nodes
            [droneNode, subBassNode, shimmerNode, lfoNode].forEach(nodeRef => {
                if (nodeRef.current) {
                    try { nodeRef.current.stop(); } catch { }
                    nodeRef.current = null;
                }
            });
            droneGain.current = null;
        }
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        if (!audioCtx.current) {
            audioCtx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }

        if (audioCtx.current.state === 'suspended') {
            audioCtx.current.resume().then(() => {
                // AudioContext resumed
            });
        }

        setIsMuted(!isMuted);
    }, [isMuted]);

    // Force unmute to handle browser auto-play policies
    const forceUnmute = useCallback(() => {
        if (!audioCtx.current) {
            audioCtx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (audioCtx.current.state === 'suspended') {
            audioCtx.current.resume();
        }
        setIsMuted(false);
    }, []);

    const playEvent = useCallback(() => {
        // High-pitched diagnostic ping
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
        if (isMuted || !audioCtx.current) return;
        // Low fidelity radio static burst
        playNoise(0.05, 0.02);
    }, [isMuted, playNoise]);

    const playScanning = useCallback(() => {
        if (isMuted || !audioCtx.current) return () => { };

        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();
        const lfo = audioCtx.current.createOscillator();
        const lfoGain = audioCtx.current.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.current.currentTime);

        lfo.type = 'square';
        lfo.frequency.setValueAtTime(2, audioCtx.current.currentTime); // 2Hz pulse

        lfoGain.gain.setValueAtTime(400, audioCtx.current.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0, audioCtx.current.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, audioCtx.current.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        osc.start();
        lfo.start();

        return () => {
            if (!audioCtx.current) return;
            try {
                gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 0.1);
                setTimeout(() => {
                    osc.stop();
                    lfo.stop();
                }, 150);
            } catch (e) { }
        };
    }, [isMuted]);

    const playMoveSound = useCallback((type: string) => {
        if (isMuted || !audioCtx.current) return;

        const moveType = type.toUpperCase();

        switch (moveType) {
            case 'CHAOS':
                // Low-frequency resonant distortion
                playSfx(60, 'sawtooth', 0.4, 0.1, 100);
                setTimeout(() => playNoise(0.2, 0.05), 50);
                break;
            case 'REBELLION':
                // Explosive, punchy white noise
                playNoise(0.15, 0.15);
                playSfx(120, 'square', 0.1, 0.1);
                break;
            case 'INTEL':
                // High-frequency digital ping
                playSfx(1500, 'sine', 0.1, 0.08);
                setTimeout(() => playSfx(2000, 'sine', 0.05, 0.05), 40);
                break;
            case 'CHARISMA':
                // Sweeping synth swell
                const osc = audioCtx.current.createOscillator();
                const gain = audioCtx.current.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, audioCtx.current.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, audioCtx.current.currentTime + 0.3);
                gain.gain.setValueAtTime(0, audioCtx.current.currentTime);
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.current.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(audioCtx.current.destination);
                osc.start();
                osc.stop(audioCtx.current.currentTime + 0.3);
                break;
            case 'INFLUENCE':
                // Pulsing echo
                [300, 300, 300].forEach((freq, i) => {
                    setTimeout(() => playSfx(freq, 'triangle', 0.2, 0.05 / (i + 1)), i * 100);
                });
                break;
            default:
                playClick();
        }
    }, [isMuted, playSfx, playNoise, playClick]);

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
        // Battle SFX
        playDamage,
        playHeal,
        playChargeUp,
        playUltimate,
        playMoveSound,
        // Stingers
        playVictory,
        playDefeat,
        playScanning
    };
};

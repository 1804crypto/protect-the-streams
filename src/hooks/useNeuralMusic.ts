"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useVisualEffects } from './useVisualEffects';
import { useAudioStore } from './useAudioStore';

let audioCtx: AudioContext | null = null;

export const useNeuralMusic = (isActive: boolean) => {
    const { integrity, glitchIntensity, isCritical } = useVisualEffects();
    const isMuted = useAudioStore(state => state.isMuted);
    const isDivertMode = useAudioStore(state => state.isDivertMode);

    // Engine Nodes
    const pulseOsc = useRef<OscillatorNode | null>(null);
    const pulseGain = useRef<GainNode | null>(null);
    const alarmOsc = useRef<OscillatorNode | null>(null);
    const alarmGain = useRef<GainNode | null>(null);
    const noiseFilter = useRef<BiquadFilterNode | null>(null);

    const initCtx = useCallback(() => {
        if (!audioCtx && typeof window !== 'undefined') {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx?.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }, []);

    // Main Engine Loop
    useEffect(() => {
        const ctx = initCtx();
        if (!ctx || !isActive || isMuted || isDivertMode) {
            cleanup();
            return;
        }

        // 1. Basal Neural Pulse (The Drum)
        if (!pulseOsc.current) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(40, ctx.currentTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, ctx.currentTime);

            gain.gain.setValueAtTime(0, ctx.currentTime);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            pulseOsc.current = osc;
            pulseGain.current = gain;
            noiseFilter.current = filter;
        }

        // 2. Critical System Alarm
        if (isCritical && !alarmOsc.current) {
            const alarm = ctx.createOscillator();
            const aGain = ctx.createGain();
            alarm.type = 'sine';
            alarm.frequency.setValueAtTime(800, ctx.currentTime);
            aGain.gain.setValueAtTime(0, ctx.currentTime);

            alarm.connect(aGain);
            aGain.connect(ctx.destination);
            alarm.start();
            alarmOsc.current = alarm;
            alarmGain.current = aGain;
        }

        return () => {
            if (!isCritical) {
                if (alarmOsc.current) {
                    try { alarmOsc.current.stop(); } catch { }
                    alarmOsc.current = null;
                }
            }
        };
    }, [isActive, isMuted, isDivertMode, isCritical, initCtx]);

    // Reactive Modulation
    useEffect(() => {
        const ctx = audioCtx;
        if (!ctx || !isActive) return;

        // Modulate Pulse based on health (Tempo/Filter)
        if (pulseGain.current && noiseFilter.current) {
            const targetFreq = 100 + (1 - integrity) * 800 + (glitchIntensity * 2000);
            noiseFilter.current.frequency.setTargetAtTime(Math.min(targetFreq, 15000), ctx.currentTime, 0.1);

            const targetVol = 0.05 + (1 - integrity) * 0.1 + (glitchIntensity * 0.2);
            pulseGain.current.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1);

            // Modulate pitch (Higher pitch = higher stress)
            if (pulseOsc.current) {
                const pitch = 40 + (1 - integrity) * 60;
                pulseOsc.current.frequency.setTargetAtTime(pitch, ctx.currentTime, 0.5);
            }
        }

        // Modulate Alarm (Beeping Frequency)
        if (alarmGain.current && alarmOsc.current) {
            const now = ctx.currentTime;
            const beepRate = Math.max(0.1, integrity * 2);

            // Trigger a beep
            alarmGain.current.gain.cancelScheduledValues(now);
            alarmGain.current.gain.setValueAtTime(0, now);
            alarmGain.current.gain.linearRampToValueAtTime(0.15, now + 0.05);
            alarmGain.current.gain.linearRampToValueAtTime(0, now + 0.15);
        }

    }, [integrity, glitchIntensity, isActive]);

    const cleanup = () => {
        [pulseOsc, alarmOsc].forEach(ref => {
            if (ref.current) {
                try { ref.current.stop(); } catch { }
                ref.current = null;
            }
        });
        pulseGain.current = null;
        alarmGain.current = null;
    };

    useEffect(() => {
        return () => cleanup();
    }, []);
};

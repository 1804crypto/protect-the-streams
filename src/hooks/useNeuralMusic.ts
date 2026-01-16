"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useVisualEffects } from './useVisualEffects';
import { useAudioStore } from './useAudioStore';

let audioCtx: AudioContext | null = null;

export const useNeuralMusic = (isActive: boolean) => {
    const { integrity, glitchIntensity } = useVisualEffects();
    const isMuted = useAudioStore(state => state.isMuted);
    const isDivertMode = useAudioStore(state => state.isDivertMode);

    // Engine Nodes
    const pulseOsc = useRef<OscillatorNode | null>(null);
    const pulseGain = useRef<GainNode | null>(null);
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

        return () => {
            // No specific cleanup needed for critical alarm anymore
        };
    }, [isActive, isMuted, isDivertMode, initCtx]);

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

    }, [integrity, glitchIntensity, isActive]);

    const cleanup = () => {
        if (pulseOsc.current) {
            try { pulseOsc.current.stop(); } catch { }
            pulseOsc.current = null;
        }
        pulseGain.current = null;
    };

    useEffect(() => {
        return () => cleanup();
    }, []);
};

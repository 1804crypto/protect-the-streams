"use client";

import { create } from 'zustand';

interface VisualEffectsState {
    integrity: number; // 1 to 0
    shakeIntensity: number;
    glitchIntensity: number;
    isCritical: boolean;
    lastImpactTime: number;

    // Actions
    setIntegrity: (value: number) => void;
    triggerImpact: (intensity: number) => void;
    triggerGlitch: (intensity: number) => void;
    resetEffects: () => void;
}

export const useVisualEffects = create<VisualEffectsState>((set) => ({
    integrity: 1,
    shakeIntensity: 0,
    glitchIntensity: 0,
    isCritical: false,
    lastImpactTime: 0,

    setIntegrity: (value) => set({
        integrity: value,
        isCritical: value < 0.25
    }),

    triggerImpact: (intensity) => set({
        shakeIntensity: intensity,
        lastImpactTime: Date.now()
    }),

    triggerGlitch: (intensity) => set({
        glitchIntensity: intensity
    }),

    resetEffects: () => set({
        integrity: 1,
        shakeIntensity: 0,
        glitchIntensity: 0,
        isCritical: false,
        lastImpactTime: 0
    })
}));

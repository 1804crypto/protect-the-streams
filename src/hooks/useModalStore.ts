"use client";

import { create } from 'zustand';
import { Streamer } from '@/data/streamers';

type ModalId = 'tutorial' | 'faction' | 'leaderboard' | 'archive' | 'barracks' | 'hub' | 'glossary';

interface ModalState {
    activeModal: ModalId | null;
    activeMissionStreamer: Streamer | null;
    activePvPStreamer: Streamer | null;
    activeJourneyStreamer: Streamer | null;

    openModal: (_id: ModalId) => void;
    closeAll: () => void;
    setMissionStreamer: (_s: Streamer | null) => void;
    setPvPStreamer: (_s: Streamer | null) => void;
    setJourneyStreamer: (_s: Streamer | null) => void;

    // Derived helpers
    isOpen: (_id: ModalId) => boolean;
    anyOpen: () => boolean;
}

export const useModalStore = create<ModalState>()((set, get) => ({
    activeModal: null,
    activeMissionStreamer: null,
    activePvPStreamer: null,
    activeJourneyStreamer: null,

    openModal: (id: ModalId) => set({
        activeModal: id,
        activeMissionStreamer: null,
        activePvPStreamer: null,
        activeJourneyStreamer: null,
    }),

    closeAll: () => set({
        activeModal: null,
        activeMissionStreamer: null,
        activePvPStreamer: null,
        activeJourneyStreamer: null,
    }),

    setMissionStreamer: (s) => set({
        activeModal: null,
        activeMissionStreamer: s,
        activePvPStreamer: null,
        activeJourneyStreamer: null,
    }),

    setPvPStreamer: (s) => set({
        activeModal: null,
        activeMissionStreamer: null,
        activePvPStreamer: s,
        activeJourneyStreamer: null,
    }),

    setJourneyStreamer: (s) => set({
        activeModal: null,
        activeMissionStreamer: null,
        activePvPStreamer: null,
        activeJourneyStreamer: s,
    }),

    isOpen: (id: ModalId) => get().activeModal === id,
    anyOpen: () => {
        const state = get();
        return state.activeModal !== null ||
            state.activeMissionStreamer !== null ||
            state.activePvPStreamer !== null ||
            state.activeJourneyStreamer !== null;
    },
}));

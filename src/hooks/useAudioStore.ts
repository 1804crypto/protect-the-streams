import { create } from 'zustand';

interface AudioState {
    isMuted: boolean;
    isDivertMode: boolean; // When true, ambient is muted to allow external music
    setIsMuted: (muted: boolean) => void;
    setIsDivertMode: (divert: boolean) => void;
    toggleMute: () => void;
    toggleDivertMode: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    isMuted: true,
    isDivertMode: false,
    setIsMuted: (muted) => set({ isMuted: muted }),
    setIsDivertMode: (divert) => set({ isDivertMode: divert }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    toggleDivertMode: () => set((state) => ({ isDivertMode: !state.isDivertMode })),
}));

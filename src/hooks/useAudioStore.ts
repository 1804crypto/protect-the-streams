import { create } from 'zustand';

interface AudioState {
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    isMuted: true,
    setIsMuted: (muted) => set({ isMuted: muted }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));

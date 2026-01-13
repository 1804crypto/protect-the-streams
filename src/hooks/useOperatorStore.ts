"use client";

import { create } from 'zustand';
import { DialogueLine, OPERATOR_DIALOGUES } from '@/data/narrative';

interface OperatorState {
    currentDialogue: DialogueLine | null;
    queue: DialogueLine[];
    isMessageOpen: boolean;
    hasSeen: Set<string>;

    // Actions
    triggerDialogue: (category: keyof typeof OPERATOR_DIALOGUES) => void;
    nextDialogue: () => void;
    closeDialogue: () => void;
    clearQueue: () => void;
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
    currentDialogue: null,
    queue: [],
    isMessageOpen: false,
    hasSeen: new Set(),

    triggerDialogue: (category) => {
        const dialogs = OPERATOR_DIALOGUES[category];
        if (!dialogs) return;

        const unseen = dialogs.filter(d => !get().hasSeen.has(d.id));
        if (unseen.length === 0) return;

        set(state => ({
            queue: [...state.queue, ...unseen],
            isMessageOpen: true,
            currentDialogue: state.currentDialogue || unseen[0]
        }));
    },

    nextDialogue: () => {
        const { queue, currentDialogue, hasSeen } = get();
        if (currentDialogue) {
            hasSeen.add(currentDialogue.id);
        }

        if (queue.length > 1) {
            const next = queue[1];
            set({
                currentDialogue: next,
                queue: queue.slice(1),
                hasSeen: new Set(hasSeen)
            });
        } else {
            set({
                isMessageOpen: false,
                currentDialogue: null,
                queue: [],
                hasSeen: new Set(hasSeen)
            });
        }
    },

    closeDialogue: () => {
        const { currentDialogue, hasSeen } = get();
        if (currentDialogue) {
            hasSeen.add(currentDialogue.id);
        }
        set({
            isMessageOpen: false,
            currentDialogue: null,
            queue: [],
            hasSeen: new Set(hasSeen)
        });
    },

    clearQueue: () => set({ queue: [], currentDialogue: null, isMessageOpen: false })
}));

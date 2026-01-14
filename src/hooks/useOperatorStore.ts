import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

export const useOperatorStore = create<OperatorState>()(
    persist(
        (set, get) => ({
            currentDialogue: null,
            queue: [],
            isMessageOpen: false,
            hasSeen: new Set<string>(),

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
        }),
        {
            name: 'pts_operator_storage',
            storage: createJSONStorage(() => ({
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    try {
                        const data = JSON.parse(str);
                        return {
                            ...data,
                            state: {
                                ...data.state,
                                hasSeen: new Set(data.state?.hasSeen || [])
                            }
                        };
                    } catch {
                        return null;
                    }
                },
                setItem: (name, value) => {
                    const storageValue = value as any;
                    const data = {
                        ...storageValue,
                        state: {
                            ...storageValue.state,
                            hasSeen: Array.from(storageValue.state?.hasSeen || [])
                        }
                    };
                    localStorage.setItem(name, JSON.stringify(data));
                },
                removeItem: (name) => localStorage.removeItem(name)
            })),
            partialize: (state) => ({ hasSeen: state.hasSeen } as any)
        }
    )
);

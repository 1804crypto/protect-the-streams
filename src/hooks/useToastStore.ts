
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loot';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    type: ToastType;
    duration?: number;
}

interface ToastState {
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }]
        }));
    },
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    }
}));

// Helper function for direct usage without hooks (if needed outside components, though Zustand usually needs hook usage)
// For component usage: useToastStore.getState().addToast(...)
export const toast = {
    success: (title: string, description?: string) => useToastStore.getState().addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) => useToastStore.getState().addToast({ title, description, type: 'error' }),
    info: (title: string, description?: string) => useToastStore.getState().addToast({ title, description, type: 'info' }),
    warning: (title: string, description?: string) => useToastStore.getState().addToast({ title, description, type: 'warning' }),
    loot: (title: string, description?: string) => useToastStore.getState().addToast({ title, description, type: 'loot' }),
};

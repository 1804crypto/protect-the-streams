"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, ToastMessage } from '@/hooks/useToastStore';
import { X, CheckCircle, AlertTriangle, Info, Gift } from 'lucide-react';

const icons = {
    success: <CheckCircle className="w-5 h-5 text-neon-green" />,
    error: <AlertTriangle className="w-5 h-5 text-resistance-accent" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-neon-blue" />,
    loot: <Gift className="w-5 h-5 text-purple-400" />,
};

const borderColors = {
    success: 'border-neon-green',
    error: 'border-resistance-accent',
    warning: 'border-yellow-500',
    info: 'border-neon-blue',
    loot: 'border-purple-500',
};

const bgColors = {
    success: 'bg-neon-green/10',
    error: 'bg-resistance-accent/10',
    warning: 'bg-yellow-500/10',
    info: 'bg-neon-blue/10',
    loot: 'bg-purple-500/10',
};

const headers = {
    success: '[SUCCESS]',
    error: '[ERROR]',
    warning: '[WARNING]',
    info: '[SYSTEM]',
    loot: '[LOOT]',
};

const ToastItem = ({ toast }: { toast: ToastMessage }) => {
    const removeToast = useToastStore((state) => state.removeToast);

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, removeToast]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
            className={`w-80 md:w-96 p-4 backdrop-blur-md border md:border-l-4 ${borderColors[toast.type]} ${bgColors[toast.type]} shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group`}
        >
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none" />

            <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2 right-2 text-white/40 hover:text-white transition-colors"
                aria-label="Close notification"
            >
                <X className="w-3 h-3" />
            </button>

            <div className="flex items-start gap-3 relative z-10">
                <div className="mt-1 animate-pulse">
                    {icons[toast.type]}
                </div>
                <div className="flex-1">
                    <p className={`font-mono text-[10px] tracking-widest uppercase font-bold mb-1 ${borderColors[toast.type].replace('border-', 'text-')}`}>
                        {headers[toast.type]}
                    </p>
                    <h4 className="font-display font-bold text-sm text-white mb-1 uppercase tracking-wide">
                        {toast.title}
                    </h4>
                    {toast.description && (
                        <p className="text-xs text-white/70 font-mono leading-relaxed">
                            {toast.description}
                        </p>
                    )}
                </div>
            </div>

            {/* ProgressBar */}
            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${borderColors[toast.type].replace('border-', 'bg-')}`}
            />
        </motion.div>
    );
};

export const ToastSystem = () => {
    const toasts = useToastStore((state) => state.toasts);

    return (
        <div className="fixed bottom-24 right-6 md:bottom-6 md:right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
};

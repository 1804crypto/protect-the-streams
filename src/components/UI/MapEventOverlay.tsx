"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type MapEventType = 'SIGNAL_FLARE' | 'DATA_MOSS' | 'AUTHORITY_SWEEP';

interface MapEventOverlayProps {
    event: {
        type: MapEventType;
        title: string;
        message: string;
        reward?: string;
    } | null;
    onClose: () => void;
}

export const MapEventOverlay: React.FC<MapEventOverlayProps> = ({ event, onClose }) => {
    if (!event) return null;

    const colors = {
        SIGNAL_FLARE: 'text-neon-green border-neon-green shadow-green-500/20',
        DATA_MOSS: 'text-neon-blue border-neon-blue shadow-blue-500/20',
        AUTHORITY_SWEEP: 'text-resistance-accent border-resistance-accent shadow-red-500/20'
    };

    const icons = {
        SIGNAL_FLARE: '📡',
        DATA_MOSS: '📂',
        AUTHORITY_SWEEP: '🚨'
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex items-center justify-center p-6"
            >
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`relative w-full max-w-md bg-[#050505] border-2 p-8 rounded-lg ${colors[event.type]} shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
                >
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 border-inherit" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 border-inherit" />

                    <div className="flex flex-col items-center text-center">
                        <div className="text-6xl mb-6 filter drop-shadow-[0_0_10px_currentColor]">
                            {icons[event.type]}
                        </div>

                        <h3 className="text-[10px] font-mono tracking-[0.5em] opacity-40 mb-2 uppercase">
                            {"// ENCRYPTION_DECODER_READY"}
                        </h3>

                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 italic">
                            {event.title}
                        </h2>

                        <div className="w-12 h-1 bg-current opacity-20 mb-6" />

                        <p className="text-white/60 font-cyber text-sm tracking-widest leading-relaxed mb-8">
                            {event.message}
                        </p>

                        {event.reward && (
                            <div className="w-full bg-white/5 border border-white/10 p-4 mb-8 rounded-sm">
                                <span className="text-[9px] font-mono opacity-40 block mb-1 uppercase">Assets_Recovered:</span>
                                <span className="text-white font-bold tracking-widest uppercase">{event.reward}</span>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-4 border border-current font-black tracking-[0.3em] uppercase hover:bg-current hover:text-black transition-all text-xs"
                        >
                            ACKNOWLEDGE_UPLINK
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperatorStore } from '@/hooks/useOperatorStore';
import { useAudioSystem } from '@/hooks/useAudioSystem';

export const OperatorComms: React.FC = () => {
    const { currentDialogue, isMessageOpen, nextDialogue, closeDialogue } = useOperatorStore();
    const { playVoiceLine, playClick, forceUnmute } = useAudioSystem();

    useEffect(() => {
        if (isMessageOpen && currentDialogue) {
            playVoiceLine(currentDialogue.speaker);
        }
    }, [isMessageOpen, currentDialogue, playVoiceLine]);

    if (!isMessageOpen || !currentDialogue) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed bottom-32 right-8 z-[1000] flex flex-col items-end gap-0 max-w-md pointer-events-none"
            >
                {/* Operator Identity HUD */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-end mb-2 mr-4"
                >
                    <span className="text-[10px] font-black tracking-[0.4em] text-neon-blue uppercase bg-black/80 px-2 py-0.5 border border-neon-blue/30">
                        {currentDialogue.speaker}
                    </span>
                    <div className="flex gap-1 mt-1">
                        <div className="w-1 h-3 bg-neon-blue animate-pulse" />
                        <div className="w-1 h-3 bg-neon-blue/40" />
                        <div className="w-1 h-3 bg-neon-blue/20" />
                    </div>
                </motion.div>

                <div className="flex flex-row-reverse items-center gap-4 pointer-events-auto">
                    {/* Portrait Frame */}
                    <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0">
                        <div className="absolute inset-0 border-2 border-neon-blue rotate-45 scale-90 opacity-20 animate-spin-slow" />
                        <div className="absolute inset-0 border border-neon-blue/50" />

                        {/* Portrait Image (Generated) */}
                        <img
                            src="/operator_portrait_hologram.png"
                            alt="Operator"
                            className="w-full h-full object-cover filter contrast-125 brightness-110 sepia-[0.3] hue-rotate-[180deg]"
                        />

                        {/* Scanning Bar */}
                        <motion.div
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            className="absolute left-0 right-0 h-0.5 bg-neon-blue/40 shadow-[0_0_10px_#00f3ff] z-10"
                        />

                        {/* Glitch Overlay */}
                        <div className="absolute inset-0 bg-[url('/grid_pattern.png')] opacity-20 pointer-events-none mix-blend-overlay" />
                    </div>

                    {/* Dialogue Box */}
                    <div className="flex flex-col items-end">
                        <div className="p-5 bg-black/90 backdrop-blur-xl border-2 border-neon-blue/40 rounded-sm relative shadow-[0_0_30px_rgba(0,243,255,0.15)] max-w-sm">
                            {/* Decorative Corners */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-blue" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-neon-blue" />

                            <p className="text-white font-mono text-[11px] lg:text-xs leading-relaxed tracking-wider">
                                {currentDialogue.text}
                            </p>

                            <div className="mt-4 flex justify-between items-center">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-ping" />
                                    <span className="text-[8px] font-black text-neon-blue/60 tracking-widest uppercase">Encryption_Stable</span>
                                </div>

                                <button
                                    onClick={() => { forceUnmute(); playClick(); nextDialogue(); }}
                                    className="px-4 py-1.5 bg-neon-blue text-black font-black text-[9px] uppercase tracking-widest hover:bg-white transition-all cursor-pointer"
                                >
                                    Proceed_
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signal Connection Bar */}
                <div className="w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden mr-4">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-neon-blue shadow-[0_0_5px_#00f3ff]"
                        transition={{ duration: 5 }}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

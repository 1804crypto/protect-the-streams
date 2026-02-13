"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperatorStore } from '@/hooks/useOperatorStore';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useVoiceOperator } from '@/hooks/useVoiceOperator';

export const OperatorComms: React.FC = () => {
    const { currentDialogue, isMessageOpen, nextDialogue, closeDialogue: _closeDialogue } = useOperatorStore();
    const { playClick, forceUnmute } = useAudioSystem();
    const { speakOperator, speakUrgent, speakHype, stop: stopVoice, initTTS } = useVoiceOperator();

    // Sophia TTS - Speak dialogue when message opens
    useEffect(() => {
        if (isMessageOpen && currentDialogue) {
            const trigger = currentDialogue.trigger;

            const timer = setTimeout(() => {
                if (trigger === 'battle_near_loss') {
                    speakUrgent(currentDialogue.text);
                } else if (trigger === 'battle_near_win') {
                    speakHype(currentDialogue.text);
                } else {
                    speakOperator(currentDialogue.text); // Default to standard stream vibe
                }
            }, 200);

            return () => {
                clearTimeout(timer);
                stopVoice();
            };
        }
    }, [isMessageOpen, currentDialogue, speakOperator, speakUrgent, speakHype, stopVoice]);

    if (!isMessageOpen || !currentDialogue) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="operator-comms"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed bottom-32 right-8 z-[1000] flex flex-col items-end gap-0 max-w-md pointer-events-none"
            >
                {/* Sophia Identity HUD */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-end mb-2 mr-4"
                >
                    <span className="text-[10px] font-black tracking-[0.4em] text-neon-purple uppercase bg-black/80 px-2 py-0.5 border border-neon-purple/30">
                        SOPHIA
                    </span>
                    <span className="text-[7px] font-mono text-white/30 tracking-widest mt-0.5">
                        STREAMER_ADVOCATE // GRASSROOTS_OPS
                    </span>
                    <div className="flex gap-1 mt-1">
                        <div className="w-1 h-3 bg-neon-purple animate-pulse" />
                        <div className="w-1 h-3 bg-neon-purple/40" />
                        <div className="w-1 h-3 bg-neon-purple/20" />
                    </div>
                </motion.div>

                <div className="flex flex-row-reverse items-center gap-4 pointer-events-auto">
                    {/* Portrait Frame */}
                    <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0">
                        <div className="absolute inset-0 border-2 border-neon-purple/30 rounded-full" />

                        {/* Portrait Image */}
                        <img
                            src="/operator_portrait_hologram.png"
                            alt="Sophia"
                            className="w-full h-full object-cover rounded-full border-2 border-neon-purple/50"
                        />

                        {/* Online indicator */}
                        <div className="absolute bottom-1 right-1 w-3 h-3 bg-neon-green rounded-full border-2 border-black shadow-[0_0_8px_#00ff88]" />
                    </div>

                    {/* Dialogue Box */}
                    <div className="flex flex-col items-end">
                        <div className="p-5 bg-black/90 backdrop-blur-xl border-2 border-neon-purple/40 rounded-lg relative shadow-[0_0_30px_rgba(168,85,247,0.15)] max-w-sm">
                            {/* Decorative Corners */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-purple rounded-tl" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-neon-purple rounded-br" />

                            <p className="text-white font-mono text-[11px] lg:text-xs leading-relaxed tracking-wide">
                                {currentDialogue.text}
                            </p>

                            <div className="mt-4 flex justify-between items-center">
                                <div className="flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-neon-green rounded-full" />
                                    <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase">Live</span>
                                </div>

                                <button
                                    onClick={() => { forceUnmute(); playClick(); nextDialogue(); }}
                                    className="px-4 py-1.5 bg-neon-purple text-white font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer rounded-sm"
                                >
                                    Got it
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
                        className="h-full bg-neon-purple shadow-[0_0_5px_rgba(168,85,247,0.6)]"
                        transition={{ duration: 5 }}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

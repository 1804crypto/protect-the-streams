"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Music, X, Activity, Wifi } from 'lucide-react';
import { useAudioSystem } from '@/hooks/useAudioSystem';

export const MediaUplink: React.FC = () => {
    const { isDivertMode, toggleDivert, playClick, playHover } = useAudioSystem();
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleDivert = () => {
        playClick();
        toggleDivert();
    };

    return (
        <div className="fixed bottom-20 left-6 z-50 flex flex-col items-start gap-4 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        className="pointer-events-auto glass-card w-80 p-4 border border-neon-purple/30 bg-black/80 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                                <Radio size={14} className="text-neon-purple animate-pulse" />
                                <span className="text-[10px] font-black tracking-[0.3em] text-white">REBEL_SIGNAL_UPLINK</span>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/40 hover:text-white transition-all"
                                title="Close Media Uplink"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Player Content */}
                        <div className="relative rounded-lg overflow-hidden border border-white/5 bg-black/40 mb-4">
                            <iframe
                                src="https://audius.co/embed/track/9OmXQ3O?flavor=compact"
                                width="100%"
                                height="120"
                                allow="encrypted-media"
                                style={{ border: 'none' }}
                                title="Audius Rebel Broadcast"
                            />
                        </div>

                        {/* Controls */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-mono text-white/40 uppercase">Audio_Isolation_Protocol</span>
                                <div className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold ${isDivertMode ? 'bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-white/30'}`}>
                                    {isDivertMode ? 'ACTIVE' : 'STANDBY'}
                                </div>
                            </div>

                            <button
                                onClick={handleToggleDivert}
                                onMouseEnter={playHover}
                                className={`w-full py-2 text-[9px] font-black uppercase tracking-widest transition-all border ${isDivertMode
                                    ? 'bg-neon-purple/20 border-neon-purple text-white hover:bg-neon-purple/30'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {isDivertMode ? '[ STOP_ISOLATION ]' : '[ SYNC_BROADCAST_SIGNAL ]'}
                            </button>

                            <p className="text-[7px] font-mono text-white/20 italic leading-tight">
                                // Isolating external frequencies will dampen the internal Resistance drone while maintaining tactical field SFX.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button */}
            <motion.button
                initial={false}
                animate={{
                    scale: isOpen ? 0.9 : 1,
                    backgroundColor: isOpen ? 'rgba(0,0,0,0.8)' : (isDivertMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.05)')
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { playClick(); setIsOpen(!isOpen); }}
                title="Toggle Media Uplink"
                className={`pointer-events-auto w-12 h-12 rounded-full border flex items-center justify-center transition-all ${isDivertMode
                    ? 'border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    : 'border-white/10 hover:border-white/30'
                    }`}
            >
                {isDivertMode ? (
                    <div className="relative">
                        <Activity size={20} className="text-neon-purple" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-purple rounded-full animate-ping" />
                    </div>
                ) : (
                    <Music size={20} className="text-white/60" />
                )}
            </motion.button>
        </div>
    );
};

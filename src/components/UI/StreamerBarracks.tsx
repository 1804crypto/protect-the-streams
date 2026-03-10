"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { streamers, Streamer } from '@/data/streamers';
import { StreamerCard } from '../Cards/StreamerCard';
import { useAudioSystem } from '@/hooks/useAudioSystem';

interface StreamerBarracksProps {
    isOpen: boolean;
    onClose: () => void;
    onStartJourney: (streamer: Streamer) => void;
}

export const StreamerBarracks: React.FC<StreamerBarracksProps> = ({ isOpen, onClose, onStartJourney }) => {
    const securedIds = useCollectionStore(state => state.securedIds);
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const { playHover, playClick } = useAudioSystem();

    const securedAssets = streamers.filter(s => securedIds.includes(s.id));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-6xl md:h-[80vh] z-[101] bg-resistance-dark border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <header className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-neon-green uppercase tracking-tighter">My Barracks</h2>
                                <p className="text-[10px] text-white/40 font-mono tracking-[0.3em] mt-1">
                                    {"// " + securedAssets.length + "_ASSETS_SECURED"}
                                </p>
                            </div>
                            <button
                                onClick={() => { playClick(); onClose(); }}
                                className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-neon-pink text-white/40 hover:text-neon-pink transition-all bg-black/50"
                            >
                                ✕
                            </button>
                        </header>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-10">
                            {securedAssets.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                                    {securedAssets.map((streamer, idx) => {
                                        const record = completedMissions.find(m => m.id === streamer.id);
                                        return (
                                            <motion.div
                                                key={streamer.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="group relative flex flex-col"
                                            >
                                                <div className="relative z-10">
                                                    <StreamerCard streamer={streamer} onHover={playHover} />
                                                </div>

                                                {/* Action Bar */}
                                                <div className="absolute inset-x-0 bottom-4 z-20 flex flex-col gap-2 px-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-black/80 backdrop-blur-md p-2 rounded border border-white/10 flex flex-col gap-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[8px] font-mono text-neon-blue uppercase">Status: Online</span>
                                                            {record && <span className="text-[8px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.5)]">Rank {record.rank}</span>}
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); playClick(); onClose(); onStartJourney(streamer); }}
                                                            className="w-full py-2.5 bg-neon-green text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,159,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                                                        >
                                                            [ START JOURNEY ]
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center mb-6">
                                        <span className="text-2xl">?</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">No Assets Found</h3>
                                    <p className="text-xs font-mono text-white/60 tracking-widest max-w-sm">
                                        You have not secured any streamer cards yet. Mint cards on the Global Roster to add them to your barracks.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

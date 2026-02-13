"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, X, Lock, Unlock, ChevronRight, User, Target, Zap } from 'lucide-react';
import { streamers, Streamer } from '@/data/streamers';
import { useCollectionStore } from '@/hooks/useCollectionStore';

interface NarrativeArchiveProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NarrativeArchive: React.FC<NarrativeArchiveProps> = ({ isOpen, onClose }) => {
    const unlockedNarratives = useCollectionStore(state => state.unlockedNarratives);
    const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(null);

    const starter5Ids = ['kaicenat', 'ishowspeed', 'dukedennis', 'druski', 'agent00'];
    const starter5 = streamers.filter(s => starter5Ids.includes(s.id));

    if (!isOpen) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="narrative-archive"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl"
            >
                <div className="relative w-full max-w-6xl h-full max-h-[800px] bg-resistance-dark border-2 border-neon-blue/20 shadow-[0_0_50px_rgba(0,243,255,0.15)] flex flex-col md:flex-row overflow-hidden rounded-sm">

                    {/* Decorative Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-5">
                        <div className="absolute inset-0 bg-[url('/grid_pattern.png')] bg-[length:50px_50px]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/20 to-transparent" />
                    </div>

                    {/* Sidebar: List of Streamers */}
                    <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-black/40 relative z-10">
                        <div className="p-6 border-b border-white/10">
                            <h3 className="text-xl font-black neon-text-blue italic uppercase tracking-tighter flex items-center gap-2">
                                <Book size={18} />
                                Neural Archives
                            </h3>
                            <p className="text-[9px] text-white/40 font-mono mt-1 uppercase tracking-widest">
                                // Phase_01: Starter_v_Signal
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {starter5.map((s) => {
                                const isUnlocked = unlockedNarratives.includes(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => isUnlocked && setSelectedStreamer(s)}
                                        className={`w-full p-4 flex items-center gap-4 border transition-all relative group ${selectedStreamer?.id === s.id
                                            ? 'bg-neon-blue/10 border-neon-blue text-white'
                                            : isUnlocked
                                                ? 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                                                : 'bg-black/40 border-white/5 text-white/20 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 border border-white/10 overflow-hidden grayscale">
                                                <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                                            </div>
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                                    <Lock size={12} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-xs font-bold uppercase tracking-widest">{s.name}</div>
                                            <div className="text-[8px] font-mono mt-0.5">{isUnlocked ? 'SIGNAL_STABLE' : 'SIGNAL_ENCRYPTED'}</div>
                                        </div>
                                        {isUnlocked && <ChevronRight size={14} className="opacity-40" />}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 border-t border-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <X size={14} /> Close_Archives
                        </button>
                    </div>

                    {/* Main Content: Story Detail */}
                    <div className="flex-1 overflow-y-auto relative z-10 bg-gradient-to-b from-transparent to-black/20">
                        {selectedStreamer ? (
                            <div className="p-8 md:p-12 space-y-10">
                                {/* Hero Header */}
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="w-32 h-32 md:w-48 md:h-48 border-4 border-neon-blue/40 shadow-[0_0_30px_rgba(0,243,255,0.2)] relative flex-shrink-0 mx-auto md:mx-0">
                                        <img src={selectedStreamer.image} alt={selectedStreamer.name} className="w-full h-full object-cover" />
                                        <div className="absolute -bottom-4 -right-4 bg-neon-blue px-3 py-1 text-black font-black text-xs uppercase tracking-tighter italic">
                                            {selectedStreamer.narrative.codename}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 bg-neon-blue/20 text-neon-blue text-[9px] font-black uppercase tracking-widest border border-neon-blue/30">
                                                {selectedStreamer.archetype}
                                            </span>
                                            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                            <span className="text-[9px] text-neon-green font-mono uppercase tracking-widest italic">Neural_Link_Verified</span>
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4">
                                            {selectedStreamer.name}
                                        </h2>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-white/5 border border-white/5">
                                                <div className="text-[8px] text-white/40 uppercase mb-1 flex items-center gap-2 font-black">
                                                    <Target size={10} className="text-neon-pink" /> Strategic_Role
                                                </div>
                                                <div className="text-xs font-bold text-white tracking-widest">{selectedStreamer.narrative.role}</div>
                                            </div>
                                            <div className="p-3 bg-white/5 border border-white/5">
                                                <div className="text-[8px] text-white/40 uppercase mb-1 flex items-center gap-2 font-black">
                                                    <Zap size={10} className="text-neon-yellow" /> Combat_Trait
                                                </div>
                                                <div className="text-xs font-bold text-white tracking-widest">{selectedStreamer.trait}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lore Sections */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-white/10 pt-10">
                                    <section>
                                        <h4 className="text-[10px] font-black tracking-[0.4em] text-neon-blue uppercase mb-6 flex items-center gap-3">
                                            <div className="w-4 h-[2px] bg-neon-blue" />
                                            Origin_Story
                                        </h4>
                                        <p className="text-white/80 font-mono text-sm leading-relaxed tracking-wide first-letter:text-3xl first-letter:font-black first-letter:text-neon-blue first-letter:mr-2">
                                            {selectedStreamer.narrative.originStory}
                                        </p>
                                    </section>
                                    <section>
                                        <h4 className="text-[10px] font-black tracking-[0.4em] text-resistance-accent uppercase mb-6 flex items-center gap-3">
                                            <div className="w-4 h-[2px] bg-resistance-accent" />
                                            Active_Mission
                                        </h4>
                                        <p className="text-white/80 font-mono text-sm leading-relaxed tracking-wide italic">
                                            {selectedStreamer.narrative.mission}
                                        </p>
                                        <div className="mt-8 p-4 bg-resistance-accent/5 border border-resistance-accent/20 rounded-sm">
                                            <h5 className="text-[9px] font-black text-resistance-accent mb-2 uppercase tracking-widest">// Connection_Log</h5>
                                            <p className="text-[11px] text-white/60 font-mono uppercase leading-normal">
                                                {selectedStreamer.narrative.connection}
                                            </p>
                                        </div>
                                    </section>
                                </div>

                                {/* Status Bar */}
                                <div className="mt-20 pt-6 border-t border-white/5 flex justify-between items-center opacity-30">
                                    <div className="text-[8px] font-mono uppercase tracking-[0.5em]">
                                        Uplink_Signature: {selectedStreamer.id.toUpperCase()}_0X77B
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-[8px] font-mono uppercase">Version: 1.0.0A</div>
                                        <div className="text-[8px] font-mono uppercase">Encryption: GRS-X</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                                <div className="w-20 h-20 border-2 border-neon-blue flex items-center justify-center mb-6 rotate-45">
                                    <User size={32} className="-rotate-45" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Select a Subject</h3>
                                <p className="text-sm font-mono uppercase tracking-[0.2em] max-w-sm">
                                    Neural connections require subject verification. Access secured intel records from the left module.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Scanning Line Effect */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-gradient-to-b from-transparent via-white to-transparent h-1 w-full z-50 animate-scan" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface GlossaryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface GlossaryEntry {
    term: string;
    definition: string;
    category: 'combat' | 'economy' | 'social' | 'system';
}

const GLOSSARY: GlossaryEntry[] = [
    // Combat
    { term: 'UPLINK', definition: 'A mission or connection to a streamer defense terminal. "Establishing uplink" means starting a battle.', category: 'combat' },
    { term: 'TERMINAL', definition: 'The battle interface where you fight Authority forces. Each streamer has their own mission terminal.', category: 'combat' },
    { term: 'ULTIMATE', definition: 'A powerful finishing move that charges by +20% each time you attack. Unleash at 100% charge.', category: 'combat' },
    { term: 'LAST STAND', definition: 'When your HP hits 0 but you have a Phoenix Module, you get one final turn to revive. Use it wisely.', category: 'combat' },
    { term: 'TYPE EFFECTIVENESS', definition: 'Moves follow a cycle: CHAOS > INTEL > DISRUPT > CHARISMA > REBELLION > CHAOS. Super effective = 1.5x damage.', category: 'combat' },
    { term: 'PHASE EVOLUTION', definition: 'Boss enemies power up at certain HP thresholds. Each phase increases their damage and unlocks new attacks.', category: 'combat' },
    { term: 'NATURE', definition: 'Each streamer has a randomly assigned nature (Bold, Timid, etc.) that slightly modifies their stats.', category: 'combat' },
    { term: 'PP (POWER POINTS)', definition: 'Each move has limited uses per battle. When PP reaches 0, that move is depleted.', category: 'combat' },

    // Economy
    { term: 'PTS', definition: 'Protect The Streams tokens. The in-game currency earned from winning missions. Spend at the Black Market.', category: 'economy' },
    { term: 'GLR', definition: 'Global Liberation Rating. Your total XP score across all activities — missions, PvP, and journey progress.', category: 'economy' },
    { term: 'BLACK MARKET', definition: 'The in-game shop where you spend PTS on healing chips, attack boosts, defense modules, and more.', category: 'economy' },
    { term: 'MINT', definition: 'Creating an NFT defense card on the Solana blockchain. Costs SOL and gives you ownership of that streamer card.', category: 'economy' },
    { term: 'SECURED', definition: 'A streamer card you own (minted). Secured cards unlock mission terminals and PvP arena access.', category: 'economy' },

    // Social
    { term: 'FACTION', definition: 'Join RED or PURPLE to compete on faction leaderboards, access faction chat, and earn faction-specific rewards.', category: 'social' },
    { term: 'SECTOR 7 ARENA', definition: 'The PvP battle zone. Challenge other operatives or practice against bot sentinels.', category: 'social' },
    { term: 'WAGER', definition: 'Stake PTS before a PvP match. Winner takes the full pot. Bot matches don\'t support wagers.', category: 'social' },
    { term: 'OPERATIVE', definition: 'That\'s you. A member of the Resistance fighting to protect streamers from corporate censorship.', category: 'social' },

    // System
    { term: 'NEURAL LINK', definition: 'Your authenticated session with the Resistance network. Powered by Solana wallet signatures.', category: 'system' },
    { term: 'SIGNAL', definition: 'Connection status. "Signal Stable" = connected. "Signal Lost" = mission failed.', category: 'system' },
    { term: 'THE BLACKOUT', definition: 'The Corporate Authority\'s plan to silence all independent streamers. The event that started the Resistance.', category: 'system' },
    { term: 'CORPORATE AUTHORITY', definition: 'The antagonist. A powerful entity that controls media and censors independent voices. Your mission: resist.', category: 'system' },
    { term: 'BARRACKS', definition: 'Your personal collection hub. View secured cards, stats, mission history, and start Streamer Journeys.', category: 'system' },
    { term: 'JOURNEY', definition: 'A multi-node progression path for each streamer. Complete encounters to earn bonus XP and PTS.', category: 'system' },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    combat: { label: 'COMBAT', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    economy: { label: 'ECONOMY', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    social: { label: 'SOCIAL', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
    system: { label: 'SYSTEM', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
};

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
    const focusTrapRef = useFocusTrap(isOpen, onClose);
    const [filter, setFilter] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = GLOSSARY.filter(entry => {
        if (filter && entry.category !== filter) return false;
        if (search && !entry.term.toLowerCase().includes(search.toLowerCase()) && !entry.definition.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="glossary-title"
                    onClick={onClose}
                >
                    <motion.div
                        ref={focusTrapRef as React.RefObject<HTMLDivElement>}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-lg max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 id="glossary-title" className="text-lg font-black tracking-widest text-neon-blue uppercase">RESISTANCE_CODEX</h2>
                                    <p className="text-[9px] font-mono text-white/40 tracking-widest mt-1">TERMINOLOGY_DATABASE — {GLOSSARY.length} ENTRIES</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm"
                                    aria-label="Close glossary"
                                >
                                    X
                                </button>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search terms..."
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-xs font-mono rounded-sm focus:outline-none focus:border-neon-blue/50 placeholder:text-white/40 mb-3"
                            />

                            {/* Category filters */}
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setFilter(null)}
                                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider border rounded-sm transition-all ${
                                        filter === null ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-white/40 hover:border-white/20'
                                    }`}
                                >
                                    ALL
                                </button>
                                {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(filter === key ? null : key)}
                                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider border rounded-sm transition-all ${
                                            filter === key ? `${color} border-current bg-current/10` : 'border-white/10 text-white/40 hover:border-white/20'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Entries */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filtered.length === 0 ? (
                                <div className="text-center py-8 text-white/40 text-xs font-mono uppercase tracking-widest">
                                    No matching entries found
                                </div>
                            ) : (
                                filtered.map((entry) => {
                                    const cat = CATEGORY_LABELS[entry.category];
                                    return (
                                        <div
                                            key={entry.term}
                                            className="p-3 bg-white/[0.02] border border-white/5 rounded-sm hover:border-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[11px] font-black text-white tracking-wider">{entry.term}</span>
                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 border rounded-sm ${cat.bg} ${cat.color}`}>
                                                    {cat.label}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-white/50 font-mono leading-relaxed">{entry.definition}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

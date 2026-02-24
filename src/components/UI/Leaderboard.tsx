"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface LeaderboardEntry {
    id: string;
    username: string | null;
    wins: number;
    losses: number;
    glr_points: number;
    rank: number;
    faction?: 'RED' | 'PURPLE' | 'NONE';
    level?: number;
}

// Ghost entries shown when no real operatives exist — motivates first-mover action
const GHOST_ENTRIES = [
    { id: 'ghost-1', username: '█████_OPERATIVE', wins: 0, losses: 0, glr_points: 0, rank: 1, faction: 'NONE' as const, level: 1 },
    { id: 'ghost-2', username: '███_REDACTED', wins: 0, losses: 0, glr_points: 0, rank: 2, faction: 'NONE' as const, level: 1 },
    { id: 'ghost-3', username: '████████_SIGNAL', wins: 0, losses: 0, glr_points: 0, rank: 3, faction: 'NONE' as const, level: 1 },
];

export const Leaderboard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMock, setIsMock] = useState(false);
    const focusTrapRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchLeaderboard();
        }
    }, [isOpen]);

    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            // Try fetching from real DB
            const { data, error } = await supabase
                .from('users')
                .select('id, username, wins, losses, glr_points, faction, level')
                .order('glr_points', { ascending: false })
                .limit(10);

            if (error || !data || data.length === 0) {
                setEntries([]);
                setIsMock(false);
            } else {
                setIsMock(false);
                setEntries(data.map((d, i) => ({
                    ...d,
                    username: d.username || `OPERATIVE_${d.id.substring(0, 4)}`,
                    rank: i + 1,
                    glr_points: d.glr_points || 0,
                    faction: d.faction || 'NONE'
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-title"
        >
            <motion.div
                ref={focusTrapRef as React.RefObject<HTMLDivElement>}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-[90vw] md:max-w-3xl bg-[#050505] border-2 border-white/10 rounded-sm overflow-hidden shadow-[0_0_80px_rgba(0,180,255,0.15)] relative"
                tabIndex={-1}
            >
                {/* Visual Scanning Line */}
                <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:100%_3px] animate-scan opacity-20" />

                <div className="p-8 border-b-2 border-white/5 flex justify-between items-center bg-gradient-to-r from-neon-blue/10 to-transparent relative group">
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-neon-blue via-white to-transparent opacity-50" />
                    <div>
                        <h2 id="leaderboard-title" className="text-xl md:text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                            <span className="text-neon-blue animate-pulse" aria-hidden="true">◈</span>
                            HIGH_COMMAND_Apex
                        </h2>
                        <div className="text-[6px] md:text-[8px] font-mono text-white/40 tracking-[0.4em] mt-1 italic uppercase">Sector_00 // Global_Operative_Rankings</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rotate-45 transition-all text-2xl"
                        aria-label="Close leaderboard"
                    >
                        +
                    </button>
                </div>

                <div className="p-8 min-h-[500px] relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-80 space-y-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-neon-blue/20 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-neon-blue rounded-full animate-spin" />
                            </div>
                            <span className="text-neon-blue font-mono text-[10px] tracking-[0.5em] animate-glitch">DECRYPTING_BIO_SIGNALS...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[7px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5">
                                        <th className="pb-2 md:pb-4 px-2 md:px-4 font-black">Rank</th>
                                        <th className="pb-2 md:pb-4 px-2 md:px-4 font-black">Operative_ID</th>
                                        <th className="pb-2 md:pb-4 px-2 md:px-4 font-black text-center">Affiliation</th>
                                        <th className="pb-2 md:pb-4 px-2 md:px-4 text-right font-black">Score / Wins</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-[12px]">
                                    {entries.length > 0 ? (
                                        /* Real entries */
                                        entries.map((entry) => (
                                            <motion.tr
                                                key={entry.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: entry.rank * 0.05 }}
                                                className={`group border-b border-white/[0.03] transition-colors relative ${entry.faction === 'RED' ? 'hover:bg-red-500/5' :
                                                    entry.faction === 'PURPLE' ? 'hover:bg-purple-500/5' :
                                                        'hover:bg-white/[0.02]'
                                                    }`}
                                            >
                                                <td className="py-3 md:py-5 px-2 md:px-4 font-black relative overflow-hidden">
                                                    <span className={`relative z-10 ${entry.rank === 1 ? 'text-neon-yellow text-xl' :
                                                        entry.rank === 2 ? 'text-white text-lg' :
                                                            entry.rank === 3 ? 'text-neon-blue text-lg' :
                                                                'text-white/40'
                                                        }`}>
                                                        {entry.rank.toString().padStart(2, '0')}
                                                    </span>
                                                    {entry.rank <= 3 && (
                                                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 ${entry.rank === 1 ? 'bg-neon-yellow shadow-[0_0_15px_#f3ff00]' :
                                                            entry.rank === 2 ? 'bg-white shadow-[0_0_15px_#fff]' :
                                                                'bg-neon-blue shadow-[0_0_15px_#00f3ff]'
                                                            }`} />
                                                    )}
                                                </td>
                                                <td className="py-3 md:py-5 px-2 md:px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-[10px] md:text-base text-white group-hover:text-neon-blue transition-colors uppercase tracking-tight">
                                                            {entry.username || 'UNIDENTIFIED_OPERATIVE'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[7px] text-white/20 uppercase tracking-tighter">SIG: {entry.id.substring(0, 8)}</span>
                                                            <span className="text-[7px] text-neon-green font-bold">[LVL.{entry.level || 1}]</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 md:py-5 px-2 md:px-4 text-center">
                                                    <div className={`px-2 py-0.5 inline-block text-[8px] font-black border rounded-sm ${entry.faction === 'RED' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                                        entry.faction === 'PURPLE' ? 'bg-purple-900/20 border-purple-500 text-purple-400' :
                                                            'bg-white/5 border-white/10 text-white/30'
                                                        }`}>
                                                        {entry.faction === 'NONE' ? 'NO_AFFILIATION' : `FACTION_${entry.faction}`}
                                                    </div>
                                                </td>
                                                <td className="py-3 md:py-5 px-2 md:px-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-neon-blue font-black text-sm">
                                                            {entry.glr_points.toLocaleString()} <span className="text-[8px] text-white/40">XP</span>
                                                        </span>
                                                        <span className="text-neon-green font-bold text-[10px]">
                                                            {entry.wins || 0} <span className="text-[8px] text-white/40">WINS</span>
                                                        </span>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        /* Ghost rows — shown before any real operatives exist */
                                        GHOST_ENTRIES.map((ghost, i) => (
                                            <motion.tr
                                                key={ghost.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="border-b border-white/[0.03]"
                                            >
                                                <td className="py-4 px-2 md:px-4 font-black text-white/20">
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="py-4 px-2 md:px-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-[10px] md:text-sm text-white/15 uppercase tracking-tight blur-[3px] select-none">
                                                            {ghost.username}
                                                        </span>
                                                        <span className="text-[7px] text-white/10 font-mono blur-[2px]">SIG: ████████</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 md:px-4 text-center">
                                                    <div className="px-2 py-0.5 inline-block text-[8px] font-black border border-white/5 text-white/10 blur-[2px]">
                                                        ████████
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 md:px-4 text-right">
                                                    <span className="text-white/10 text-[10px] blur-[2px]">——</span>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-black/40 border-t border-white/5 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" />
                            <span className="text-[7px] text-white/40 font-mono">UPLINK_LIVE</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-neon-blue rounded-full animate-pulse" />
                            <span className="text-[7px] text-white/40 font-mono">ENCRYPTION: MAX</span>
                        </div>

                        {/* First Operative Hook — only shown when no real entries exist */}
                        {!isLoading && entries.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-6 p-5 border border-neon-yellow/30 bg-neon-yellow/5 rounded-sm text-center space-y-3"
                            >
                                <div className="text-neon-yellow text-2xl animate-pulse">👑</div>
                                <p className="text-neon-yellow font-black text-sm tracking-widest uppercase">
                                    RANK_01 UNCLAIMED
                                </p>
                                <p className="text-white/40 text-[10px] font-mono leading-relaxed">
                                    The High Command leaderboard is empty. The first operative to mint and complete a mission will claim the #1 spot and earn permanent legend status.
                                </p>
                                <div className="inline-block px-4 py-1.5 border border-neon-yellow/40 text-neon-yellow text-[9px] font-black tracking-widest uppercase animate-pulse">
                                    ⚡ BE THE FIRST OPERATIVE ⚡
                                </div>
                            </motion.div>
                        )}
                    </div>
                    <p className="text-[8px] text-white/20 font-mono uppercase tracking-[0.2em]">
                        Last_Sync: {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

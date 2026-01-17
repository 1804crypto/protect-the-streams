import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardEntry {
    id: string;
    username: string | null;
    wins: number;
    losses: number;
    xp: number;
    rank: number;
}

export const Leaderboard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                .select('id, username, wins, losses, xp')
                .order('wins', { ascending: false })
                .order('xp', { ascending: false })
                .limit(10);

            if (error || !data || data.length === 0) {
                // Fallback to Mock Data if table doesn't exist or is empty
                console.warn("Using mock leaderboard data");
                setEntries([
                    { id: '1', username: 'NEO_V1', wins: 42, losses: 3, xp: 5000, rank: 1 },
                    { id: '2', username: 'GHOST_SHELL', wins: 38, losses: 5, xp: 4500, rank: 2 },
                    { id: '3', username: 'CYBER_WOLF', wins: 31, losses: 12, xp: 3000, rank: 3 },
                    { id: '4', username: 'CHROME_HEART', wins: 28, losses: 8, xp: 2500, rank: 4 },
                    { id: '5', username: 'DATA_MINER', wins: 25, losses: 15, xp: 2000, rank: 5 },
                ]);
            } else {
                setEntries(data.map((d, i) => ({
                    ...d,
                    username: d.username || `OPERATIVE_${d.id.substring(0, 4)}`,
                    rank: i + 1
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
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-[#050505] border-2 border-white/10 rounded-sm overflow-hidden shadow-[0_0_80px_rgba(0,0,243,255,0.15)] relative"
            >
                {/* Visual Scanning Line */}
                <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:100%_3px] animate-scan opacity-20" />

                <div className="p-8 border-b-2 border-white/5 flex justify-between items-center bg-gradient-to-r from-neon-blue/10 to-transparent relative group">
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-neon-blue via-white to-transparent opacity-50" />
                    <div>
                        <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                            <span className="text-neon-blue animate-pulse">◈</span>
                            GLOBAL_RANKINGS
                        </h2>
                        <div className="text-[8px] font-mono text-white/40 tracking-[0.4em] mt-1 italic uppercase">Sector_07 // Operative_Efficiency</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rotate-45 transition-all text-2xl"
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
                            <span className="text-neon-blue font-mono text-[10px] tracking-[0.5em] animate-glitch">DECRYPTING_DATABASE...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5">
                                        <th className="pb-4 px-4 font-black">Rank</th>
                                        <th className="pb-4 px-4 font-black">Operative_ID</th>
                                        <th className="pb-4 px-4 text-right font-black">Successes</th>
                                        <th className="pb-4 px-4 text-right font-black">Yield</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-[12px]">
                                    {entries.map((entry) => (
                                        <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: entry.rank * 0.05 }}
                                            className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors relative"
                                        >
                                            <td className="py-5 px-4 font-black relative overflow-hidden">
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
                                            <td className="py-5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white group-hover:text-neon-blue transition-colors uppercase tracking-tight">
                                                        {entry.username || 'UNIDENTIFIED_OPERATIVE'}
                                                    </span>
                                                    <span className="text-[7px] text-white/20 uppercase tracking-tighter">SIG: {entry.id.substring(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-right">
                                                <span className={`font-black ${entry.rank <= 3 ? 'text-white' : 'text-white/80'}`}>
                                                    {entry.wins}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-right">
                                                <span className="text-neon-green/80 font-black">
                                                    {((entry.wins / (entry.wins + entry.losses || 1)) * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
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
                    </div>
                    <p className="text-[8px] text-white/20 font-mono uppercase tracking-[0.2em]">
                        Last_Sync: {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

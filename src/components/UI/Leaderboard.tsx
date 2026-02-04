import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

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

export const Leaderboard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMock, setIsMock] = useState(false);

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
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-3xl bg-[#050505] border-2 border-white/10 rounded-sm overflow-hidden shadow-[0_0_80px_rgba(0,180,255,0.15)] relative"
            >
                {/* Visual Scanning Line */}
                <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:100%_3px] animate-scan opacity-20" />

                <div className="p-8 border-b-2 border-white/5 flex justify-between items-center bg-gradient-to-r from-neon-blue/10 to-transparent relative group">
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-neon-blue via-white to-transparent opacity-50" />
                    <div>
                        <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                            <span className="text-neon-blue animate-pulse">◈</span>
                            HIGH_COMMAND_Apex
                        </h2>
                        <div className="text-[8px] font-mono text-white/40 tracking-[0.4em] mt-1 italic uppercase">Sector_00 // Global_Operative_Rankings</div>
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
                            <span className="text-neon-blue font-mono text-[10px] tracking-[0.5em] animate-glitch">DECRYPTING_BIO_SIGNALS...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5">
                                        <th className="pb-4 px-4 font-black">Rank</th>
                                        <th className="pb-4 px-4 font-black">Operative_ID</th>
                                        <th className="pb-4 px-4 font-black text-center">Affiliation</th>
                                        <th className="pb-4 px-4 text-right font-black">Rating</th>
                                    </tr>
                                </thead>
                                {entries.length > 0 ? (
                                    <tbody className="font-mono text-[12px]">
                                        {entries.map((entry) => (
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[7px] text-white/20 uppercase tracking-tighter">SIG: {entry.id.substring(0, 8)}</span>
                                                            <span className="text-[7px] text-neon-green font-bold">[LVL.{entry.level || 1}]</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    <div className={`px-2 py-0.5 inline-block text-[8px] font-black border rounded-sm ${entry.faction === 'RED' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                                            entry.faction === 'PURPLE' ? 'bg-purple-900/20 border-purple-500 text-purple-400' :
                                                                'bg-white/5 border-white/10 text-white/30'
                                                        }`}>
                                                        {entry.faction === 'NONE' ? 'NO_AFFILIATION' : `FACTION_${entry.faction}`}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-right">
                                                    <span className="text-neon-blue font-black text-sm">
                                                        {entry.glr_points.toLocaleString()}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                ) : (
                                    <tbody>
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <span className="text-white/10 text-4xl">∅</span>
                                                    <span className="text-[10px] font-mono text-white/20 tracking-[0.4em] uppercase">NO_OPERATIVES_DETECTED_IN_SECTOR</span>
                                                    <span className="text-[7px] font-mono text-neon-blue/30 uppercase">Neural_Uplink: ESTABLISHING_FREQUENCIES...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
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

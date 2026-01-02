"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, Zap, X, Crown, TrendingUp } from 'lucide-react';
import { useCollectionStore } from '@/hooks/useCollectionStore';

interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    title: string;
    isUser?: boolean;
}

const MOCK_LEADERS: LeaderboardEntry[] = [
    { rank: 1, name: "Neon_Ghost", score: 154200, title: "Grand Arbiter" },
    { rank: 2, name: "Cypher_Queen", score: 142800, title: "Elite Infiltrator" },
    { rank: 3, name: "Void_Walker", score: 129500, title: "Sector General" },
    { rank: 4, name: "Binary_Rebel", score: 98000, title: "Tactical Lead" },
    { rank: 5, name: "Synth_Stalker", score: 85400, title: "Digital Scout" },
];

export const Leaderboard = ({ onClose }: { onClose: () => void }) => {
    const { totalResistanceScore } = useCollectionStore();

    const leaderboardData = useMemo(() => {
        const userEntry: LeaderboardEntry = {
            rank: 0, // Will calculate
            name: "YOU",
            score: totalResistanceScore,
            title: totalResistanceScore > 10000 ? "Sector General" : totalResistanceScore > 5000 ? "Elite Infiltrator" : "Resistance Cadet",
            isUser: true
        };

        const all = [...MOCK_LEADERS, userEntry].sort((a, b) => b.score - a.score);
        return all.map((entry, index) => ({ ...entry, rank: index + 1 }));
    }, [totalResistanceScore]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-resistance-accent/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,51,102,0.2)]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-resistance-accent/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-resistance-accent/20 rounded-lg">
                            <Trophy className="text-resistance-accent" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Resistance_Leaderboard</h2>
                            <p className="text-[10px] font-mono text-resistance-accent/60 tracking-widest uppercase">Global_Uplink_Active</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/40 hover:text-white transition-colors"
                        title="Close Leaderboard"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-black/40 border-b border-white/5">
                    <div className="space-y-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Global_Rank</span>
                        <div className="text-2xl font-black italic text-resistance-accent">
                            #{leaderboardData.find(e => e.isUser)?.rank}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Total_Contribution</span>
                        <div className="text-2xl font-black italic text-white flex items-center gap-1">
                            {totalResistanceScore.toLocaleString()} <Zap size={16} className="text-yellow-400" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Current_Tier</span>
                        <div className="text-sm font-bold text-resistance-accent uppercase tracking-tighter truncate">
                            {leaderboardData.find(e => e.isUser)?.title}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        {leaderboardData.map((entry) => (
                            <motion.div
                                key={entry.name}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${entry.isUser
                                        ? 'bg-resistance-accent/10 border-resistance-accent shadow-[0_0_20px_rgba(255,51,102,0.1)]'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 flex items-center justify-center font-black italic text-lg ${entry.rank === 1 ? 'text-yellow-400' :
                                            entry.rank === 2 ? 'text-zinc-400' :
                                                entry.rank === 3 ? 'text-amber-600' : 'text-white/40'
                                        }`}>
                                        {entry.rank === 1 ? <Crown size={20} /> : entry.rank}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-black italic uppercase ${entry.isUser ? 'text-resistance-accent' : 'text-white'}`}>
                                                {entry.name}
                                            </span>
                                            {entry.isUser && (
                                                <span className="px-1.5 py-0.5 bg-resistance-accent text-white text-[8px] font-bold rounded uppercase">You</span>
                                            )}
                                        </div>
                                        <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                                            {entry.title}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black italic text-white flex items-center justify-end gap-1">
                                        {entry.score.toLocaleString()} <Shield size={12} className="text-resistance-accent" />
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-[9px] text-green-400 font-mono">
                                        <TrendingUp size={10} /> +2.4%
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/60 text-center">
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                        Syncing_with_Solana_Mainnet_Uplink...
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

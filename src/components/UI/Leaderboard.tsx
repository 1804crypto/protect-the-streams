"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, Zap, X, Crown, TrendingUp } from 'lucide-react';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface LeaderboardEntry {
    rank?: number;
    username: string;
    resistance_score: number;
    faction: string;
    isUser?: boolean;
}

export const Leaderboard = ({ onClose }: { onClose: () => void }) => {
    const { totalResistanceScore } = useCollectionStore();
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    // 1. Fetch Leaders
    const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .limit(10);

        if (error) {
            toast.error("Failed to fetch global signal.");
        } else {
            setLeaders(data || []);
        }
        setLoading(false);
    };

    // 2. Profile Sync (Simplified for Demo - in reality would use Auth/Wallet)
    const syncProfile = async () => {
        const username = `REBEL_${Math.floor(Math.random() * 9000) + 1000}`;
        // For MVP, we use a local storage ID as a pseudo-auth
        let localId = localStorage.getItem('pts_pseudo_id');
        if (!localId) {
            localId = crypto.randomUUID();
            localStorage.setItem('pts_pseudo_id', localId);
        }

        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: localId,
                username: username,
                resistance_score: totalResistanceScore,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

        if (!error) {
            setUserProfile(data);
            fetchLeaderboard();
        }
    };

    useEffect(() => {
        syncProfile();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-neon-blue/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,243,255,0.2)]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-neon-blue/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neon-blue/20 rounded-lg">
                            <Trophy className="text-neon-blue" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Global_Resistance_Board</h2>
                            <p className="text-[10px] font-mono text-neon-blue/60 tracking-widest uppercase">Supabase_Uplink_Active</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-4 p-6 bg-black/40 border-b border-white/5">
                    <div className="space-y-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Your_Signal_Strength</span>
                        <div className="text-2xl font-black italic text-neon-blue flex items-center gap-1">
                            {totalResistanceScore.toLocaleString()} <Zap size={16} className="text-yellow-400" />
                        </div>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Active_Uplinks</span>
                        <div className="text-2xl font-black italic text-white">
                            {leaders.length}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar min-h-[300px]">
                    {loading ? (
                        <div className="h-full flex items-center justify-center opacity-20">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaders.map((entry, index) => {
                                const isMe = userProfile && entry.username === userProfile.username;
                                return (
                                    <motion.div
                                        key={entry.username}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isMe
                                                ? 'bg-neon-blue/10 border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.1)]'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 flex items-center justify-center font-black italic text-lg ${index === 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                                {index === 0 ? <Crown size={20} /> : index + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-black italic uppercase ${isMe ? 'text-neon-blue' : 'text-white'}`}>
                                                        {entry.username}
                                                    </span>
                                                    {isMe && (
                                                        <span className="px-1.5 py-0.5 bg-neon-blue text-black text-[8px] font-bold rounded uppercase">You</span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                                                    Faction_{entry.faction || 'NONE'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black italic text-white flex items-center justify-end gap-1">
                                                {entry.resistance_score.toLocaleString()} <Shield size={12} className="text-neon-blue" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/60 text-center">
                    <button
                        onClick={syncProfile}
                        className="text-[10px] font-mono text-neon-blue hover:text-white uppercase tracking-[0.2em] transition-all"
                    >
                        [ RE-SYNC_NEURAL_UPLINK ]
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

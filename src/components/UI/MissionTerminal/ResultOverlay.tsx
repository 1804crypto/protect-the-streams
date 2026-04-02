"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { items } from '@/data/items';
import { toast } from '@/hooks/useToastStore';

interface ResultOverlayProps {
    result: 'SUCCESS' | 'FAILURE' | null;
    rank: string | null;
    earnedXP: number;
    currentLevel: number;
    currentXP: number;
    nextXPThreshold: number;
    xpProgress: number;
    resultStep: number;
    lootedItems: string[];
    onClose: () => void;
    onViewRankings?: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
    result,
    rank,
    earnedXP,
    currentLevel,
    currentXP,
    nextXPThreshold,
    xpProgress,
    resultStep,
    lootedItems,
    onClose,
    onViewRankings
}) => {
    // First-win guidance toast
    const hasShownGuide = useRef(false);
    useEffect(() => {
        if (result === 'SUCCESS' && resultStep >= 1 && !hasShownGuide.current) {
            hasShownGuide.current = true;
            const isFirstWin = !localStorage.getItem('pts_first_win_toast');
            if (isFirstWin) {
                localStorage.setItem('pts_first_win_toast', 'true');
                const t = setTimeout(() => {
                    toast.success('FIRST VICTORY!', 'You earned PTS tokens. Visit the Black Market to spend them on gear and healing items.');
                }, 2500);
                return () => clearTimeout(t);
            }
        }
    }, [result, resultStep]);

    if (!result) return null;

    return (
        <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(25px)' }}
            className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-white/5"
        >
            {result === 'SUCCESS' ? (
                <div className="w-full max-w-md space-y-12">
                    {/* Step 1: Rank */}
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="relative"
                    >
                        <h3 className="text-neon-green text-sm font-black tracking-[0.8em] mb-4 uppercase">UPLINK_STABILIZED</h3>
                        <div className="text-[140px] font-black leading-none text-white drop-shadow-[0_0_60px_rgba(57,255,20,0.5)] italic select-none">
                            {rank}
                        </div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-neon-green text-[12px] font-black tracking-[0.5em] mt-2 uppercase"
                        >
                            {rank === 'S' ? 'SYSTEM_MESSIAH' :
                                rank === 'A' ? 'CORE_BREACHER' :
                                    rank === 'B' ? 'SIGNAL_RUNNER' : 'LINK_ESTABLISHED'}
                        </motion.div>
                        <div className="text-white/40 text-[8px] font-mono tracking-widest mt-1">PERFORMANCE_GRADE_VERIFIED</div>
                    </motion.div>

                    {/* Step 2: XP & Level (Appears after delay) */}
                    <AnimatePresence>
                        {resultStep >= 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-between items-end px-2">
                                    <div className="text-left">
                                        <div className="text-[10px] font-mono text-white/40 mb-1">DATA_SYNC_XP</div>
                                        <div className="text-2xl font-black text-white">+{earnedXP} <span className="text-[10px] text-neon-blue font-mono">NEURAL_XP</span></div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono text-white/40 mb-1">NODE_LEVEL</div>
                                        <div className="text-2xl font-black text-neon-blue">LVL.{currentLevel}</div>
                                    </div>
                                </div>
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                    <motion.div
                                        initial={{ width: `${xpProgress}%` }}
                                        animate={{ width: `${Math.min(100, nextXPThreshold > 0 ? xpProgress + (earnedXP / nextXPThreshold * 100) : 100)}%` }}
                                        transition={{ duration: 2, ease: "circOut" }}
                                        className="h-full bg-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.6)]"
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                                    <span>{currentXP} XP</span>
                                    <span>{nextXPThreshold > 0 ? `${nextXPThreshold} XP` : 'MAX'}</span>
                                </div>
                                {nextXPThreshold > 0 && xpProgress + (earnedXP / nextXPThreshold * 100) >= 100 && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity }}
                                        className="text-neon-yellow text-[10px] font-black tracking-[0.3em] mt-2"
                                    >
                                        !! LEVEL_UP_DETECTED !!
                                    </motion.div>
                                )}

                                {/* Gamification Badges */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex justify-center gap-4 mt-6 pt-4 border-t border-white/5"
                                >
                                    <div className="px-3 py-2 bg-neon-green/10 border border-neon-green/30 rounded-sm flex items-center gap-2">
                                        <span className="text-xl">🏅</span>
                                        <div className="text-left">
                                            <div className="text-[10px] text-neon-green font-black tracking-widest uppercase">+1 VICTORY</div>
                                            <div className="text-[8px] text-neon-green/60 font-mono">SECTOR SECURED</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-sm flex items-center gap-2">
                                        <span className="text-xl">📈</span>
                                        <div className="text-left">
                                            <div className="text-[10px] text-neon-blue font-black tracking-widest uppercase">FACTION SCORE</div>
                                            <div className="text-[8px] text-neon-blue/60 font-mono">INFLUENCE UPDATED</div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 3: Loot */}
                    <AnimatePresence>
                        {resultStep >= 1 && lootedItems.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-center gap-4 mt-8"
                            >
                                {lootedItems.map((itemId, idx) => (
                                    <div key={idx} className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-neon-yellow/10 border border-neon-yellow/30 flex items-center justify-center text-xl rounded-md shadow-[0_0_15px_rgba(243,255,0,0.2)]">
                                            {items[itemId]?.icon}
                                        </div>
                                        <div className="text-[8px] font-mono text-neon-yellow mt-2 uppercase tracking-tighter">{items[itemId]?.name}</div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex flex-col gap-3 mt-8"
                    >
                        <button
                            onClick={onClose}
                            className="w-full py-5 border-4 border-neon-green text-neon-green font-black tracking-[0.5em] hover:bg-neon-green hover:text-black transition-all relative overflow-hidden"
                        >
                            <span className="relative z-10">NEXT_MISSION</span>
                            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </button>
                        {onViewRankings && (
                            <button
                                onClick={onViewRankings}
                                className="w-full py-3 border border-neon-yellow/40 text-neon-yellow font-black tracking-[0.3em] text-[10px] hover:bg-neon-yellow/10 transition-all uppercase"
                            >
                                VIEW_RANKINGS
                            </button>
                        )}
                    </motion.div>
                </div>
            ) : (
                <div className="w-full max-w-sm space-y-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            filter: ["none", "hue-rotate(90deg) brightness(2)", "none"],
                        }}
                        transition={{ duration: 0.5, repeat: 2 }}
                    >
                        <div className="text-resistance-accent text-[80px] font-black italic animate-pulse">LOST_SIGNAL</div>
                        <div className="text-resistance-accent text-[10px] font-black tracking-[0.4em] uppercase mt-2">UPLINK_TERMINATED_BY_CORPORATE</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4"
                    >
                        <div className="text-white/60 text-[10px] font-mono uppercase tracking-widest">Consolation_Data_Fragments</div>
                        <div className="text-2xl font-black text-white">+10 <span className="text-[10px] text-resistance-accent font-mono">NEURAL_XP</span></div>
                        <p className="text-[10px] text-white/50 font-mono italic">Even in failure, the rebellion learns. Signal fragments analyzed.</p>
                    </motion.div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 border border-resistance-accent text-resistance-accent font-black tracking-[0.3em] uppercase hover:bg-resistance-accent hover:text-white transition-all text-xs"
                    >
                        RESYNC_ATTEMPT
                    </button>
                </div>
            )}
        </motion.div>
    );
};

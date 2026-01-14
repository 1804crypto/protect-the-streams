"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { streamers, Streamer } from '@/data/streamers';
import { MissionTerminal } from './MissionTerminal';
import { ResistanceMap } from './ResistanceMap';
import { Leaderboard } from './Leaderboard';
import { Trophy } from 'lucide-react';

interface CollectionHubProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CollectionHub: React.FC<CollectionHubProps> = ({ isOpen, onClose }) => {
    const securedIds = useCollectionStore(state => state.securedIds);
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const totalResistanceScore = useCollectionStore(state => state.totalResistanceScore);
    const getMissionRecordLocal = (id: string) => completedMissions.find(m => m.id === id);
    const [activeMissionStreamer, setActiveMissionStreamer] = React.useState<Streamer | null>(null);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = React.useState(false);
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

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full md:w-[480px] z-[101] bg-resistance-dark border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col pt-24 "
                    >
                        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8">
                            {/* Header */}
                            <header className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black neon-text-blue uppercase tracking-tighter">Secured Intel</h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <p className="text-[10px] text-white/40 font-mono tracking-[0.3em]">
                                            // {completedMissions.length} OF {streamers.length} SECTORS_LIBERATED
                                        </p>
                                        <div className="h-3 w-px bg-white/10" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-resistance-accent font-black animate-pulse">THREAT_LEVEL: {Math.floor(completedMissions.length / 2) + 1}</span>
                                        </div>
                                        <div className="h-3 w-px bg-white/10" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-yellow-400 font-black">RESISTANCE_SCORE: {totalResistanceScore.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsLeaderboardOpen(true)}
                                        className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-yellow-400 text-white/40 hover:text-yellow-400 transition-all"
                                        title="Open Leaderboard"
                                    >
                                        <Trophy size={18} />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-neon-pink text-white/40 hover:text-neon-pink transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </header>

                            {/* Resistance Strategic Map */}
                            <div className="mb-12">
                                <h3 className="text-[10px] font-black tracking-[0.3em] text-white/40 mb-4 uppercase">// STRATEGIC_MAP</h3>
                                <ResistanceMap onSectorClick={(s) => setActiveMissionStreamer(s as Streamer)} />
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">// DEFENSE_GRID_STATUS</h3>
                                <div className="h-1 w-full bg-white/5 relative overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(securedIds.length / streamers.length) * 100}%` }}
                                        className="absolute inset-y-0 left-0 bg-neon-green shadow-[0_0_10px_rgba(0,255,159,0.8)]"
                                    />
                                </div>
                            </div>

                            {/* Assets Content */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">// AVAILABLE_TACTICAL_UPLINKS</h3>
                                {securedAssets.length > 0 ? (
                                    securedAssets.map((asset) => {
                                        const record = getMissionRecordLocal(asset.id);
                                        return (
                                            <div key={asset.id} className="glass-card p-4 border-neon-green/20 flex gap-4 group">
                                                <div className="w-16 h-16 bg-resistance-dark border border-white/10 overflow-hidden relative">
                                                    <img
                                                        src={asset.image}
                                                        alt={asset.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-white uppercase text-sm tracking-widest">{asset.name}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-black text-neon-blue">LVL.{record?.level || 1}</span>
                                                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        className="h-full bg-neon-blue"
                                                                        animate={{
                                                                            width: `${((record?.xp || 0) / (record?.level ? (record.level >= 5 ? 1000 : [100, 250, 500, 1000][record.level - 1]) : 100)) * 100}%`
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[8px] text-neon-green font-mono">STATUS: PROTECTED</div>
                                                            {record && <div className="text-[10px] font-black text-white mt-0.5 shadow-[0_0_10px_rgba(255,255,255,0.1)]">RANK_{record.rank}</div>}
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-white/40 mt-1 uppercase tracking-tighter">{asset.archetype}</p>

                                                    <div className="mt-3 flex gap-2">
                                                        {Object.entries(asset.stats).slice(0, 2).map(([k, v]) => (
                                                            <div key={k} className="flex gap-2 items-center">
                                                                <span className="text-[7px] text-white/20 uppercase">{k}</span>
                                                                <span className="text-[8px] text-white font-mono">{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {asset.narrative && (
                                                        <div className="mt-2 pt-2 border-t border-white/5">
                                                            <p className="text-[7px] text-neon-blue/60 font-mono leading-tight">
                                                                // LINK: {asset.narrative.connection}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => setActiveMissionStreamer(asset)}
                                                        className={`mt-4 w-full py-2 text-[9px] font-black uppercase tracking-widest transition-all ${record
                                                            ? 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10'
                                                            : 'bg-neon-blue/10 border border-neon-blue/20 hover:bg-neon-blue/20 hover:border-neon-blue text-white'
                                                            }`}
                                                    >
                                                        {record ? '[ RE-ATTEMPT_MISSION ]' : '[ START_TACTICAL_MISSION ]'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                        <div className="w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center mb-4">
                                            <span className="text-xl">!</span>
                                        </div>
                                        <p className="text-xs font-mono uppercase tracking-[0.2em]">No assets secured in current sector.</p>
                                    </div>
                                )}
                            </div>


                            {/* Footer */}
                            <div className="p-8 bg-black/40 border-t border-white/5">
                                <p className="text-[8px] text-white/20 font-mono tracking-widest text-center">
                                    TERMINAL_SESSION_SECURE // AUTH_ID: {Math.random().toString(36).substring(7).toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-neon-blue opacity-10 pointer-events-none" />
                    </motion.div>

                    {/* Mission Terminal Instance */}
                    {activeMissionStreamer && (
                        <MissionTerminal
                            streamer={activeMissionStreamer}
                            isOpen={!!activeMissionStreamer}
                            onClose={() => setActiveMissionStreamer(null)}
                        />
                    )}

                    {/* Leaderboard Instance */}
                    <AnimatePresence>
                        {isLeaderboardOpen && (
                            <Leaderboard isOpen={true} onClose={() => setIsLeaderboardOpen(false)} />
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
};

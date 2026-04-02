"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import Image from 'next/image';

interface StreamerJourneyProps {
    streamer: Streamer;
    isOpen: boolean;
    onClose: () => void;
}

const JOURNEY_NODES = [
    { id: 0, title: "The Outskirts", desc: "Navigate the corporate firewall perimeter. Low threat, stable connection required.", difficulty: "EASY" },
    { id: 1, title: "Data Silo Alpha", desc: "Infiltrate the data vaults to recover suppressed streams.", difficulty: "MEDIUM" },
    { id: 2, title: "Corporate Gateway", desc: "Break past the secondary ICE layer. Threat detection is highly active.", difficulty: "HARD" },
    { id: 3, title: "The Core", desc: "Direct confrontation with the Authority Central Node. Proceed with extreme caution.", difficulty: "OMEGA" }
];

export const StreamerJourney: React.FC<StreamerJourneyProps> = ({ streamer, isOpen, onClose }) => {
    const { playHover, playClick, playSuccess } = useAudioSystem();
    const journeyProgress = useCollectionStore(state => state.journeyProgress);
    const advanceJourney = useCollectionStore(state => state.advanceJourney);

    // Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // -1 means no node is currently active (e.g., viewing map), >=0 means actively playing that node
    const [activeEncounterNode, setActiveEncounterNode] = useState<number | null>(null);
    const [encounterLogs, setEncounterLogs] = useState<string[]>([]);
    const [encounterPhase, setEncounterPhase] = useState<'idle' | 'simulating' | 'success'>('idle');
    const isOpenRef = useRef(isOpen);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // The current unlocked level for this streamer (0 = first node, 4 = completed all)
    const currentProgress = journeyProgress[streamer.id] || 0;
    const isJourneyComplete = currentProgress >= JOURNEY_NODES.length;

    useEffect(() => {
        if (!isOpen) {
            setActiveEncounterNode(null);
            setEncounterLogs([]);
            setEncounterPhase('idle');
        }
    }, [isOpen]);

    const handleEmbark = async (nodeId: number) => {
        if (nodeId !== currentProgress || isJourneyComplete) return; // Only embark on the current valid node

        playClick();
        setActiveEncounterNode(nodeId);
        setEncounterPhase('simulating');
        setEncounterLogs([`> Initiating uplink protocol for Node [${JOURNEY_NODES[nodeId].title}]...`]);

        // Simulating the "GameFi" mission run
        const logs = [
            "> Establishing secure proxy tunnel...",
            `> Injecting ${streamer.name}'s signature into the datastream...`,
            "> Bypassing Corporate ICE...",
            "> Engaging hostile security subroutines...",
            `> ${streamer.name} utilizing ${streamer.archetype} techniques...`,
            "> Security bypassed. Extracting target data...",
            "> Connection secured. Mission Accomplished."
        ];

        for (let i = 0; i < logs.length; i++) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
            if (!isOpenRef.current) return; // Abort if closed (ref avoids stale closure)
            setEncounterLogs(prev => [...prev, logs[i]]);
            playHover(); // Use hover sound for tick tick
        }

        await new Promise(r => setTimeout(r, 500));
        setEncounterPhase('success');
        playSuccess();
        advanceJourney(streamer.id);
    };

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
                        className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-2 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[95vw] md:max-w-7xl md:h-[85vh] z-[111] bg-resistance-dark border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden"
                    >
                        {/* Left Sidebar: Streamer Info */}
                        <div className="w-full md:w-[350px] border-b md:border-b-0 md:border-r border-white/10 bg-black/40 flex flex-col p-6 shrink-0 z-10">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{streamer.name}'s Journey</h2>

                            <div className="relative aspect-square w-full rounded overflow-hidden border border-white/10 mb-6">
                                <Image
                                    src={streamer.image}
                                    alt={streamer.name}
                                    fill
                                    className="object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="absolute bottom-4 left-4">
                                    <span className="text-[10px] font-mono text-neon-blue uppercase bg-black/60 px-2 py-1 border border-neon-blue/30 rounded-sm">
                                        CLASS: {streamer.archetype}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mb-1">Status</h3>
                                    <p className="text-xs font-black text-neon-green tracking-widest">{isJourneyComplete ? "CAMPAIGN COMPLETED" : "AWAITING ORDERS"}</p>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-sm">
                                    <h3 className="text-[10px] text-white/40 font-mono tracking-[0.2em] uppercase mb-2">Completion Record</h3>
                                    <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                                        <div
                                            className="h-full bg-neon-blue shadow-[0_0_10px_#00f3ff] transition-all duration-1000"
                                            style={{ width: `${(Math.min(currentProgress, JOURNEY_NODES.length) / JOURNEY_NODES.length) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[8px] font-mono text-right mt-1 text-neon-blue">{currentProgress}/{JOURNEY_NODES.length} NODES</p>
                                </div>
                            </div>

                            <button
                                onClick={() => { playClick(); onClose(); }}
                                className="w-full py-3 border border-white/20 text-white/60 hover:text-white hover:border-white font-black text-[10px] uppercase tracking-widest transition-all mt-auto"
                            >
                                [ RETURN_TO_BARRACKS ]
                            </button>
                        </div>

                        {/* Right Area: Journey Map & Encounter */}
                        <div className="flex-1 relative flex flex-col items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgba(0,243,255,0.05)_0%,transparent_70%)]">
                            {activeEncounterNode !== null ? (
                                /* Encounter Screen */
                                <div className="w-full max-w-2xl bg-black/80 border border-neon-blue/30 p-8 rounded-sm glass-card border-l-4 border-l-neon-blue relative">
                                    <button
                                        onClick={() => activeEncounterNode !== null && encounterPhase === 'success' ? setActiveEncounterNode(null) : null}
                                        disabled={encounterPhase === 'simulating'}
                                        className={`absolute top-4 right-4 text-white/40 hover:text-white transition-colors ${encounterPhase === 'simulating' ? 'hidden' : ''}`}
                                    >✕</button>

                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                                        NODE: {JOURNEY_NODES[activeEncounterNode].title}
                                    </h2>
                                    <p className="text-[10px] font-mono text-neon-blue tracking-widest uppercase mb-8">
                                        MISSION IN PROGRESS...
                                    </p>

                                    <div className="h-64 overflow-y-auto font-mono text-xs text-white/70 space-y-2 mb-8 bg-black/50 p-4 border border-white/5 font-cyber">
                                        {encounterLogs.map((log, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                            >
                                                <span className={`${log.includes('Accomplished') ? 'text-neon-green font-bold' : log.includes('hostile') ? 'text-resistance-accent' : 'text-white/60'}`}>
                                                    {log}
                                                </span>
                                            </motion.div>
                                        ))}
                                        {encounterPhase === 'simulating' && (
                                            <div className="flex items-center gap-2 mt-4 opacity-50">
                                                <div className="w-2 h-4 bg-neon-blue animate-pulse" />
                                                Processing...
                                            </div>
                                        )}
                                    </div>

                                    {encounterPhase === 'success' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-neon-green/10 border border-neon-green/30 text-center"
                                        >
                                            <h3 className="text-neon-green font-black uppercase text-lg mb-2">REWARDS GRANTED</h3>
                                            <div className="flex justify-center gap-6 font-mono text-sm">
                                                <span className="text-white">+ 300 EXP</span>
                                                <span className="text-neon-pink">+ 50 $PTS</span>
                                            </div>
                                            <button
                                                onClick={() => { playClick(); setActiveEncounterNode(null); }}
                                                className="mt-6 px-6 py-2 bg-neon-green text-black font-black uppercase text-[10px] hover:bg-white transition-all w-full"
                                            >
                                                [ RETURN TO MAP ]
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                /* Journey Map Overview */
                                <div className="w-full max-w-4xl relative">
                                    <h2 className="text-4xl font-black neon-text-blue uppercase tracking-tighter mb-12 text-center">Journey Map</h2>

                                    <div className="relative space-y-4 lg:space-y-0 lg:flex lg:justify-between lg:items-center">
                                        {/* Connector Line (Desktop) */}
                                        <div className="hidden lg:block absolute top-[50%] left-10 right-10 h-1 bg-white/5 -translate-y-1/2 z-0 border-y border-white/5" />

                                        {JOURNEY_NODES.map((node, idx) => {
                                            const isCompleted = idx < currentProgress;
                                            const isCurrent = idx === currentProgress;
                                            const isLocked = idx > currentProgress;

                                            return (
                                                <div key={node.id} className="relative z-10 flex flex-col items-center group w-full lg:w-48">
                                                    {/* Mobile Connector Line */}
                                                    {idx !== 0 && <div className="lg:hidden h-8 w-[2px] bg-white/5 my-2" />}

                                                    {/* Node Button */}
                                                    <button
                                                        onClick={() => handleEmbark(node.id)}
                                                        disabled={!isCurrent}
                                                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] flex items-center justify-center text-xl transition-all ${isCompleted
                                                                ? 'bg-neon-green/10 border-neon-green text-neon-green shadow-[0_0_20px_rgba(0,255,159,0.3)]'
                                                                : isCurrent
                                                                    ? 'bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_30px_rgba(0,243,255,0.6)] cursor-pointer hover:bg-neon-blue hover:text-black animate-pulse'
                                                                    : 'bg-black/80 border-white/10 text-white/40 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {isCompleted ? '✓' : isCurrent ? '!' : '🔒'}
                                                    </button>

                                                    {/* Node Info Card */}
                                                    <div className={`mt-4 p-4 text-center w-full max-w-sm lg:max-w-none glass-card border transition-all ${isCurrent ? 'border-neon-blue/50 bg-neon-blue/5' : 'border-white/5 bg-black/40'
                                                        }`}>
                                                        <h3 className={`text-sm font-black uppercase tracking-widest ${isCompleted ? 'text-neon-green' : isCurrent ? 'text-neon-blue' : 'text-white/40'}`}>
                                                            {node.title}
                                                        </h3>
                                                        <p className="text-[10px] text-white/50 font-mono mt-2 hidden md:block">
                                                            {node.desc}
                                                        </p>
                                                        {isCurrent && (
                                                            <div className="mt-3 text-[9px] font-black text-neon-pink uppercase">
                                                                Threat: {node.difficulty}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {isJourneyComplete && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mt-16 p-6 border-2 border-neon-green bg-neon-green/10 text-center max-w-md mx-auto rounded-sm backdrop-blur-md"
                                        >
                                            <h3 className="text-2xl font-black text-neon-green uppercase tracking-tighter mb-2">Campaign Complete</h3>
                                            <p className="text-xs font-mono text-white/80">You have successfully navigated all threat nodes. This operative's baseline strength is now fully realized.</p>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

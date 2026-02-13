"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Streamer } from '@/data/streamers';
import { CONFIG } from '@/data/config';
import { StreamerCard } from '@/components/Cards/StreamerCard';
import { CollectionHub } from '@/components/UI/CollectionHub';
import { motion, AnimatePresence } from 'framer-motion';
import { useMintStreamer } from '@/hooks/useMintStreamer';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useVoiceOperator } from '@/hooks/useVoiceOperator';
import { useGameDataStore } from '@/hooks/useGameDataStore';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useCheckUplinkStatus } from '@/hooks/useCheckUplinkStatus';

const Scene = dynamic(() => import('@/components/Three/Scene'), { ssr: false });
const WalletMultiButton = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

import { ResistanceMap } from '@/components/UI/ResistanceMap';
import { MissionTerminal } from '@/components/UI/MissionTerminal';
import { TutorialModal } from '@/components/UI/TutorialModal';
import { ToastSystem } from '@/components/UI/ToastSystem';
import { PvPTerminal } from '@/components/UI/PvPTerminal';
import { FactionSelection } from '@/components/UI/FactionSelection';
import { OperatorComms } from '@/components/UI/OperatorComms';
import { MediaUplink } from '@/components/UI/MediaUplink';
import { Leaderboard } from '@/components/UI/Leaderboard';
import { useOperatorStore } from '@/hooks/useOperatorStore';
import { AuthStatus } from '@/components/UI/AuthStatus';
import { NarrativeArchive } from '@/components/UI/NarrativeArchive';

export default function Home() {
    const { mint, loading, status, error, signature } = useMintStreamer();
    const { isMuted, toggleMute, playHover, playClick, playSuccess, forceUnmute } = useAudioSystem();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [activeMissionStreamer, setActiveMissionStreamer] = useState<Streamer | null>(null);
    const [activePvPStreamer, setActivePvPStreamer] = useState<Streamer | null>(null);
    const { streamers, fetchGameData, isInitialized, isLoading: isDataLoading } = useGameDataStore();
    const [mounted, setMounted] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [isFactionOpen, setIsFactionOpen] = useState(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);

    // Gated Rebellion Logic - ON-CHAIN NFT VERIFICATION (Signal Lock)
    const { userFaction } = useCollectionStore();
    const { hasNFT, loading: nftLoading, error: nftError } = useCheckUplinkStatus();
    const hasAccess = hasNFT || userFaction !== 'NONE';

    const { initAida } = useVoiceOperator();
    const { triggerDialogue } = useOperatorStore();

    // First-Click Audio Unlock
    useEffect(() => {
        const handleFirstClick = () => {
            forceUnmute();
            document.removeEventListener('click', handleFirstClick);
        };
        document.addEventListener('click', handleFirstClick, { once: true });
        return () => document.removeEventListener('click', handleFirstClick);
    }, [forceUnmute]);

    useEffect(() => {
        setMounted(true);
        if (!isInitialized) {
            fetchGameData();
        }

        // Check for first visit
        const hasSeenTutorial = localStorage.getItem('pts_tutorial_complete');
        if (!hasSeenTutorial) {
            setIsTutorialOpen(true);
        }

        // Trigger Operator Onboarding & Aida Greeting
        const greetingTimer = setTimeout(() => {
            initAida(); // Vocal Greeting
            triggerDialogue('onboarding'); // Visual Dialogue
        }, 2000);

        return () => clearTimeout(greetingTimer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status && status.includes("Secured")) {
            playSuccess();
        }
    }, [status, playSuccess]);

    if (!mounted) return <div className="min-h-screen bg-resistance-dark" />;

    return (
        <AnimatePresence mode='wait'>
            <motion.main
                className="relative min-h-screen w-full bg-resistance-dark text-white overflow-x-hidden uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* 3D Background */}
                <div className="fixed inset-0 z-0">
                    <Scene />
                </div>

                {/* Collection Hub Overlay */}
                <CollectionHub isOpen={isHubOpen} onClose={() => setIsHubOpen(false)} />

                {/* Navigation */}
                <nav className="relative z-50 flex justify-between items-center p-6 md:px-12 backdrop-blur-md bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-resistance-accent animate-pulse" />
                        <span className="font-display text-2xl font-black tracking-tighter">PTS_RESISTANCE</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { playClick(); forceUnmute(); setIsTutorialOpen(true); }}
                            className="px-4 py-2 border border-neon-green/40 text-[10px] font-bold tracking-widest hover:bg-neon-green/10 transition-all hidden md:block text-neon-green"
                        >
                            [HOW_TO_PLAY]
                        </button>
                        <button
                            onClick={() => { playClick(); setIsLeaderboardOpen(true); }}
                            className="px-4 py-2 border border-neon-yellow/40 text-[10px] font-bold tracking-widest hover:bg-neon-yellow/10 transition-all hidden md:block text-neon-yellow"
                        >
                            [RANKINGS]
                        </button>
                        <button
                            onClick={() => { playClick(); setIsHubOpen(true); }}
                            className="px-4 py-2 border border-neon-blue/40 text-[10px] font-bold tracking-widest hover:bg-neon-blue/10 transition-all hidden md:block"
                        >
                            [INTEL_RECOVERY]
                        </button>
                        <button
                            onClick={() => { playClick(); setIsArchiveOpen(true); }}
                            className="px-4 py-2 border border-neon-orange/40 text-[10px] font-bold tracking-widest hover:bg-neon-orange/10 transition-all hidden md:block text-neon-orange"
                        >
                            [ARCHIVES]
                        </button>

                        <button
                            onClick={() => { playClick(); setIsFactionOpen(true); }}
                            className="px-4 py-2 border border-neon-purple/40 text-[10px] font-bold tracking-widest hover:bg-neon-purple/10 transition-all hidden md:block text-neon-purple"
                        >
                            [JOIN_FACTION]
                        </button>

                        <button
                            onClick={toggleMute}
                            className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
                            title={isMuted ? "Unmute Resistance Signal" : "Mute Signal"}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>

                        <AuthStatus />

                        <WalletMultiButton className="!bg-neon-blue !rounded-none !font-display !uppercase !font-bold hover:!shadow-[0_0_15px_#00f3ff] transition-all !text-[12px]" />
                    </div>
                </nav>

                {/* Mobile Buttons */}
                <div className="md:hidden fixed bottom-24 right-6 z-50 flex flex-col gap-3">
                    <button
                        onClick={() => { playClick(); setIsTutorialOpen(true); }}
                        className="w-14 h-14 rounded-full bg-neon-green shadow-[0_0_20px_rgba(0,255,159,0.5)] flex items-center justify-center font-black text-xl"
                        title="How to Play"
                    >
                        ❓
                    </button>
                    <button
                        onClick={() => { playClick(); setIsLeaderboardOpen(true); }}
                        className="w-14 h-14 rounded-full bg-neon-yellow shadow-[0_0_20px_rgba(255,255,0,0.5)] flex items-center justify-center font-black text-xl"
                        title="Rankings"
                    >
                        🏆
                    </button>
                    <button
                        onClick={() => { playClick(); setIsHubOpen(true); }}
                        className="w-14 h-14 rounded-full bg-resistance-accent shadow-[0_0_20px_rgba(255,0,60,0.5)] flex items-center justify-center font-black text-xl"
                        title="Intel Recovery"
                    >
                        📁
                    </button>
                    <button
                        onClick={() => { playClick(); setIsArchiveOpen(true); }}
                        className="w-14 h-14 rounded-full bg-orange-500 shadow-[0_0_20px_rgba(255,165,0,0.5)] flex items-center justify-center font-black text-xl"
                        title="Neural Archives"
                    >
                        📜
                    </button>
                </div>

                {/* Hero Content */}
                <section className="relative z-10 flex flex-col items-center justify-center pt-32 pb-16 text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="text-6xl md:text-9xl font-black mb-6 animate-glitch neon-text-blue leading-none tracking-tighter">
                            PROTECT THE <br /> <span className="text-neon-pink">STREAMERS</span>
                        </h1>
                        <p className="text-xl md:text-2xl mb-12 text-white/60 max-w-3xl mx-auto tracking-[0.2em] leading-relaxed font-cyber">
                            THE CORPORATE AUTHORITY HAS INITIATED THE BLACKOUT. <br />
                            MINT YOUR <span className="text-white font-bold">DEFENSE CARDS</span>. SHIELD THE INFLUENCE.
                        </p>
                    </motion.div>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-wrap gap-6 justify-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onMouseEnter={playHover}
                                onClick={() => { playClick(); document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth' }); }}
                                disabled={loading}
                                className={`btn-resistance text-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'STATUS: UPLINKING...' : 'INITIALIZE MINT'}
                            </motion.button>

                            <motion.a
                                href="#roster"
                                onMouseEnter={playHover}
                                onClick={playClick}
                                whileHover={{ scale: 1.02 }}
                                className="px-10 py-4 bg-white/5 border border-white/20 text-white font-display uppercase font-bold hover:bg-neon-pink/10 hover:border-neon-pink transition-all tracking-widest flex items-center gap-2"
                            >
                                RESISTANCE ROSTER
                                <span className="text-[10px] animate-bounce">↓</span>
                            </motion.a>
                        </div>

                        {/* Minting Status Feedback */}
                        <div className="h-24 flex items-center justify-center">
                            {(status || signature) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-card p-4 border-neon-green/30 bg-neon-green/5 flex flex-col items-center gap-2"
                                >
                                    <p className="text-neon-green font-mono text-xs tracking-widest flex items-center gap-3">
                                        <span className="w-2 h-2 bg-neon-green rounded-full animate-ping" />
                                        {status ? `[SIGNAL_STABLE] ${status}` : '[UPLINK_SUCCESSFUL]'}
                                    </p>
                                    {signature && (
                                        <a
                                            href={`https://solscan.io/tx/${signature}?cluster=${CONFIG.NETWORK}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-neon-blue font-black underline hover:text-white transition-colors tracking-tighter"
                                        >
                                            [VIEW_ONCHAIN_VERIFICATION_HASH: {signature.substring(0, 8)}...]
                                        </a>
                                    )}
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="glass-card p-4 border-resistance-accent/30 bg-resistance-accent/5 max-w-md"
                                >
                                    <p className="text-resistance-accent font-mono text-[10px] mb-1 font-bold">[{error.code}]</p>
                                    <p className="text-white/80 text-[11px] tracking-wider font-cyber">{error.message}</p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Resistance Map Section - GATED */}
                <section className="relative z-10 px-6 md:px-12 mb-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-[10px] font-black tracking-[0.4em] text-neon-blue uppercase mb-2">// GLOBAL_RESISTANCE_PROGRESS</h3>
                                <h2 className="text-3xl font-black uppercase tracking-tighter">Strategic Sector Map</h2>
                            </div>
                            <div className="text-right hidden md:block">
                                <p className="text-[8px] text-white/30 font-mono uppercase tracking-widest">Signal Coverage</p>
                                <p className="text-sm font-black text-neon-green">STABLE</p>
                            </div>
                        </div>

                        {hasAccess ? (
                            <ResistanceMap onSectorClick={(s) => {
                                // BUG 20 FIX: Look up full streamer data instead of blind cast
                                const fullStreamer = streamers.find(st => st.id === s.id);
                                if (fullStreamer) setActiveMissionStreamer(fullStreamer);
                            }} />
                        ) : (
                            <div className="w-full h-[400px] border border-red-500/30 bg-red-500/5 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)]" />
                                <div className="relative z-10">
                                    <h3 className="text-4xl font-black text-red-500 mb-4 tracking-tighter flex items-center justify-center gap-4">
                                        <span className="text-2xl">🔒</span> SIGNAL LOCKED
                                    </h3>
                                    <p className="text-red-400 font-mono text-sm max-w-lg mx-auto tracking-widest leading-relaxed">
                                        SIGNAL LOCKED: MINT TO UNLOCK TERMINAL.
                                    </p>
                                    <div className="mt-8 animate-pulse">
                                        <a href="#roster" className="text-neon-blue underline font-bold text-xs tracking-[0.2em]">[PROCEED_TO_UPLINK_TERMINAL]</a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Roster Section with Scroll Trigger */}
                <section id="roster" className="relative z-10 px-6 md:px-12 pb-40">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 border-b border-white/10 pb-6 gap-4"
                    >
                        <div>
                            <h2 className="text-4xl font-black neon-text-blue tracking-tighter">Active Resistance Roster</h2>
                            <p className="text-white/40 font-mono text-[10px] mt-2 uppercase tracking-[0.3em]">
                                // {streamers.length}_SIGNATURES_DETECTED_IN_SECTOR_07
                            </p>
                        </div>
                        <div className="flex gap-10">
                            <div className="text-right">
                                <p className="text-[8px] text-white/30 font-mono uppercase">Encryption Status</p>
                                <p className="text-xs font-bold text-neon-green">UNBREAKABLE</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] text-white/30 font-mono uppercase">Threat Mitigation</p>
                                <p className="text-xs font-bold text-resistance-accent">ACTIVE</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 justify-items-center">
                        {streamers.map((streamer, idx) => (
                            <motion.div
                                key={streamer.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="relative group"
                            >
                                <StreamerCard
                                    streamer={streamer}
                                    onHover={playHover}
                                />
                                <div className="absolute inset-x-0 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex justify-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); playClick(); mint(streamer.id); }}
                                        disabled={loading}
                                        className={`px-3 py-1 text-[10px] font-black uppercase ${loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-neon-blue text-black hover:bg-white'}`}
                                    >
                                        MINT
                                    </button>
                                    {hasAccess && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playClick(); setActivePvPStreamer(streamer); }}
                                            className="px-3 py-1 bg-neon-pink text-white text-[10px] font-black uppercase"
                                        >
                                            PVP
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Footer / Status Bar */}
                <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-md border-t border-white/10 p-4 flex justify-between items-center px-12 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    <div>© 2025 THE_RESISTANCE // ALL_RIGHTS_RESERVED</div>
                    <div className="flex gap-8">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
                            NETWORK: {CONFIG.NETWORK.toUpperCase().replace('-', '_')}
                        </span>
                        <span className="text-resistance-accent">THREAT_LEVEL: OMEGA</span>
                    </div>
                </footer>

                {/* Mission Terminal Instance */}
                {activeMissionStreamer && (
                    <MissionTerminal
                        key={activeMissionStreamer.id}
                        streamer={activeMissionStreamer}
                        isOpen={!!activeMissionStreamer}
                        onClose={() => setActiveMissionStreamer(null)}
                    />
                )}

                {/* PvP Terminal Instance */}
                {activePvPStreamer && (
                    <PvPTerminal
                        streamer={activePvPStreamer}
                        matchId="global_queue"
                        isOpen={!!activePvPStreamer}
                        onClose={() => setActivePvPStreamer(null)}
                    />
                )}

                {/* Faction Selection Instance */}
                <FactionSelection isOpen={isFactionOpen} onClose={() => setIsFactionOpen(false)} />

                {/* Leaderboard Instance */}
                <Leaderboard isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />

                {/* Tutorial Modal */}
                <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

                {/* Narrative Archive Instance */}
                <NarrativeArchive isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} />

                {/* Notification System */}
                <ToastSystem />

                {/* Operator Comms System */}
                <OperatorComms />

                {/* Media Uplink System */}
                <MediaUplink />

                {/* Grid Overlay */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(0,243,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,1)_1px,transparent_1px)] bg-[size:50px_50px] z-[1]" />
            </motion.main>
        </AnimatePresence>
    );
}

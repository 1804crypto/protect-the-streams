"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CONFIG } from '@/data/config';
import { CollectionHub } from '@/components/UI/CollectionHub';
import { motion, AnimatePresence } from 'framer-motion';
import { useMintStreamer } from '@/hooks/useMintStreamer';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useVoiceOperator } from '@/hooks/useVoiceOperator';
import { useGameDataStore } from '@/hooks/useGameDataStore';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { useCheckUplinkStatus } from '@/hooks/useCheckUplinkStatus';
import { useModalStore } from '@/hooks/useModalStore';
import { useDeepLink } from '@/hooks/useDeepLink';

const Scene = dynamic(() => import('@/components/Three/Scene'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-resistance-dark" />
});
const WalletMultiButton = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
    {
        ssr: false,
        loading: () => <div className="h-10 w-36 bg-white/5 border border-white/10 animate-pulse" />
    }
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
import { RosterSection } from '@/components/sections/RosterSection';
import { MintStepIndicator } from '@/components/UI/MintStepIndicator';
import { StreamerBarracks } from '@/components/UI/StreamerBarracks';
import { StreamerJourney } from '@/components/UI/StreamerJourney';
import { OfflineDetector } from '@/components/UI/OfflineDetector';
import { OnboardingOverlay } from '@/components/UI/OnboardingOverlay';
import { GlossaryModal } from '@/components/UI/GlossaryModal';
import { AchievementTracker } from '@/components/UI/AchievementTracker';
import { MobileMenu } from '@/components/UI/MobileMenu';

export default function Home() {
    const { mint, loading, mintingStreamerId, status, error, signature } = useMintStreamer();
    const { isMuted, toggleMute, playHover, playClick, playSuccess, forceUnmute } = useAudioSystem();
    const { streamers, fetchGameData, isInitialized, isLoading: _isDataLoading } = useGameDataStore();
    const [mounted, setMounted] = useState(false);
    const [terminalLoading, setTerminalLoading] = useState<'mission' | 'pvp' | null>(null);

    // Consolidated modal state (replaces 9 separate useState calls)
    const modal = useModalStore();
    useDeepLink();
    const { activeMissionStreamer, activePvPStreamer, activeJourneyStreamer } = modal;

    const openMissionTerminal = useCallback((streamer: typeof activeMissionStreamer) => {
        if (!streamer) return;
        setTerminalLoading('mission');
        modal.setMissionStreamer(streamer);
        setTimeout(() => setTerminalLoading(null), 150);
    }, [modal]);

    const openPvPTerminal = useCallback((streamer: typeof activePvPStreamer) => {
        if (!streamer) return;
        setTerminalLoading('pvp');
        modal.setPvPStreamer(streamer);
        setTimeout(() => setTerminalLoading(null), 150);
    }, [modal]);
    const anyModalOpen = modal.anyOpen();
    const closeAllPanels = modal.closeAll;

    // GATED REBELLION LOGIC - ON-CHAIN NFT VERIFICATION (Signal Lock)
    const { userFaction } = useCollectionStore();
    const { hasNFT, ownedStreamerIds, loading: _nftLoading, error: _nftError } = useCheckUplinkStatus();
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
            modal.openModal('tutorial');
        }

        // Trigger Operator Onboarding & Aida Greeting — only once per session (BUG-05)
        const greetingTimer = setTimeout(() => {
            initAida(); // Vocal Greeting
            if (!sessionStorage.getItem('pts_onboarding_done')) {
                triggerDialogue('onboarding'); // Visual Dialogue
            }
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
                <CollectionHub isOpen={modal.activeModal === 'hub'} onClose={closeAllPanels} />

                {/* Navigation */}
                <nav className="relative z-50 flex justify-between items-center p-6 md:px-12 backdrop-blur-md bg-black/20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-resistance-accent animate-pulse" />
                        <span className="font-display text-2xl font-black tracking-tighter">PTS_RESISTANCE</span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        <button
                            onClick={() => { playClick(); forceUnmute(); modal.openModal('tutorial'); }}
                            className="px-4 py-2 border border-neon-green/40 text-[10px] font-bold tracking-widest hover:bg-neon-green/10 transition-all hidden md:block text-neon-green"
                        >
                            [HOW_TO_PLAY]
                        </button>
                        <button
                            onClick={() => { playClick(); modal.openModal('leaderboard'); }}
                            className="px-4 py-2 border border-neon-yellow/40 text-[10px] font-bold tracking-widest hover:bg-neon-yellow/10 transition-all hidden md:block text-neon-yellow"
                        >
                            [RANKINGS]
                        </button>
                        <button
                            onClick={() => { playClick(); modal.openModal('hub'); }}
                            className="px-4 py-2 border border-neon-blue/40 text-[10px] font-bold tracking-widest hover:bg-neon-blue/10 transition-all hidden md:block"
                        >
                            [MY_COLLECTION]
                        </button>
                        <button
                            onClick={() => { playClick(); modal.openModal('barracks'); }}
                            className="px-4 py-2 border border-neon-green/40 text-[10px] font-bold tracking-widest hover:bg-neon-green/10 transition-all hidden md:block text-neon-green shadow-sm"
                        >
                            [MY_BARRACKS]
                        </button>
                        <button
                            onClick={() => { playClick(); modal.openModal('archive'); }}
                            className="px-4 py-2 border border-neon-orange/40 text-[10px] font-bold tracking-widest hover:bg-neon-orange/10 transition-all hidden md:block text-neon-orange"
                        >
                            [LORE]
                        </button>

                        <button
                            onClick={() => { playClick(); modal.openModal('faction'); }}
                            className="px-4 py-2 border border-neon-purple/40 text-[10px] font-bold tracking-widest hover:bg-neon-purple/10 transition-all hidden md:block text-neon-purple"
                        >
                            [JOIN_FACTION]
                        </button>
                        <button
                            onClick={() => { playClick(); modal.openModal('glossary'); }}
                            className="px-4 py-2 border border-neon-blue/40 text-[10px] font-bold tracking-widest hover:bg-neon-blue/10 transition-all hidden md:block text-neon-blue"
                        >
                            [CODEX]
                        </button>

                        <button
                            onClick={toggleMute}
                            className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-blue"
                            title={isMuted ? "Unmute Resistance Signal" : "Mute Signal"}
                            aria-label={isMuted ? "Unmute Resistance Signal" : "Mute Signal"}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>

                        <AuthStatus />

                        <div id="wallet-connect-area">
                            <WalletMultiButton className="!bg-neon-blue !rounded-none !font-display !uppercase !font-bold hover:!shadow-[0_0_15px_#00f3ff] transition-all !text-[12px]" />
                        </div>
                    </div>
                </nav>

                {/* Mobile Hamburger Menu — replaces individual FABs for cleaner UX */}
                <MobileMenu
                    isHidden={anyModalOpen}
                    items={[
                        { label: 'HOW TO PLAY', icon: '❓', color: 'text-neon-green', borderColor: 'border-neon-green/30', action: () => { playClick(); forceUnmute(); modal.openModal('tutorial'); } },
                        { label: 'RANKINGS', icon: '🏆', color: 'text-neon-yellow', borderColor: 'border-neon-yellow/30', action: () => { playClick(); modal.openModal('leaderboard'); } },
                        { label: 'MY COLLECTION', icon: '📁', color: 'text-resistance-accent', borderColor: 'border-resistance-accent/30', action: () => { playClick(); modal.openModal('hub'); } },
                        { label: 'MY BARRACKS', icon: '🏠', color: 'text-neon-green', borderColor: 'border-neon-green/30', action: () => { playClick(); modal.openModal('barracks'); } },
                        { label: 'LORE', icon: '📜', color: 'text-neon-orange', borderColor: 'border-neon-orange/30', action: () => { playClick(); modal.openModal('archive'); } },
                        { label: 'JOIN FACTION', icon: '⚔️', color: 'text-neon-purple', borderColor: 'border-neon-purple/30', action: () => { playClick(); modal.openModal('faction'); } },
                        { label: 'CODEX', icon: '📖', color: 'text-neon-blue', borderColor: 'border-neon-blue/30', action: () => { playClick(); modal.openModal('glossary'); } },
                    ]}
                />

                {/* Hero Content */}
                <section className="relative z-10 flex flex-col items-center justify-center pt-32 pb-16 text-center px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-9xl font-black mb-6 animate-glitch neon-text-blue leading-none tracking-tighter">
                            PROTECT THE <br /> <span className="text-neon-pink">STREAMERS</span>
                        </h1>
                        <p className="text-base sm:text-xl md:text-2xl mb-8 sm:mb-12 text-white/60 max-w-3xl mx-auto tracking-[0.1em] sm:tracking-[0.2em] leading-relaxed font-cyber">
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
                                className="btn-resistance text-xl"
                            >
                                MINT YOUR FIRST CARD
                            </motion.button>

                            <motion.button
                                onMouseEnter={playHover}
                                onClick={() => { playClick(); forceUnmute(); modal.openModal('tutorial'); }}
                                whileHover={{ scale: 1.02 }}
                                className="px-10 py-4 bg-white/5 border border-white/20 text-white font-display uppercase font-bold hover:bg-neon-pink/10 hover:border-neon-pink transition-all tracking-widest flex items-center gap-2"
                            >
                                HOW TO PLAY
                                <span className="text-[10px]">❓</span>
                            </motion.button>
                        </div>

                        {/* Minting Status Feedback */}
                        <div className="h-auto min-h-[6rem] flex flex-col items-center justify-center gap-3">
                            {loading && (
                                <MintStepIndicator status={status} />
                            )}
                            {!loading && (status || signature) && (
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
                                <h3 className="text-[10px] font-black tracking-[0.4em] text-neon-blue uppercase mb-2">{"// GLOBAL_RESISTANCE_PROGRESS"}</h3>
                                <h2 className="text-3xl font-black uppercase tracking-tighter">Strategic Sector Map</h2>
                            </div>
                            <div className="text-right hidden md:block">
                                <p className="text-[8px] text-white/50 font-mono uppercase tracking-widest">Signal Coverage</p>
                                <p className="text-sm font-black text-neon-green">STABLE</p>
                            </div>
                        </div>

                        {hasAccess ? (
                            <ResistanceMap onSectorClick={(s) => {
                                // BUG 20 FIX: Look up full streamer data instead of blind cast
                                const fullStreamer = streamers.find(st => st.id === s.id);
                                if (fullStreamer) openMissionTerminal(fullStreamer);
                            }} />
                        ) : (
                            <div className="w-full h-[400px] border border-white/10 bg-white/[0.02] backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 relative overflow-hidden group rounded-lg">
                                {/* Faded map preview background */}
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.3),transparent_70%)]" />
                                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,255,255,0.02)_20px,rgba(255,255,255,0.02)_40px)]" />
                                <div className="relative z-10 max-w-md">
                                    <div className="w-16 h-16 mx-auto mb-4 border-2 border-neon-blue/30 rounded-full flex items-center justify-center bg-neon-blue/5">
                                        <span className="text-3xl">🗺️</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tighter">
                                        SECTOR MAP LOCKED
                                    </h3>
                                    <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed mb-2">
                                        Own at least one Streamer NFT to unlock the Strategic Sector Map, start missions, and fight for the Resistance.
                                    </p>
                                    <p className="text-white/50 text-xs font-mono tracking-wider mb-6">
                                        Joining a faction also grants access.
                                    </p>
                                    <a
                                        href="#roster"
                                        className="inline-block px-6 py-3 bg-neon-blue/10 border border-neon-blue text-neon-blue font-black text-xs tracking-[0.2em] hover:bg-neon-blue/20 transition-all uppercase"
                                    >
                                        MINT YOUR FIRST CARD
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Roster Section with Scroll Trigger */}
                {/* Roster Section with Scroll Trigger */}
                <RosterSection
                    streamers={streamers}
                    hasAccess={hasAccess}
                    ownedStreamerIds={ownedStreamerIds}
                    loading={loading}
                    mintingStreamerId={mintingStreamerId}
                    mint={mint}
                    playHover={playHover}
                    playClick={playClick}
                    onPvP={(streamer) => openPvPTerminal(streamer)}
                    onMission={(streamer) => openMissionTerminal(streamer)}
                />

                {/* Footer / Status Bar */}
                <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-md border-t border-white/10 p-3 md:p-4 flex justify-between items-center px-4 md:px-12 text-[9px] md:text-[10px] font-mono text-white/60 uppercase tracking-widest safe-padding-bottom">
                    <div className="hidden sm:block">© 2025 THE_RESISTANCE</div>
                    <div className="flex gap-4 md:gap-8">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
                            {CONFIG.NETWORK.toUpperCase().replace('-', '_')}
                        </span>
                        <span className="text-resistance-accent hidden sm:inline">THREAT_LEVEL: OMEGA</span>
                    </div>
                </footer>

                {/* Terminal Loading Spinner */}
                <AnimatePresence>
                    {terminalLoading && (
                        <motion.div
                            key="terminal-loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin" />
                                <p className="text-[10px] font-mono text-neon-blue tracking-[0.3em] uppercase animate-pulse">
                                    {terminalLoading === 'mission' ? 'LOADING_MISSION_TERMINAL' : 'LOADING_PVP_TERMINAL'}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mission Terminal Instance */}
                {activeMissionStreamer && (
                    <MissionTerminal
                        key={activeMissionStreamer.id}
                        streamer={activeMissionStreamer}
                        isOpen={!!activeMissionStreamer}
                        onClose={() => modal.setMissionStreamer(null)}
                    />
                )}

                {/* PvP Terminal Instance */}
                {activePvPStreamer && (
                    <PvPTerminal
                        streamer={activePvPStreamer}
                        matchId="global_queue"
                        isOpen={!!activePvPStreamer}
                        onClose={() => modal.setPvPStreamer(null)}
                    />
                )}

                {/* Barracks Instance */}
                <StreamerBarracks
                    isOpen={modal.activeModal === 'barracks'}
                    onClose={closeAllPanels}
                    onStartJourney={(s) => modal.setJourneyStreamer(s)}
                />

                {/* Streamer Journey GameFi Layer Instance */}
                {activeJourneyStreamer && (
                    <StreamerJourney
                        streamer={activeJourneyStreamer}
                        isOpen={!!activeJourneyStreamer}
                        onClose={() => modal.setJourneyStreamer(null)}
                    />
                )}

                {/* Faction Selection Instance */}
                <FactionSelection isOpen={modal.activeModal === 'faction'} onClose={closeAllPanels} />

                {/* Leaderboard Instance */}
                <Leaderboard isOpen={modal.activeModal === 'leaderboard'} onClose={closeAllPanels} />

                {/* Tutorial Modal */}
                <TutorialModal isOpen={modal.activeModal === 'tutorial'} onClose={() => {
                    localStorage.setItem('pts_tutorial_complete', 'true');
                    window.dispatchEvent(new CustomEvent('pts:tutorial_complete'));
                    closeAllPanels();
                    // After tutorial closes, scroll to roster so onboarding spotlight can find targets
                    setTimeout(() => {
                        document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                }} />

                {/* Narrative Archive Instance */}
                <NarrativeArchive isOpen={modal.activeModal === 'archive'} onClose={closeAllPanels} />

                {/* Glossary/Codex Modal */}
                <GlossaryModal isOpen={modal.activeModal === 'glossary'} onClose={closeAllPanels} />

                {/* Notification System */}
                <ToastSystem />

                {/* Operator Comms System */}
                <OperatorComms />

                {/* Offline Detection */}
                <OfflineDetector />

                {/* Interactive Onboarding (shows once after tutorial) */}
                <OnboardingOverlay />

                {/* Achievement Tracker (invisible — fires toasts on milestones) */}
                <AchievementTracker />

                {/* Media Uplink System */}
                <MediaUplink />

                {/* Grid Overlay */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(0,243,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,1)_1px,transparent_1px)] bg-[size:50px_50px] z-[1]" />
            </motion.main>
        </AnimatePresence>
    );
}

"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Volume2, VolumeX, HelpCircle, Trophy, FolderOpen, ScrollText, Users } from 'lucide-react';
import { AuthStatus } from '@/components/UI/AuthStatus';

const WalletMultiButton = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

interface NavbarProps {
    isMuted: boolean;
    toggleMute: () => void;
    onHowToPlay: () => void;
    onRankings: () => void;
    onIntelRecovery: () => void;
    onArchives: () => void;
    onFaction: () => void;
    playClick: () => void;
    forceUnmute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
    isMuted,
    toggleMute,
    onHowToPlay,
    onRankings,
    onIntelRecovery,
    onArchives,
    onFaction,
    playClick,
    forceUnmute,
}) => {
    return (
        <nav className="relative z-50 flex justify-between items-center p-6 md:px-12 backdrop-blur-md bg-black/20" role="navigation" aria-label="Main navigation">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-resistance-accent animate-pulse" aria-hidden="true" />
                <span className="font-display text-2xl font-black tracking-tighter">PTS_RESISTANCE</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => { playClick(); forceUnmute(); onHowToPlay(); }}
                    className="px-4 py-2 border border-neon-green/40 text-[10px] font-bold tracking-widest hover:bg-neon-green/10 transition-all hidden md:flex items-center gap-2 text-neon-green"
                    aria-label="How to play"
                >
                    <HelpCircle size={14} aria-hidden="true" />
                    [HOW_TO_PLAY]
                </button>
                <button
                    onClick={() => { playClick(); onRankings(); }}
                    className="px-4 py-2 border border-neon-yellow/40 text-[10px] font-bold tracking-widest hover:bg-neon-yellow/10 transition-all hidden md:flex items-center gap-2 text-neon-yellow"
                    aria-label="View rankings"
                >
                    <Trophy size={14} aria-hidden="true" />
                    [RANKINGS]
                </button>
                <button
                    onClick={() => { playClick(); onIntelRecovery(); }}
                    className="px-4 py-2 border border-neon-blue/40 text-[10px] font-bold tracking-widest hover:bg-neon-blue/10 transition-all hidden md:flex items-center gap-2"
                    aria-label="Open intel recovery"
                >
                    <FolderOpen size={14} aria-hidden="true" />
                    [INTEL_RECOVERY]
                </button>
                <button
                    onClick={() => { playClick(); onArchives(); }}
                    className="px-4 py-2 border border-neon-orange/40 text-[10px] font-bold tracking-widest hover:bg-neon-orange/10 transition-all hidden md:flex items-center gap-2 text-neon-orange"
                    aria-label="Open narrative archives"
                >
                    <ScrollText size={14} aria-hidden="true" />
                    [ARCHIVES]
                </button>
                <button
                    onClick={() => { playClick(); onFaction(); }}
                    className="px-4 py-2 border border-neon-purple/40 text-[10px] font-bold tracking-widest hover:bg-neon-purple/10 transition-all hidden md:flex items-center gap-2 text-neon-purple"
                    aria-label="Join a faction"
                >
                    <Users size={14} aria-hidden="true" />
                    [JOIN_FACTION]
                </button>

                <button
                    onClick={toggleMute}
                    className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                >
                    {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                </button>

                <AuthStatus />

                <WalletMultiButton className="!bg-neon-blue !rounded-none !font-display !uppercase !font-bold hover:!shadow-[0_0_15px_#00f3ff] transition-all !text-[12px]" />
            </div>
        </nav>
    );
};

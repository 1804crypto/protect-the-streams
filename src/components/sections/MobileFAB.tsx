"use client";

import React from 'react';
import { HelpCircle, Trophy, FolderOpen, ScrollText } from 'lucide-react';

interface MobileFABProps {
    onHowToPlay: () => void;
    onRankings: () => void;
    onIntelRecovery: () => void;
    onArchives: () => void;
    playClick: () => void;
}

export const MobileFAB: React.FC<MobileFABProps> = ({
    onHowToPlay,
    onRankings,
    onIntelRecovery,
    onArchives,
    playClick,
}) => {
    return (
        <div className="md:hidden fixed bottom-6 right-4 z-50 flex flex-col gap-3 safe-padding-bottom" role="toolbar" aria-label="Quick actions">
            <button
                onClick={() => { playClick(); onHowToPlay(); }}
                className="w-14 h-14 rounded-full bg-neon-green shadow-[0_0_20px_rgba(0,255,159,0.5)] flex items-center justify-center"
                aria-label="How to play"
            >
                <HelpCircle size={24} className="text-black" aria-hidden="true" />
            </button>
            <button
                onClick={() => { playClick(); onRankings(); }}
                className="w-14 h-14 rounded-full bg-neon-yellow shadow-[0_0_20px_rgba(255,255,0,0.5)] flex items-center justify-center"
                aria-label="View rankings"
            >
                <Trophy size={24} className="text-black" aria-hidden="true" />
            </button>
            <button
                onClick={() => { playClick(); onIntelRecovery(); }}
                className="w-14 h-14 rounded-full bg-resistance-accent shadow-[0_0_20px_rgba(255,0,60,0.5)] flex items-center justify-center"
                aria-label="Open intel recovery"
            >
                <FolderOpen size={24} className="text-white" aria-hidden="true" />
            </button>
            <button
                onClick={() => { playClick(); onArchives(); }}
                className="w-14 h-14 rounded-full bg-orange-500 shadow-[0_0_20px_rgba(255,165,0,0.5)] flex items-center justify-center"
                aria-label="Open narrative archives"
            >
                <ScrollText size={24} className="text-white" aria-hidden="true" />
            </button>
        </div>
    );
};

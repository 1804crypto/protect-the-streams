"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const tutorialSteps = [
    {
        title: "WELCOME_OPERATIVE",
        icon: "⚡",
        content: "The Corporate Authority has initiated THE BLACKOUT — silencing independent streamers worldwide. You are the Resistance. Your mission: mint defense cards, fight back, and climb the ranks.",
        highlight: "neon-blue"
    },
    {
        title: "STEP_1:_CONNECT_WALLET",
        icon: "🔗",
        content: "Hit the wallet button in the top-right to connect your Solana wallet (Phantom, Backpack, etc.). This is your identity in the Resistance network. No wallet? No problem — browse the roster first.",
        highlight: "neon-pink"
    },
    {
        title: "STEP_2:_MINT_YOUR_FIRST_CARD",
        icon: "🎴",
        content: "Scroll down to the Resistance Roster and click MINT on any streamer. Each card is a unique NFT on Solana. Owning a card unlocks missions, PvP, and the Sector Map.",
        highlight: "neon-green"
    },
    {
        title: "STEP_3:_START_A_MISSION",
        icon: "🎯",
        content: "Click TERMINAL on any card you own to enter a liberation mission. Fight through 3 stages of enemies + a final boss. Your performance earns a rank: S, A, B, or C.",
        highlight: "neon-blue"
    },
    {
        title: "COMBAT_BASICS",
        icon: "⚔️",
        content: "Battles are turn-based. Each streamer has 3 moves + an Ultimate. Your charge meter builds +20% per attack — at 100%, unleash your finisher! Use the TYPE button in battle to check matchups.",
        highlight: "neon-pink"
    },
    {
        title: "EARN_AND_SPEND",
        icon: "🛒",
        content: "Win missions to earn PTS tokens and XP. Spend PTS at the Black Market on healing chips, attack boosts, and gear. Deploy items mid-battle from your inventory.",
        highlight: "neon-green"
    },
    {
        title: "RISE_THROUGH_THE_RANKS",
        icon: "🏆",
        content: "Join RED or PURPLE faction to compete on leaderboards. Level up your streamers, challenge other players in PvP, and explore Streamer Journeys in your Barracks. Good luck, Operative.",
        highlight: "resistance-accent"
    }
];

// Static class lookups to prevent Tailwind purge issues with dynamic classes
const highlightBg: Record<string, string> = {
    'neon-blue': 'bg-neon-blue',
    'neon-pink': 'bg-neon-pink',
    'neon-green': 'bg-neon-green',
    'resistance-accent': 'bg-resistance-accent',
};

const highlightText: Record<string, string> = {
    'neon-blue': 'text-neon-blue',
    'neon-pink': 'text-neon-pink',
    'neon-green': 'text-neon-green',
    'resistance-accent': 'text-resistance-accent',
};

const highlightShadow: Record<string, string> = {
    'neon-blue': 'shadow-[0_0_20px_var(--color-neon-blue)]',
    'neon-pink': 'shadow-[0_0_20px_var(--color-neon-pink)]',
    'neon-green': 'shadow-[0_0_20px_var(--color-neon-green)]',
    'resistance-accent': 'shadow-[0_0_20px_var(--color-resistance-accent)]',
};

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const focusTrapRef = useFocusTrap(isOpen); // Hook for accessibility

    const handleNext = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Always persist on close — tutorial should only show once
    const handleClose = () => {
        localStorage.setItem('pts_tutorial_complete', 'true');
        setCurrentStep(0);
        onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'Escape') handleClose();
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentStep]);

    const step = tutorialSteps[currentStep];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tutorial-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={handleClose}
                    />

                    {/* Modal Container */}
                    <motion.div
                        ref={focusTrapRef as React.RefObject<HTMLDivElement>}
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="relative w-full max-w-lg bg-resistance-dark border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden"
                        tabIndex={-1}
                    >
                        {/* Glowing top border */}
                        <div className={`absolute top-0 inset-x-0 h-1 ${highlightBg[step.highlight]} ${highlightShadow[step.highlight]}`} />

                        {/* Header */}
                        <div className="p-6 pb-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl" aria-hidden="true">{step.icon}</span>
                                    <div>
                                        <p className="text-[8px] font-mono text-white/50 tracking-[0.3em] uppercase">
                                            TUTORIAL_SEQUENCE
                                        </p>
                                        <p className="text-[10px] font-mono text-neon-blue">
                                            [ {currentStep + 1} / {tutorialSteps.length} ]
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-11 h-11 flex items-center justify-center border border-white/10 hover:border-neon-pink text-white/40 hover:text-neon-pink transition-all text-base rounded-sm"
                                    title="Close tutorial"
                                    aria-label="Close tutorial"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 min-h-[200px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h2
                                        id="tutorial-title"
                                        className={`text-2xl md:text-3xl font-black tracking-tight mb-4 ${highlightText[step.highlight]}`}
                                    >
                                        {step.title.replace(/_/g, ' ')}
                                    </h2>
                                    <p className="text-white/70 text-sm md:text-base leading-relaxed font-cyber">
                                        {step.content}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Progress Dots */}
                        <div className="flex justify-center gap-2 pb-4">
                            {tutorialSteps.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentStep(i)}
                                    title={`Go to step ${i + 1}`}
                                    aria-label={`Go to step ${i + 1}`}
                                    aria-current={i === currentStep ? 'step' : undefined}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentStep
                                        ? 'bg-neon-blue scale-125 shadow-[0_0_10px_#00f3ff]'
                                        : i < currentStep
                                            ? 'bg-neon-green/50'
                                            : 'bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0 flex flex-col gap-4">
                            {/* Navigation Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className="flex-1 py-3 border border-white/10 text-white/40 font-black text-xs uppercase tracking-widest hover:border-white/30 hover:text-white/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    aria-label="Previous step"
                                >
                                    ← PREV
                                </button>
                                <button
                                    onClick={handleNext}
                                    className={`flex-1 py-3 font-black text-xs uppercase tracking-widest transition-all ${currentStep === tutorialSteps.length - 1
                                        ? 'bg-neon-green text-black hover:shadow-[0_0_20px_rgba(0,255,159,0.5)]'
                                        : 'bg-neon-blue/10 border border-neon-blue text-neon-blue hover:bg-neon-blue/20'
                                        }`}
                                    aria-label={currentStep === tutorialSteps.length - 1 ? 'Begin Mission' : 'Next step'}
                                >
                                    {currentStep === tutorialSteps.length - 1 ? 'BEGIN_MISSION →' : 'NEXT →'}
                                </button>
                            </div>

                            {/* Tutorial is auto-dismissed permanently on close */}
                            <p className="text-center text-[9px] text-white/40 font-mono uppercase tracking-widest">
                                This briefing will not appear again after you close it.
                            </p>
                        </div>

                        {/* Corner Decorations */}
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-neon-blue/20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-neon-blue/20 pointer-events-none" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

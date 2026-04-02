"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
    target: string; // CSS selector or element ID
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    highlight: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        target: '#wallet-connect-area',
        title: 'CONNECT_YOUR_WALLET',
        description: 'First, connect your Solana wallet (Phantom, Backpack, etc.) to establish your neural uplink.',
        position: 'bottom',
        highlight: 'neon-blue',
    },
    {
        target: '#roster',
        title: 'BROWSE_THE_ROSTER',
        description: 'Scroll down to see all available streamer defense cards. Each has unique moves, types, and stats.',
        position: 'top',
        highlight: 'neon-pink',
    },
    {
        target: '#roster',
        title: 'MINT_A_CARD',
        description: 'Click MINT on any card to secure it in your wallet. This unlocks missions, PvP battles, and the sector map.',
        position: 'top',
        highlight: 'neon-green',
    },
    {
        target: 'nav',
        title: 'EXPLORE_OPERATIONS',
        description: 'Use the nav bar to access Rankings, Barracks (your collection), Archives (lore), and Faction selection.',
        position: 'bottom',
        highlight: 'neon-blue',
    },
];

const HIGHLIGHT_COLORS: Record<string, string> = {
    'neon-blue': 'border-cyan-400 shadow-[0_0_30px_rgba(0,243,255,0.4)]',
    'neon-pink': 'border-pink-400 shadow-[0_0_30px_rgba(255,0,255,0.4)]',
    'neon-green': 'border-green-400 shadow-[0_0_30px_rgba(0,255,159,0.4)]',
};

const TEXT_COLORS: Record<string, string> = {
    'neon-blue': 'text-cyan-400',
    'neon-pink': 'text-pink-400',
    'neon-green': 'text-green-400',
};

export const OnboardingOverlay: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Only show once — check localStorage. Also listen for the tutorial being completed
    // during this session (storage event fires when another call sets the key).
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const tryActivate = () => {
            if (timer) return; // already scheduled
            const hasCompleted = localStorage.getItem('pts_onboarding_complete');
            const hasTutorial = localStorage.getItem('pts_tutorial_complete');
            if (hasTutorial && !hasCompleted) {
                timer = setTimeout(() => setIsActive(true), 1500);
            }
        };

        tryActivate(); // Check on mount (handles second-visit case)

        // Handle tutorial completion during this session. localStorage.setItem does NOT
        // fire the 'storage' event on the same tab, so we use a custom event dispatched
        // by the tutorial close handler instead.
        const handleTutorialDone = () => tryActivate();
        window.addEventListener('pts:tutorial_complete', handleTutorialDone);

        return () => {
            window.removeEventListener('pts:tutorial_complete', handleTutorialDone);
            if (timer) clearTimeout(timer);
        };
    }, []);

    const updateTargetRect = useCallback(() => {
        if (!isActive) return;
        const step = ONBOARDING_STEPS[currentStep];
        const el = document.querySelector(step.target);
        if (el) {
            setTargetRect(el.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [currentStep, isActive]);

    useEffect(() => {
        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect);
        return () => {
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect);
        };
    }, [updateTargetRect]);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pts_onboarding_complete', 'true');
        setIsActive(false);
    };

    useEffect(() => {
        if (!isActive) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleDismiss();
            if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, currentStep]);

    if (!isActive) return null;

    const step = ONBOARDING_STEPS[currentStep];

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const padding = 16;
        const maxWidth = Math.min(360, window.innerWidth - 32);
        switch (step.position) {
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - maxWidth - 16)),
                };
            case 'top':
                return {
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - maxWidth - 16)),
                };
            case 'right':
                return {
                    top: targetRect.top,
                    left: Math.min(targetRect.right + padding, window.innerWidth - maxWidth - 16),
                };
            case 'left':
                return {
                    top: targetRect.top,
                    right: Math.max(16, window.innerWidth - targetRect.left + padding),
                };
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[400] pointer-events-none"
            >
                {/* Dimmed overlay with cutout */}
                <div className="absolute inset-0 bg-black/70 pointer-events-auto" onClick={handleDismiss} role="presentation" />

                {/* Spotlight on target */}
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`absolute z-[401] border-2 rounded-lg pointer-events-none ${HIGHLIGHT_COLORS[step.highlight]}`}
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-lg bg-white/5"
                        />
                    </motion.div>
                )}

                {/* Tooltip card */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-[402] w-[calc(100vw-2rem)] max-w-[360px] bg-[#0a0a12] border border-white/10 rounded-lg p-5 pointer-events-auto"
                    style={getTooltipStyle()}
                >
                    {/* Step indicator */}
                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-[9px] font-mono tracking-widest uppercase ${TEXT_COLORS[step.highlight]}`}>
                            ONBOARDING [{currentStep + 1}/{ONBOARDING_STEPS.length}]
                        </span>
                        <button
                            onClick={handleDismiss}
                            className="text-white/50 hover:text-white text-xs transition-colors"
                            aria-label="Skip onboarding"
                        >
                            SKIP
                        </button>
                    </div>

                    <h3 className={`text-sm font-black tracking-wider mb-2 ${TEXT_COLORS[step.highlight]}`}>
                        {step.title.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-white/60 text-xs leading-relaxed font-mono mb-4">
                        {step.description}
                    </p>

                    {/* Navigation */}
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1 py-2 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-widest hover:border-white/30 transition-all"
                            >
                                PREV
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`flex-1 py-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                                currentStep === ONBOARDING_STEPS.length - 1
                                    ? 'bg-green-500 text-black hover:bg-green-400'
                                    : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                            }`}
                        >
                            {currentStep === ONBOARDING_STEPS.length - 1 ? 'START PLAYING' : 'NEXT'}
                        </button>
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-1.5 mt-3">
                        {ONBOARDING_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    i === currentStep ? 'bg-cyan-400 scale-125' : i < currentStep ? 'bg-green-500/50' : 'bg-white/20'
                                }`}
                            />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

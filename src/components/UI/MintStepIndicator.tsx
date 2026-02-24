"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface MintStepIndicatorProps {
    status: string | null;
}

const STEPS = [
    {
        key: 'request',
        label: 'Requesting',
        sublabel: 'FRAMEWORK',
        match: (s: string) => s.includes('Constructing') || s.includes('Establishing'),
    },
    {
        key: 'sign',
        label: 'Signing',
        sublabel: 'WALLET',
        match: (s: string) => s.includes('Signature') || s.includes('Corporate Protocols'),
    },
    {
        key: 'broadcast',
        label: 'Broadcasting',
        sublabel: 'SOLANA L1',
        match: (s: string) => s.includes('Broadcasting') || s.includes('Confirming'),
    },
    {
        key: 'confirm',
        label: 'Confirmed',
        sublabel: 'SECURED',
        match: (s: string) => s.includes('Secured') || s.includes('Successful'),
    },
];

function getActiveStep(status: string | null): number {
    if (!status) return 0;
    for (let i = STEPS.length - 1; i >= 0; i--) {
        if (STEPS[i].match(status)) return i;
    }
    return 0;
}

export const MintStepIndicator: React.FC<MintStepIndicatorProps> = ({ status }) => {
    const activeStep = getActiveStep(status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md px-4"
        >
            {/* Step track */}
            <div className="flex items-center gap-0 w-full mb-2">
                {STEPS.map((step, i) => {
                    const isDone = i < activeStep;
                    const isActive = i === activeStep;
                    const _isFuture = i > activeStep;
                    return (
                        <React.Fragment key={step.key}>
                            {/* Circle */}
                            <div className="flex flex-col items-center min-w-0">
                                <div
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all duration-500 ${isDone
                                        ? 'bg-neon-green border-neon-green text-black shadow-[0_0_10px_rgba(0,255,159,0.6)]'
                                        : isActive
                                            ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-[0_0_12px_rgba(0,243,255,0.5)] animate-pulse'
                                            : 'bg-transparent border-white/15 text-white/20'
                                        }`}
                                >
                                    {isDone ? '✓' : (i + 1)}
                                </div>
                            </div>
                            {/* Connector line */}
                            {i < STEPS.length - 1 && (
                                <div className="flex-1 h-0.5 mx-1 transition-all duration-700 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/10 rounded-full" />
                                    {isDone && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.4 }}
                                            className="absolute inset-0 bg-neon-green rounded-full shadow-[0_0_6px_rgba(0,255,159,0.5)]"
                                        />
                                    )}
                                    {isActive && (
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-blue to-transparent"
                                        />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step labels */}
            <div className="flex justify-between w-full mb-3">
                {STEPS.map((step, i) => {
                    const isDone = i < activeStep;
                    const isActive = i === activeStep;
                    return (
                        <div key={step.key} className="flex flex-col items-center w-1/4">
                            <span className={`text-[7px] font-black uppercase tracking-widest transition-colors ${isDone ? 'text-neon-green' : isActive ? 'text-neon-blue' : 'text-white/20'
                                }`}>
                                {step.label}
                            </span>
                            <span className={`text-[6px] font-mono transition-colors ${isDone ? 'text-neon-green/50' : isActive ? 'text-neon-blue/50' : 'text-white/10'
                                }`}>
                                {step.sublabel}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Current status message */}
            {status && (
                <p className="text-center text-[9px] font-mono text-white/40 tracking-wider truncate">
                    {status}
                </p>
            )}
        </motion.div>
    );
};

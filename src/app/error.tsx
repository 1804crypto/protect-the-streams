"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

async function reportError(error: Error, digest?: string) {
    try {
        await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'ERROR',
                component: 'NextErrorBoundary',
                message: error.message || 'Unknown client error',
                metadata: {
                    digest,
                    stack: error.stack?.slice(0, 1000),
                    url: typeof window !== 'undefined' ? window.location.href : null,
                },
            }),
        });
    } catch {
        // Silently fail — don't throw during error handling
    }
}

export default function ErrorPage({ error, reset }: ErrorProps) {
    useEffect(() => {
        reportError(error, error.digest);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full border border-resistance-accent/40 bg-black/60 backdrop-blur-xl p-8 text-center"
            >
                {/* Glitch header */}
                <div className="mb-6">
                    <div className="w-12 h-12 mx-auto mb-4 border-2 border-resistance-accent flex items-center justify-center">
                        <span className="text-2xl text-resistance-accent font-black">!</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-resistance-accent uppercase mb-1">
                        SIGNAL_CORRUPTED
                    </h1>
                    <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                        UPLINK_FAILURE // RESISTANCE_NETWORK
                    </p>
                </div>

                <p className="text-white/60 text-sm font-mono mb-2">
                    An unexpected error disrupted the resistance signal.
                </p>
                <p className="text-white/30 text-[10px] font-mono mb-6 break-all">
                    {error.digest ? `[INCIDENT_ID: ${error.digest}]` : '[INCIDENT LOGGED]'}
                </p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 border border-neon-blue text-neon-blue text-[11px] font-black tracking-widest uppercase hover:bg-neon-blue/10 transition-all"
                    >
                        RETRY_UPLINK
                    </button>
                    <button
                        onClick={() => { window.location.href = '/'; }}
                        className="px-6 py-3 border border-white/20 text-white/60 text-[11px] font-black tracking-widest uppercase hover:bg-white/5 transition-all"
                    >
                        RETURN_TO_BASE
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CONFIG } from '@/data/config';

interface HeroSectionProps {
    loading: boolean;
    status: string | null;
    error: { code: string; message: string } | null;
    signature: string | null;
    playHover: () => void;
    playClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    loading,
    status,
    error,
    signature,
    playHover,
    playClick,
}) => {
    return (
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
                        disabled={loading}
                        className={`btn-resistance text-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Scroll to mint section"
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
                        <span className="text-[10px] animate-bounce" aria-hidden="true">↓</span>
                    </motion.a>
                </div>

                {/* Minting Status Feedback */}
                <div className="h-24 flex items-center justify-center" role="status" aria-live="polite">
                    {(status || signature) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card p-4 border-neon-green/30 bg-neon-green/5 flex flex-col items-center gap-2"
                        >
                            <p className="text-neon-green font-mono text-xs tracking-widest flex items-center gap-3">
                                <span className="w-2 h-2 bg-neon-green rounded-full animate-ping" aria-hidden="true" />
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
                            role="alert"
                        >
                            <p className="text-resistance-accent font-mono text-[10px] mb-1 font-bold">[{error.code}]</p>
                            <p className="text-white/80 text-[11px] tracking-wider font-cyber">{error.message}</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </section>
    );
};

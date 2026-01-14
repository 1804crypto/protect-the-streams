"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const ResistanceOverlay: React.FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

            {/* Grain/Noise Static */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Scanline Animation is already in globals.css, but we can add a high-freq flicker */}
            <motion.div
                animate={{ opacity: [0.01, 0.03, 0.01] }}
                transition={{ duration: 0.1, repeat: Infinity }}
                className="absolute inset-0 bg-white"
            />

            {/* Corner Bracket HUD Elements */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-neon-blue/20" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-neon-blue/20" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-neon-blue/20" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-neon-blue/20" />

            {/* Tactical Metadata Footer */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-8 items-center opacity-20">
                <div className="flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-pulse" />
                    <span className="text-[7px] font-black tracking-[0.5em] text-neon-blue uppercase">Connection_Secure</span>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" />
                    <span className="text-[7px] font-black tracking-[0.5em] text-neon-green uppercase">Node_Sync_Stable</span>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 bg-resistance-accent rounded-full animate-pulse" />
                    <span className="text-[7px] font-black tracking-[0.5em] text-resistance-accent uppercase">Broadcast_Encrypted</span>
                </div>
            </div>

            {/* Dynamic System Load Bar */}
            <div className="absolute top-0 left-0 w-full h-0.5 overflow-hidden">
                <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-1/3 h-full bg-neon-blue/20 shadow-[0_0_10px_#00f3ff]"
                />
            </div>
        </div>
    );
};

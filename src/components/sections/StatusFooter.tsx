"use client";

import React from 'react';
import { CONFIG } from '@/data/config';

export const StatusFooter: React.FC = () => {
    return (
        <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-md border-t border-white/10 p-3 md:p-4 flex justify-between items-center px-4 md:px-12 text-[9px] md:text-[10px] font-mono text-white/40 uppercase tracking-widest safe-padding-bottom" role="contentinfo">
            <div className="hidden sm:block">© 2025 THE_RESISTANCE</div>
            <div className="flex gap-4 md:gap-8">
                <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" aria-hidden="true" />
                    {CONFIG.NETWORK.toUpperCase().replace('-', '_')}
                </span>
                <span className="text-resistance-accent hidden sm:inline">THREAT_LEVEL: OMEGA</span>
            </div>
        </footer>
    );
};

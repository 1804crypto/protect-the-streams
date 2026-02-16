"use client";

import React from 'react';
import { ResistanceMap } from '@/components/UI/ResistanceMap';
import { Streamer } from '@/data/streamers';

interface MapSectionProps {
    hasAccess: boolean;
    streamers: Streamer[];
    onMissionSelect: (streamer: Streamer) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({ hasAccess, streamers, onMissionSelect }) => {
    return (
        <section className="relative z-10 px-6 md:px-12 mb-20" aria-label="Strategic sector map">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-[10px] font-black tracking-[0.4em] text-neon-blue uppercase mb-2">// GLOBAL_RESISTANCE_PROGRESS</h3>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Strategic Sector Map</h2>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-[8px] text-white/30 font-mono uppercase tracking-widest">Signal Coverage</p>
                        <p className="text-sm font-black text-neon-green">STABLE</p>
                    </div>
                </div>

                {hasAccess ? (
                    <ResistanceMap onSectorClick={(s) => {
                        const fullStreamer = streamers.find(st => st.id === s.id);
                        if (fullStreamer) onMissionSelect(fullStreamer);
                    }} />
                ) : (
                    <div className="w-full h-[400px] border border-red-500/30 bg-red-500/5 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 relative overflow-hidden group" role="status">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)]" aria-hidden="true" />
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black text-red-500 mb-4 tracking-tighter flex items-center justify-center gap-4">
                                <span className="text-2xl" aria-hidden="true">🔒</span> SIGNAL LOCKED
                            </h3>
                            <p className="text-red-400 font-mono text-sm max-w-lg mx-auto tracking-widest leading-relaxed">
                                SIGNAL LOCKED: MINT TO UNLOCK TERMINAL.
                            </p>
                            <div className="mt-8 animate-pulse">
                                <a href="#roster" className="text-neon-blue underline font-bold text-xs tracking-[0.2em]">[PROCEED_TO_UPLINK_TERMINAL]</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

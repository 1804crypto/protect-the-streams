"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { StreamerCard } from '@/components/Cards/StreamerCard';
import { usePriceData } from '@/hooks/usePriceData';

interface RosterSectionProps {
    streamers: Streamer[];
    hasAccess: boolean;
    ownedStreamerIds: string[];
    loading: boolean;
    mintingStreamerId: string | null;
    mint: (id: string) => void;
    playHover: () => void;
    playClick: () => void;
    onPvP: (streamer: Streamer) => void;
    onMission: (streamer: Streamer) => void;
}

export const RosterSection: React.FC<RosterSectionProps> = ({
    streamers,
    hasAccess,
    ownedStreamerIds,
    loading,
    mintingStreamerId,
    mint,
    playHover,
    playClick,
    onPvP,
    onMission,
}) => {
    const { prices, loading: priceLoading } = usePriceData();

    return (
        <section id="roster" className="relative z-10 px-6 md:px-12 pb-40" aria-label="Resistance roster">
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 border-b border-white/10 pb-6 gap-4"
            >
                <div>
                    <h2 className="text-4xl font-black neon-text-blue tracking-tighter">Active Resistance Roster</h2>
                    <p className="text-white/40 font-mono text-[10px] mt-2 uppercase tracking-[0.3em]">
                        // {streamers.length}_SIGNATURES_DETECTED_IN_SECTOR_07
                    </p>
                </div>
                <div className="flex gap-10">
                    <div className="text-right">
                        <p className="text-[8px] text-white/30 font-mono uppercase">Encryption Status</p>
                        <p className="text-xs font-bold text-neon-green">UNBREAKABLE</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-white/30 font-mono uppercase">Threat Mitigation</p>
                        <p className="text-xs font-bold text-resistance-accent">ACTIVE</p>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 justify-items-center">
                {streamers.map((streamer, idx) => {
                    const isOwned = ownedStreamerIds.includes(streamer.id);
                    const isMintingThis = loading && mintingStreamerId === streamer.id;
                    return (
                        <motion.div
                            key={streamer.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative group transition-all duration-300 ${isOwned ? 'ring-2 ring-neon-green/60 shadow-[0_0_20px_rgba(0,255,159,0.25)] rounded-sm' : ''
                                }`}
                        >
                            {/* SECURED ownership badge */}
                            {isOwned && (
                                <div className="absolute top-2 left-2 z-30 flex items-center gap-1 bg-neon-green/20 border border-neon-green/50 px-2 py-0.5 rounded-sm">
                                    <span className="text-neon-green text-[9px] font-black tracking-widest uppercase">✓ SECURED</span>
                                </div>
                            )}
                            <StreamerCard
                                streamer={streamer}
                                onHover={playHover}
                            />
                            <div className="absolute inset-x-0 bottom-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 mobile-action-visible transition-opacity z-20 flex justify-center gap-2 flex-wrap px-2">
                                {isOwned ? (
                                    /* Owned: show ENTER TERMINAL + SECTOR_7_ARENA */
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playClick(); onMission(streamer); }}
                                            className="px-3 py-2 min-h-[44px] text-xs font-black uppercase rounded-sm bg-neon-green text-black hover:bg-white transition-all"
                                            aria-label={`Enter mission terminal with ${streamer.name}`}
                                        >
                                            [ TERMINAL ]
                                        </button>
                                        {hasAccess && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); playClick(); onPvP(streamer); }}
                                                className="px-3 py-2 min-h-[44px] text-xs font-black uppercase rounded-sm bg-neon-pink text-white hover:bg-white hover:text-neon-pink transition-all"
                                                aria-label={`Start Sector 7 Arena battle with ${streamer.name}`}
                                            >
                                                PvP
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    /* Not owned: show MINT button */
                                    <button
                                        onClick={(e) => { e.stopPropagation(); playClick(); mint(streamer.id); }}
                                        disabled={isMintingThis}
                                        className={`px-4 py-2 min-h-[44px] text-xs font-black uppercase rounded-sm ${isMintingThis
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : 'bg-neon-blue text-black hover:bg-white'
                                            }`}
                                        aria-label={`Mint ${streamer.name} NFT card`}
                                    >
                                        {isMintingThis ? 'MINTING...' : (priceLoading || !prices ? 'LOADING...' : `MINT (${prices.mintPriceSol} SOL ≈ $${prices.mintPriceUsd})`)}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};

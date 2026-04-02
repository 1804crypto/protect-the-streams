"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { Streamer } from '@/data/streamers';
import { StreamerCard } from '@/components/Cards/StreamerCard';
import { usePriceData } from '@/hooks/usePriceData';

interface RosterSectionProps {
    streamers: Streamer[];
    hasAccess: boolean;
    ownedStreamerIds: string[];
    loading: boolean;
    mintingStreamerId: string | null;
    mint: (_id: string) => void;
    playHover: () => void;
    playClick: () => void;
    onPvP: (_streamer: Streamer) => void;
    onMission: (_streamer: Streamer) => void;
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
    const { connected, select, wallets } = useWallet();
    const { prices, loading: priceLoading } = usePriceData();
    const [previewStreamer, setPreviewStreamer] = useState<Streamer | null>(null);

    const TYPE_COLORS: Record<string, string> = {
        Chaos: 'text-red-400 border-red-400/30 bg-red-400/10',
        Influence: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
        Rebellion: 'text-green-400 border-green-400/30 bg-green-400/10',
        Charisma: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    };

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
                        {`// ${streamers.length}_SIGNATURES_DETECTED_IN_SECTOR_07`}
                    </p>
                </div>
                <div className="flex gap-10">
                    <div className="text-right">
                        <p className="text-[8px] text-white/50 font-mono uppercase">Encryption Status</p>
                        <p className="text-xs font-bold text-neon-green">UNBREAKABLE</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-white/50 font-mono uppercase">Threat Mitigation</p>
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
                                {/* INTEL button — always visible, lets users preview moves before minting */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); playClick(); setPreviewStreamer(streamer); }}
                                    className="px-3 py-2 min-h-[44px] text-xs font-black uppercase rounded-sm bg-white/10 border border-white/20 text-white hover:bg-neon-blue/20 hover:border-neon-blue transition-all"
                                    aria-label={`View ${streamer.name} abilities and moves`}
                                >
                                    INTEL
                                </button>
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
                                    /* Not owned: show MINT or CONNECT WALLET button */
                                    connected ? (
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
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playClick();
                                                if (wallets.length > 0) select(wallets[0].adapter.name);
                                            }}
                                            className="px-4 py-2 min-h-[44px] text-xs font-black uppercase rounded-sm bg-neon-orange text-black hover:bg-white animate-pulse"
                                            aria-label="Connect wallet to mint"
                                        >
                                            CONNECT WALLET TO MINT
                                        </button>
                                    )
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Streamer Preview Modal — shows moves, ultimate, and trait before minting */}
            <AnimatePresence>
                {previewStreamer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[250] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setPreviewStreamer(null)} role="presentation" />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-[#0a0a12] border border-white/10 rounded-lg overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${previewStreamer.name} intel briefing`}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-neon-blue/5 to-transparent">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[8px] font-mono text-neon-blue tracking-[0.3em] uppercase">INTEL_BRIEFING</p>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{previewStreamer.name}</h3>
                                        <p className="text-[10px] text-neon-blue/60 font-bold tracking-widest uppercase">{previewStreamer.archetype}</p>
                                    </div>
                                    <button
                                        onClick={() => setPreviewStreamer(null)}
                                        className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-neon-pink text-white/40 hover:text-neon-pink transition-all rounded-sm"
                                        aria-label="Close preview"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Trait */}
                            <div className="px-5 pt-4 pb-2">
                                <div className="text-[9px] font-mono text-neon-green tracking-widest uppercase mb-1">PASSIVE_TRAIT</div>
                                <p className="text-xs text-white/70 font-mono italic">{previewStreamer.trait}</p>
                            </div>

                            {/* Moves */}
                            <div className="px-5 py-3">
                                <div className="text-[9px] font-mono text-neon-blue tracking-widest uppercase mb-2">COMBAT_MOVES</div>
                                <div className="space-y-2">
                                    {previewStreamer.moves.map(move => (
                                        <div key={move.name} className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/5 rounded">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-wide truncate">{move.name}</span>
                                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${TYPE_COLORS[move.type] || 'text-white/50 border-white/10 bg-white/5'}`}>
                                                        {move.type}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-white/40 font-mono mt-0.5 truncate">{move.description}</p>
                                            </div>
                                            <div className="flex gap-3 ml-3 shrink-0">
                                                <div className="text-center">
                                                    <div className="text-[7px] text-white/30 font-mono">PWR</div>
                                                    <div className="text-[11px] font-black text-neon-pink">{move.power}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[7px] text-white/30 font-mono">PP</div>
                                                    <div className="text-[11px] font-black text-white/60">{move.pp}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ultimate */}
                            <div className="px-5 py-3 border-t border-white/5">
                                <div className="text-[9px] font-mono text-neon-pink tracking-widest uppercase mb-2">ULTIMATE_MOVE</div>
                                <div className="p-3 bg-neon-pink/5 border border-neon-pink/20 rounded">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[12px] font-black text-neon-pink uppercase">{previewStreamer.ultimateMove.name}</span>
                                            <span className={`ml-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${TYPE_COLORS[previewStreamer.ultimateMove.type] || 'text-white/50 border-white/10 bg-white/5'}`}>
                                                {previewStreamer.ultimateMove.type}
                                            </span>
                                        </div>
                                        <span className="text-[12px] font-black text-neon-pink">PWR {previewStreamer.ultimateMove.power}</span>
                                    </div>
                                    <p className="text-[9px] text-white/50 font-mono mt-1">{previewStreamer.ultimateMove.description}</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-white/5">
                                <p className="text-[8px] text-white/30 font-mono text-center uppercase tracking-widest">
                                    Charges +20% per attack. 100% = Ultimate unlocked.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

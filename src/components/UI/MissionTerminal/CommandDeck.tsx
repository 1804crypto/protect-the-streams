"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Streamer, Move } from '@/data/streamers';

interface CommandDeckProps {
    streamer: Streamer;
    movePP: Record<string, number>;
    isTurn: boolean;
    isComplete: boolean;
    onMoveClick: (move: Move) => void;
    charge: number;
    onUltimateClick: () => void;
    onToggleInventory: () => void;
    showItems: boolean;
}

export const CommandDeck: React.FC<CommandDeckProps> = ({
    streamer,
    movePP,
    isTurn,
    isComplete,
    onMoveClick,
    charge,
    onUltimateClick,
    onToggleInventory,
    showItems
}) => {
    return (
        <div className="space-y-6">
            {/* Moves Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {streamer.moves.map((move) => {
                    const currentPP = movePP[move.name] ?? move.pp;
                    const isOutOfPP = currentPP <= 0;
                    const ppPercent = (currentPP / move.pp) * 100;

                    return (
                        <button
                            key={move.name}
                            disabled={!isTurn || isComplete || isOutOfPP}
                            onClick={() => onMoveClick(move)}
                            className={`relative h-20 bg-white/[0.02] border group transition-all rounded-md overflow-hidden flex flex-col justify-center px-4 ${isTurn && !isComplete && !isOutOfPP
                                ? 'border-white/10 hover:border-neon-blue hover:bg-neon-blue/5 cursor-pointer'
                                : 'border-white/5 opacity-40 cursor-not-allowed'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[12px] font-black uppercase tracking-widest group-hover:text-neon-blue">{move.name}</span>
                                <span className="text-[8px] font-mono text-white/40">{move.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full transition-all ${ppPercent > 50 ? 'bg-neon-green' : 'bg-resistance-accent'}`}
                                        animate={{ width: `${ppPercent}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-mono text-white/60">PP_{currentPP}/{move.pp}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Items & Ultimate Panel */}
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-black text-neon-pink tracking-[0.3em] uppercase underline underline-offset-4">Quantum_Sync_Drive</span>
                        <span className="text-[10px] font-mono text-neon-pink">{charge}%</span>
                    </div>
                    <div className="h-2 bg-black/80 border border-white/5 overflow-hidden rounded-full">
                        <motion.div
                            animate={{ width: `${charge}%` }}
                            className="h-full bg-neon-pink shadow-[0_0_20px_#ff00ff]"
                        />
                    </div>
                    <button
                        disabled={charge < 100 || !isTurn || isComplete}
                        onClick={onUltimateClick}
                        className={`w-full py-5 rounded-md font-black uppercase text-[12px] tracking-[0.5em] transition-all relative overflow-hidden ${charge === 100 ? 'bg-neon-pink text-white shadow-[0_0_40px_rgba(255,0,255,0.4)] hover:scale-[1.02] animate-pulse-neon' : 'bg-white/5 text-white/20 border border-white/5'
                            }`}
                    >
                        {charge === 100 ? `ULTIMATE_ACCESS: ${streamer.ultimateMove.name}` : 'LOCKING_SIGNAL...'}
                        {charge === 100 && (
                            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        )}
                    </button>
                </div>

                <button
                    onClick={onToggleInventory}
                    disabled={isComplete}
                    className={`w-full py-4 border font-black uppercase text-[10px] tracking-widest transition-all rounded-md ${showItems ? 'bg-neon-yellow/10 border-neon-yellow text-neon-yellow shadow-[0_0_20px_rgba(243,255,0,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                >
                    {showItems ? '[ CLOSE_DECK ]' : '[ ACCESS_DEPLOYABLES ]'}
                </button>
            </div>
        </div>
    );
};

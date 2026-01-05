"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { usePvPMatchmaking } from '@/hooks/usePvPMatchmaking';
import { usePvPBattle } from '@/hooks/usePvPBattle';
import { useAudioSystem } from '@/hooks/useAudioSystem';

interface PvPTerminalProps {
    streamer: Streamer;
    matchId: string; // This is now ignored/overridden by matchmaking, or used as a "lobby" ID
    isOpen: boolean;
    onClose: () => void;
}

export const PvPTerminal: React.FC<PvPTerminalProps> = ({ streamer, matchId, isOpen, onClose }) => {
    // 1. Matchmaking
    const { status: matchStatus, roomId: matchedRoomId, opponentId } = usePvPMatchmaking(streamer.id, isOpen);

    // 2. Battle Hook (Only active when match found)
    const {
        player,
        opponent,
        logs,
        isTurn,
        isComplete,
        battleStatus,
        winnerId,
        executeMove
    } = usePvPBattle(matchedRoomId || 'waiting', opponentId, streamer);

    const { playClick, playMoveSound, playDamage, playUltimate, playScanning } = useAudioSystem();
    const [isAttacking, setIsAttacking] = useState(false);

    useEffect(() => {
        let stopScanning: (() => void) | undefined;
        if (matchStatus === 'SEARCHING') {
            stopScanning = playScanning();
        }
        return () => {
            if (stopScanning) stopScanning();
        };
    }, [matchStatus, playScanning]);

    useEffect(() => {
        if (battleStatus === 'ACTIVE') {
            // play some battle start sound if exists
        }
    }, [battleStatus]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[310] w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all rounded-full"
                >
                    ✕
                </button>

                {/* MATCHMAKING STATE */}
                {matchStatus === 'SEARCHING' && (
                    <div className="flex flex-col items-center justify-center space-y-8">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-neon-blue/30 rounded-full animate-ping absolute inset-0" />
                            <div className="w-32 h-32 border-4 border-t-neon-blue rounded-full animate-spin flex items-center justify-center">
                                <span className="text-4xl">📡</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">SCANNING_FREQUENCIES...</h2>
                            <p className="text-neon-blue font-mono text-[10px] tracking-[0.3em] animate-pulse">LOOKING_FOR_HOSTILE_SIGNAL</p>
                        </div>
                    </div>
                )}

                {/* BATTLE STATE */}
                {matchStatus === 'MATCH_FOUND' && (
                    <div className="w-full max-w-[1240px] h-[800px] flex flex-col lg:flex-row gap-4">
                        {/* Viewport */}
                        <motion.div
                            animate={isAttacking ? { x: [0, 100, 0], y: [0, -20, 0] } : {}}
                            className="flex-[1.5] bg-black border-2 border-neon-blue/20 rounded-lg relative overflow-hidden flex flex-col"
                        >
                            {/* Status Bar */}
                            <div className="absolute top-0 inset-x-0 p-4 flex justify-between z-50">
                                <div className="hud-node min-w-[200px]">
                                    <p className="text-[10px] font-black text-neon-pink uppercase tracking-widest mb-1">{opponent?.name || 'SEARCHING_PEER...'}</p>
                                    <div className="h-2 bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${opponent ? (opponent.hp / opponent.maxHp) * 100 : 0}%` }}
                                            className="h-full bg-resistance-accent shadow-[0_0_15px_#ff003c]"
                                        />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 text-[10px] font-black border ${isTurn ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                        {isTurn ? 'YOUR_TURN' : 'WAITING_FOR_PEER'}
                                    </span>
                                </div>
                            </div>

                            {/* Arena */}
                            <div className="flex-1 flex items-center justify-center relative">
                                {/* Opponent */}
                                <AnimatePresence>
                                    {opponent && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute top-20 right-20 w-64 h-64 grayscale contrast-125"
                                        >
                                            <div className="w-full h-full border-4 border-resistance-accent/30 rounded-full flex items-center justify-center bg-resistance-accent/5">
                                                <span className="text-4xl font-black text-resistance-accent/20 tracking-tighter italic">HOSTILE_SIGNAL</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Player */}
                                <motion.div
                                    className="absolute bottom-10 left-10 w-80 h-80 z-20"
                                    animate={isTurn ? { y: [0, -10, 0] } : {}}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                >
                                    <img
                                        src={streamer.image}
                                        className="w-full h-full object-cover rounded-3xl border-4 border-neon-blue shadow-[0_0_40px_rgba(0,243,255,0.3)]"
                                        alt="Player"
                                    />
                                </motion.div>
                            </div>

                            {/* Player HP */}
                            <div className="absolute bottom-6 right-6 hud-node min-w-[250px] z-50">
                                <div className="flex justify-between mb-1">
                                    <span className="text-[12px] font-black text-neon-blue uppercase">{player.name}</span>
                                    <span className="text-[10px] font-mono text-white/60">{player.hp} HP</span>
                                </div>
                                <div className="h-3 bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                                    <motion.div
                                        animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                                        className="h-full bg-neon-blue shadow-[0_0_20px_#00f3ff]"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Controls */}
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-6 flex flex-col">
                            <div className="flex-1 bg-black/60 border border-white/5 p-4 font-mono text-[10px] mb-6 overflow-y-auto">
                                {logs.map((log, i) => (
                                    <div key={i} className={`mb-1 ${i === 0 ? 'text-neon-blue' : 'text-white/30'}`}>
                                        {`> ${log}`}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {streamer.moves.map(move => (
                                    <button
                                        key={move.name}
                                        disabled={!isTurn || isComplete || !opponent}
                                        onClick={() => {
                                            playClick();
                                            playMoveSound(move.type);
                                            setIsAttacking(true);
                                            setTimeout(() => setIsAttacking(false), 300);
                                            executeMove(move);
                                        }}
                                        className={`p-4 border text-[11px] font-black uppercase tracking-widest transition-all rounded-md ${isTurn && !isComplete && opponent
                                            ? 'border-white/20 hover:border-neon-blue hover:bg-neon-blue/5'
                                            : 'border-white/5 opacity-20'
                                            }`}
                                    >
                                        {move.name}
                                    </button>
                                ))}
                            </div>

                            {isComplete && (
                                <div className="mt-6 p-6 border-2 border-neon-yellow bg-neon-yellow/10 text-center animate-pulse rounded-md">
                                    <h4 className="text-neon-yellow font-black text-xl mb-2 italic">COMBAT_TERMINATED</h4>
                                    <p className="text-white font-bold uppercase tracking-widest">{winnerId === player.name ? 'VICTORY_SECURED' : 'CONNECTION_LOST'}</p>
                                    <button
                                        onClick={onClose}
                                        className="mt-4 px-6 py-2 bg-neon-yellow text-black font-black text-[10px] tracking-[0.3em] hover:bg-white transition-all"
                                    >
                                        CLOSE_DATA_STREAM
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

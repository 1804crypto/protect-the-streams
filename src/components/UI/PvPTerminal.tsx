"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { usePvPMatchmaking } from '@/hooks/usePvPMatchmaking';
import { usePvPBattle } from '@/hooks/usePvPBattle';
import { useAudioSystem } from '@/hooks/useAudioSystem';
// useNeuralMusic removed as it was unused here

interface PvPTerminalProps {
    streamer: Streamer;
    matchId: string; // This is now ignored/overridden by matchmaking, or used as a "lobby" ID
    isOpen: boolean;
    onClose: () => void;
}

export const PvPTerminal: React.FC<PvPTerminalProps> = ({ streamer, matchId: _matchId, isOpen, onClose }) => {
    // 1. Matchmaking
    const { status: matchStatus, roomId: matchedRoomId, opponentId, playerId } = usePvPMatchmaking(streamer.id, isOpen);

    // 2. Battle Hook (Only active when match found)
    const {
        player,
        opponent,
        logs,
        chatLogs,
        isTurn,
        isComplete,
        battleStatus: _battleStatus,
        winnerId,
        executeMove,
        sendChat,
        lastAction
    } = usePvPBattle(matchedRoomId || 'waiting', opponentId, streamer, playerId);

    const { playClick, playMoveSound, playDamage, playUltimate: _playUltimate, playScanning } = useAudioSystem();
    const [isAttacking, setIsAttacking] = useState(false);
    const [isOpponentAttacking, setIsOpponentAttacking] = useState(false);
    const [damageNumber, setDamageNumber] = useState<{ value: number, id: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'LOGS' | 'COMM'>('LOGS');
    const [chatInput, setChatInput] = useState('');

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendChat(chatInput);
            setChatInput('');
        }
    };

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
        if (!lastAction) return;

        // If the action happened very recently (within 500ms), play effects
        const now = Date.now();
        if (now - lastAction.timestamp < 1000) {
            // Play Sound based on type
            if (lastAction.damage > 0) {
                playDamage(); // Impact sound
            }
            if (lastAction.moveType) {
                playMoveSound(lastAction.moveType);
            }

            // Trigger Opponent Animation
            if (lastAction.senderId !== playerId) {
                setTimeout(() => {
                    setIsOpponentAttacking(true);
                    setTimeout(() => setIsOpponentAttacking(false), 300);
                }, 0);

                // Show Damage on Player
                setTimeout(() => {
                    setDamageNumber({ value: lastAction.damage, id: now });
                    setTimeout(() => setDamageNumber(null), 1500);
                }, 0);
            }
        }
    }, [lastAction, playDamage, playMoveSound, playerId]);

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
                                <div>GEO_SYNC: ACTIVE</div>
                                <div>SIGNAL_DENSITY: 99%</div>
                                <div className="text-neon-blue">ENCRYPTION: LEVEL_99</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">SCANNING_FREQUENCIES...</h2>
                            <p className="text-neon-blue font-mono text-[10px] tracking-[0.3em] animate-pulse">LOOKING_FOR_HOSTILE_SIGNAL</p>
                        </div>
                    </div>
                )}

                {/* TIMEOUT STATE */}
                {matchStatus === 'TIMEOUT' && (
                    <div className="flex flex-col items-center justify-center space-y-8 text-center p-8 bg-black border-2 border-resistance-accent/50 rounded-lg max-w-md">
                        <div className="text-6xl mb-4">📴</div>
                        <div>
                            <h2 className="text-2xl font-black italic text-resistance-accent uppercase tracking-tighter mb-2">SIGNAL_DISSIPATED</h2>
                            <p className="text-white/60 font-mono text-[10px] tracking-widest leading-relaxed">
                                UNABLE_TO_LOCATE_HOSTILE_SIGNAL_IN_CURRENT_SECTOR. <br />
                                CORPORATE_JAMMING_INTENSE.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-resistance-accent text-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all rounded-sm"
                        >
                            RETURN_TO_BASE
                        </button>
                    </div>
                )}

                {/* BATTLE STATE */}
                {matchStatus === 'MATCH_FOUND' && (
                    <div className="w-full max-w-[1240px] h-[800px] flex flex-col lg:flex-row gap-4">
                        {/* Viewport */}
                        <motion.div
                            animate={
                                isAttacking ? { x: [0, 50, -50, 0], scale: 1.02 } :
                                    isOpponentAttacking ? { x: [0, -10, 10, -10, 0], borderColor: ['#ff003c', '#00f3ff'] } :
                                        {}
                            }
                            className={`flex-[1.5] bg-black border-2 transition-colors duration-300 rounded-lg relative overflow-hidden flex flex-col ${isOpponentAttacking ? 'border-resistance-accent' : 'border-neon-blue/20'}`}
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
                                            animate={isOpponentAttacking ? { scale: [1, 1.2, 1], y: [0, 20, 0] } : { opacity: 1, scale: 1 }}
                                            className="absolute top-20 right-20 w-64 h-64 grayscale contrast-125 z-10"
                                        >
                                            {opponent.image ? (
                                                <img
                                                    src={opponent.image}
                                                    className="w-full h-full object-cover rounded-full border-4 border-resistance-accent shadow-[0_0_30px_#ff003c]"
                                                    alt="Opponent"
                                                />
                                            ) : (
                                                <div className="w-full h-full border-4 border-resistance-accent/30 rounded-full flex items-center justify-center bg-resistance-accent/5">
                                                    <span className="text-4xl font-black text-resistance-accent/20 tracking-tighter italic">HOSTILE_SIGNAL</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Player */}
                                <motion.div
                                    className="absolute bottom-10 left-10 w-80 h-80 z-20"
                                    animate={
                                        isAttacking ? { x: [0, 100, 0], scale: 1.1 } :
                                            isTurn ? { y: [0, -10, 0] } : {}
                                    }
                                    transition={isAttacking ? { duration: 0.3 } : { repeat: Infinity, duration: 4 }}
                                >
                                    <img
                                        src={streamer.image}
                                        className="w-full h-full object-cover rounded-3xl border-4 border-neon-blue shadow-[0_0_40px_rgba(0,243,255,0.3)]"
                                        alt="Player"
                                    />

                                    {/* Received Damage Floating Text */}
                                    <AnimatePresence>
                                        {damageNumber && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, y: -100, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 text-6xl font-black text-resistance-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] z-50 italic"
                                            >
                                                -{damageNumber.value}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                                        className={`h-full shadow-[0_0_20px_#00f3ff] transition-colors ${player.hp < 30 ? 'bg-resistance-accent animate-pulse' : 'bg-neon-blue'}`}
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Controls & Chat */}
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-6 flex flex-col min-w-[300px]">
                            {/* Tab Switcher */}
                            <div className="flex space-x-2 mb-4">
                                <button
                                    onClick={() => setActiveTab('LOGS')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOGS' ? 'bg-neon-blue text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                                >
                                    COMBAT_LOG
                                </button>
                                <button
                                    onClick={() => setActiveTab('COMM')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'COMM' ? 'bg-resistance-accent text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}
                                >
                                    ENCRYPTED_FEED
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 bg-black/60 border border-white/5 p-4 font-mono text-[10px] mb-6 overflow-y-auto min-h-[200px] relative">
                                {activeTab === 'LOGS' ? (
                                    logs.map((log, i) => (
                                        <div key={i} className={`mb-1 ${i === 0 ? 'text-neon-blue' : 'text-white/30'}`}>
                                            {`> ${log}`}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col h-full">
                                        <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                                            {chatLogs.length === 0 && <div className="text-white/20 italic text-center mt-10">NO_TRANSMISSIONS</div>}
                                            {chatLogs.map((msg, i) => (
                                                <div key={i} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                                    <span className={`px-2 py-1 rounded max-w-[80%] break-words ${msg.sender === 'me' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-resistance-accent/20 text-resistance-accent'}`}>
                                                        {msg.message}
                                                    </span>
                                                    <span className="text-[8px] text-white/20 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleSendChat} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="TRANSMIT_DATA..."
                                                className="flex-1 bg-black border border-white/20 px-3 py-1 text-white focus:border-neon-blue outline-none"
                                            />
                                            <button type="submit" className="bg-white/10 px-3 hover:bg-neon-blue hover:text-black transition-colors">Submit</button>
                                        </form>
                                    </div>
                                )}
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

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { usePvPMatchmaking } from '@/hooks/usePvPMatchmaking';
import { usePvPBattle } from '@/hooks/usePvPBattle';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useNeuralNarrative } from '@/hooks/useNeuralNarrative';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { InventoryOverlay } from '@/components/UI/MissionTerminal/InventoryOverlay';

interface PvPTerminalProps {
    streamer: Streamer;
    matchId: string; // This is now ignored/overridden by matchmaking, or used as a "lobby" ID
    isOpen: boolean;
    onClose: () => void;
}

export const PvPTerminal: React.FC<PvPTerminalProps> = ({ streamer, matchId: _matchId, isOpen, onClose }) => {
    const [wagerDraft, setWagerDraft] = useState<number>(0);
    const [isSearching, setIsSearching] = useState(false);
    const { getBattleCommentary } = useNeuralNarrative();
    const [neuralNarrative, setNeuralNarrative] = useState<string>("Scanning for viable combatants...");

    // Inventory State
    const [showInventory, setShowInventory] = useState(false);
    const inventory = useCollectionStore(state => state.inventory);

    // 1. Matchmaking (Only enabled when user clicks 'Engage')
    const { status: matchStatus, roomId: matchedRoomId, opponentId, opponentWager, playerId, retry: retryMatchmaking } = usePvPMatchmaking(streamer.id, isOpen && isSearching, wagerDraft);

    // 2. Battle Hook
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
        executeUseItem,
        sendChat,
        lastAction,
        isSpectator,
        glrChange,
        wagerAmount
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

    const handleUseItem = (itemId: string, _itemConfig: { effect: string; value: number }) => {
        playClick();
        const success = executeUseItem(itemId);
        if (success) {
            setShowInventory(false);
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

        // If the action happened very recently (within 1000ms), play effects
        const now = Date.now();
        if (now - (lastAction.timestamp ?? 0) < 1000) {
            // Play Sound based on type
            if ((lastAction.damage ?? 0) > 0) {
                playDamage(); // Impact sound
            }
            if (lastAction.moveType) {
                playMoveSound(lastAction.moveType);
            }

            // Trigger animations
            if (lastAction.senderId !== playerId) {
                // If I'm watching or defender, opponent attacked
                setTimeout(() => {
                    setIsOpponentAttacking(true);
                    setTimeout(() => setIsOpponentAttacking(false), 300);
                }, 0);

                // Show Damage
                const dmg = lastAction.damage ?? 0;
                setTimeout(() => {
                    setDamageNumber({ value: dmg, id: now });
                    setTimeout(() => setDamageNumber(null), 1500);
                }, 0);

                // AI Commentary
                if (dmg > 0 && opponent) {
                    getBattleCommentary({
                        playerName: player.name,
                        enemyName: opponent.name,
                        actionName: lastAction.senderId === playerId ? 'Attack' : 'Retaliation',
                        damage: dmg,
                        playerHp: player.hp,
                        playerMaxHp: player.maxHp,
                        enemyHp: opponent.hp,
                        enemyMaxHp: opponent.maxHp,
                        isCrit: dmg > 20,
                        isSuperEffective: false
                    }).then(setNeuralNarrative);
                }
            }
        }
    }, [lastAction, playDamage, playMoveSound, playerId, player, opponent, getBattleCommentary]);

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
                    className="absolute top-6 right-6 z-[330] w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all rounded-full"
                >
                    ✕
                </button>

                {/* 0. PRE-MATCHMAKING: WAGER SELECTION */}
                {!isSearching && matchStatus === 'IDLE' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-lg bg-black/80 border-2 border-neon-blue/20 p-10 rounded-lg text-center backdrop-blur-3xl"
                    >
                        <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter mb-6 flex items-center justify-center gap-4">
                            <span className="text-neon-blue">⚔</span>
                            ENGAGEMENT_PARAMS
                        </h2>

                        <div className="mb-8 space-y-4">
                            <label className="text-[10px] font-mono text-white/40 uppercase tracking-[0.5em] block">Select_Stakes ($PTS)</label>
                            <div className="flex items-center justify-center gap-4">
                                {[0, 100, 500, 1000].map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setWagerDraft(amount)}
                                        className={`px-4 py-2 border-2 font-black transition-all ${wagerDraft === amount ? 'bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.4)]' : 'border-white/10 text-white/40 hover:border-white/20'}`}
                                    >
                                        {amount === 0 ? 'FREE' : `${amount}`}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[8px] text-neon-blue/60 font-mono mt-4 italic uppercase">Higher stakes match with higher-rank operatives.</p>
                        </div>

                        <button
                            onClick={() => setIsSearching(true)}
                            className="w-full py-5 bg-neon-blue text-black font-black uppercase tracking-[0.3em] hover:bg-white transition-all rounded-sm shadow-[0_0_40px_rgba(0,243,255,0.2)]"
                        >
                            INITIATE_UPLINK
                        </button>
                    </motion.div>
                )}

                {/* 1. MATCHMAKING STATE */}
                {isSearching && matchStatus === 'SEARCHING' && (
                    <div className="flex flex-col items-center justify-center space-y-8">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-neon-blue/30 rounded-full animate-ping absolute inset-0" />
                            <div className="w-40 h-40 border-[1px] border-t-neon-blue border-white/5 rounded-full animate-spin flex flex-col items-center justify-center text-[8px] font-mono text-white/40">
                                <span className="text-4xl mb-2">📡</span>
                                <div>STAKES: {wagerDraft} $PTS</div>
                                <div className="text-neon-blue">ENCRYPT_LEVEL: MAX</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2 animate-glitch">SCANNING_FREQUENCIES...</h2>
                            <p className="text-neon-blue font-mono text-[10px] tracking-[0.3em] animate-pulse">LOCATING_RIVAL_OPERATIVE</p>
                            <button onClick={() => setIsSearching(false)} className="mt-8 text-[8px] text-white/20 hover:text-white uppercase tracking-widest border-b border-white/10">Abort_Uplink</button>
                        </div>
                    </div>
                )}

                {/* 2. TIMEOUT STATE */}
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

                {/* 2b. ERROR STATE */}
                {matchStatus === 'ERROR' && (
                    <div className="flex flex-col items-center justify-center space-y-8 text-center p-8 bg-black border-2 border-resistance-accent/50 rounded-lg max-w-md">
                        <div className="text-6xl mb-4">⚠</div>
                        <div>
                            <h2 className="text-2xl font-black italic text-resistance-accent uppercase tracking-tighter mb-2">UPLINK_FAILURE</h2>
                            <p className="text-white/60 font-mono text-[10px] tracking-widest leading-relaxed">
                                MATCH_INITIALIZATION_REJECTED. <br />
                                CHECK_BALANCE_OR_RETRY.
                            </p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => { setIsSearching(false); retryMatchmaking(); }}
                                className="flex-1 py-4 bg-neon-blue text-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all rounded-sm"
                            >
                                RETRY_UPLINK
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm"
                            >
                                ABORT
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. BATTLE STATE */}
                {matchStatus === 'MATCH_FOUND' && (
                    <div className="w-full max-w-[1240px] h-[calc(100vh-2rem)] h-[calc(100dvh-2rem)] lg:h-[800px] flex flex-col lg:flex-row gap-4 relative">
                        {isSpectator && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neon-yellow text-black px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-b-lg animate-pulse z-[400]">
                                👁 SPECTATOR_MODE: ENCRYPTION_TAP_ACTIVE
                            </div>
                        )}

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
                            <div className="absolute top-0 inset-x-0 p-4 flex justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
                                <div className="hud-node min-w-0 w-full max-w-[200px]">
                                    <p className="text-[10px] font-black text-neon-pink uppercase tracking-widest mb-1">{opponent?.name || 'SEARCHING_PEER...'}</p>
                                    <div className="h-2 bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${opponent ? (opponent.hp / opponent.maxHp) * 100 : 0}%` }}
                                            className="h-full bg-resistance-accent shadow-[0_0_15px_#ff003c]"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    <span className={`px-2 py-1 text-[10px] font-black border ${isTurn ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                        {isTurn ? 'YOUR_TURN' : 'WAITING_FOR_PEER'}
                                    </span>
                                    {wagerAmount > 0 && <span className="text-[8px] font-mono text-neon-blue animate-pulse">TOTAL_STAKES: {wagerAmount * 2} $PTS</span>}
                                </div>
                            </div>

                            {/* Neural Narrator - PvP Overlay */}
                            <div className="absolute top-20 left-4 right-4 z-[45] p-2 bg-black/40 backdrop-blur-sm border-l-2 border-neon-blue rounded flex flex-col gap-0.5 pointer-events-none">
                                <span className="text-[7px] text-neon-blue font-bold tracking-[0.3em] uppercase opacity-70">// Neural_Narrator_PvP</span>
                                <p className="text-[10px] text-white/90 italic font-mono leading-tight">
                                    {neuralNarrative}
                                </p>
                            </div>

                            {/* Arena */}
                            <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.05)_0%,transparent_70%)]">
                                {/* Opponent */}
                                <AnimatePresence>
                                    {opponent && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={isOpponentAttacking ? { scale: [1, 1.2, 1], y: [0, 20, 0] } : { opacity: 1, scale: 1 }}
                                            className="absolute top-8 right-8 w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 contrast-125 z-10"
                                        >
                                            {opponent.image ? (
                                                <img
                                                    src={opponent.image}
                                                    className="w-full h-full object-cover rounded-full border-4 border-resistance-accent shadow-[0_0_30px_#ff003c] grayscale hover:grayscale-0 transition-all"
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
                                    className="absolute bottom-4 left-4 w-40 h-40 md:w-60 md:h-60 lg:w-80 lg:h-80 z-20"
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
                                                className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl md:text-6xl font-black text-resistance-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] z-50 italic"
                                            >
                                                -{damageNumber.value}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </div>

                            {/* Player HP */}
                            <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 hud-node min-w-0 w-full max-w-[250px] z-50">
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

                            {/* Inventory Overlay */}
                            <AnimatePresence>
                                {showInventory && (
                                    <InventoryOverlay
                                        inventory={inventory}
                                        isTurn={isTurn}
                                        isComplete={isComplete}
                                        onUseItem={handleUseItem}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Controls & Chat */}
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 md:p-6 flex flex-col min-w-0 lg:min-w-[300px]">
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
                                                disabled={isSpectator}
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder={isSpectator ? "CANNOT_TRANSMIT_IN_WATCH_MODE" : "TRANSMIT_DATA..."}
                                                className="flex-1 bg-black border border-white/20 px-3 py-1 text-white focus:border-neon-blue outline-none disabled:opacity-50"
                                            />
                                            <button type="submit" disabled={isSpectator} className="bg-white/10 px-3 hover:bg-neon-blue hover:text-black transition-colors disabled:hidden">Submit</button>
                                        </form>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {streamer.moves.map(move => (
                                    <button
                                        key={move.name}
                                        disabled={isSpectator || !isTurn || isComplete || !opponent}
                                        onClick={() => {
                                            playClick();
                                            playMoveSound(move.type);
                                            setIsAttacking(true);
                                            setTimeout(() => setIsAttacking(false), 300);
                                            executeMove(move);
                                        }}
                                        className={`p-4 border text-[11px] font-black uppercase tracking-widest transition-all rounded-md ${!isSpectator && isTurn && !isComplete && opponent
                                            ? 'border-white/20 hover:border-neon-blue hover:bg-neon-blue/5'
                                            : 'border-white/5 opacity-20'
                                            }`}
                                    >
                                        {move.name}
                                    </button>
                                ))}
                            </div>

                            {/* Inventory Button */}
                            <button
                                onClick={() => {
                                    playClick();
                                    setShowInventory(!showInventory);
                                }}
                                disabled={isSpectator || !isTurn || isComplete || !opponent}
                                className={`mt-3 w-full p-3 border text-[11px] font-black uppercase tracking-widest transition-all rounded-md ${showInventory ? 'bg-neon-yellow text-black border-neon-yellow' : 'border-white/10 text-white/40 hover:text-neon-yellow hover:border-neon-yellow'}`}
                            >
                                {showInventory ? 'CLOSE_INVENTORY' : 'ACCESS_INVENTORY'}
                            </button>

                            {isComplete && (
                                <div className="mt-6 p-6 border-2 border-neon-yellow bg-neon-yellow/10 text-center animate-pulse rounded-md">
                                    <h4 className="text-neon-yellow font-black text-xl mb-2 italic">COMBAT_TERMINATED</h4>
                                    <p className="text-white font-bold uppercase tracking-widest mb-2">{winnerId === (isSpectator ? player.id : playerId) ? 'VICTORY_SECURED' : 'DATA_PURGED'}</p>
                                    {glrChange !== null && <p className="text-neon-green text-[10px] font-mono tracking-widest uppercase mt-4">GLR_DELTA: +{glrChange} POINTS</p>}
                                    <button
                                        onClick={onClose}
                                        className="mt-6 px-6 py-2 bg-neon-yellow text-black font-black text-[10px] tracking-[0.3em] hover:bg-white transition-all w-full"
                                    >
                                        CLOSE_UPLINK
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

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer, natures } from '@/data/streamers';
import { useResistanceMission } from '@/hooks/useResistanceMission';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { items } from '@/data/items';

interface MissionTerminalProps {
    streamer: Streamer;
    isOpen: boolean;
    onClose: () => void;
}

const ParticleEffect = ({ x, y, color }: { x: number, y: number, color: string }) => {
    return (
        <motion.div
            initial={{ x, y, opacity: 1, scale: 1 }}
            animate={{
                x: x + (Math.random() - 0.5) * 150,
                y: y + (Math.random() - 0.5) * 150,
                opacity: 0,
                scale: 0,
                rotate: Math.random() * 360
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`absolute left-0 top-0 w-1.5 h-1.5 ${color} z-30 pointer-events-none rounded-full blur-[1px]`}
        />
    );
};

const FloatingVFX = ({ type, onComplete }: { type: 'heal' | 'boost_atk' | 'boost_def', onComplete: () => void }) => {
    const colors = {
        heal: 'text-neon-green shadow-green-500/50',
        boost_atk: 'text-neon-pink shadow-pink-500/50',
        boost_def: 'text-neon-blue shadow-blue-500/50'
    };
    const icons = { heal: '✙', boost_atk: '⚔', boost_def: '🛡' };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 0.8],
                y: -150,
                rotate: [0, -10, 10, 0]
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            onAnimationComplete={onComplete}
            className={`absolute z-[100] text-4xl font-black drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] ${colors[type]}`}
        >
            {icons[type]}
            <motion.div
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-current"
            />
        </motion.div>
    );
};

const DamageNumber = ({ amount, target, onComplete }: { amount: number, target: 'player' | 'enemy', onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -100, scale: 2 }}
            transition={{ duration: 0.8 }}
            onAnimationComplete={onComplete}
            className={`absolute z-[110] font-black text-3xl italic pointer-events-none drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${target === 'enemy' ? 'text-white' : 'text-resistance-accent'}`}
            style={{
                left: target === 'enemy' ? '50%' : '20%',
                top: target === 'enemy' ? '40%' : '70%'
            }}
        >
            -{amount}
        </motion.div>
    );
};

const LoreOverlay = ({ text, onComplete }: { text: string, onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="h-1 bg-neon-blue mb-8 shadow-[0_0_15px_#00f3ff]"
            />
            <div className="space-y-6 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-neon-blue font-mono text-[10px] tracking-[0.3em] uppercase mb-2"
                >
                    Incoming_Neural_Archive_Signal...
                </motion.div>
                <motion.h4
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white font-black text-2xl lg:text-4xl italic tracking-tighter leading-tight uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    "{text}"
                </motion.h4>
            </div>
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                onClick={onComplete}
                className="mt-12 px-8 py-3 border border-neon-blue text-neon-blue font-black tracking-widest text-xs hover:bg-neon-blue hover:text-black transition-all uppercase"
            >
                Continue_Uplink
            </motion.button>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.5 }}
                className="h-1 bg-neon-blue mt-8 shadow-[0_0_15px_#00f3ff]"
            />
        </motion.div>
    );
};

export const MissionTerminal: React.FC<MissionTerminalProps> = ({ streamer, isOpen, onClose }) => {
    const {
        player,
        enemy,
        logs,
        isTurn,
        isComplete,
        result,
        executeMove,
        executeUltimate,
        useBattleItem,
        stage,
        isShaking,
        glitchIntensity,
        triggerGlitch,
        charge,
        turns,
        movePP,
        effectivenessFlash,
        attackBoost,
        defenseBoost,
        streamerNature,
        rank,
        isTakingDamage,
        isEnemyTakingDamage,
        currentBossPhase,
        showPhaseBanner,
        lastDamageAmount,
        lastDamageDealer
    } = useResistanceMission(streamer);
    const { playVoiceLine, playClick, playItemUse, playMoveSound, playDamage, playUltimate, forceUnmute } = useAudioSystem();
    const { getMissionRecord, inventory } = useCollectionStore();
    const missionRecord = getMissionRecord(streamer.id);
    const [showItems, setShowItems] = useState(false);
    const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
    const [isAttacking, setIsAttacking] = useState(false);

    const isBoss = stage >= 3;
    const [resultStep, setResultStep] = useState(0);
    const [currentLore, setCurrentLore] = useState<string | null>(null);
    const [loreQueue, setLoreQueue] = useState<string[]>([]);
    const [earnedXP, setEarnedXP] = useState(0);
    const [lootedItems, setLootedItems] = useState<string[]>([]);
    const [critText, setCritText] = useState<string | null>(null);
    const [itemEffects, setItemEffects] = useState<{ id: number, type: 'heal' | 'boost_atk' | 'boost_def' }[]>([]);
    const [damagePopups, setDamagePopups] = useState<{ id: number, amount: number, target: 'player' | 'enemy' }[]>([]);
    const [impactFlash, setImpactFlash] = useState(false);

    // Trigger Initial Lore on mount
    useEffect(() => {
        if (isOpen && streamer.lore?.statusLog) {
            setCurrentLore(streamer.lore.statusLog);
        }
    }, [isOpen, streamer.lore]);

    // Handle Stage Progression Lore
    useEffect(() => {
        if (stage === 2 && streamer.lore?.battle1) {
            setLoreQueue(prev => [...prev, streamer.lore!.battle1]);
        } else if (stage === 3 && streamer.lore?.battle2) {
            setLoreQueue(prev => [...prev, streamer.lore!.battle2]);
        }
    }, [stage, streamer.lore]);

    // Show Lore from queue if none active
    useEffect(() => {
        if (!currentLore && loreQueue.length > 0) {
            const next = loreQueue[0];
            setLoreQueue(prev => prev.slice(1));
            setCurrentLore(next);
        }
    }, [currentLore, loreQueue]);

    useEffect(() => {
        if (lastDamageAmount) {
            setDamagePopups(prev => [...prev, {
                id: Date.now() + Math.random(),
                amount: lastDamageAmount,
                target: lastDamageDealer!
            }]);

            if (lastDamageAmount > 50) {
                setImpactFlash(true);
                setTimeout(() => setImpactFlash(false), 50);
            }
            playDamage();
        }
    }, [lastDamageAmount, lastDamageDealer, playDamage]);

    // Get mission record to show XP/Level progress
    const record = getMissionRecord(streamer.id);
    const currentXP = record?.xp || 0;
    const currentLevel = record?.level || 1;

    // XP thresholds
    const getXPThreshold = (lvl: number) => {
        if (lvl >= 5) return 1000;
        if (lvl >= 4) return 1000;
        if (lvl >= 3) return 500;
        if (lvl >= 2) return 250;
        return 100;
    };

    const nextXPThreshold = getXPThreshold(currentLevel);
    const xpProgress = (currentXP / nextXPThreshold) * 100;

    useEffect(() => {
        if (result === 'SUCCESS' && resultStep === 0) {
            const baseXP = isBoss ? 150 : 50;
            const rankMult = rank === 'S' ? 1.5 : rank === 'A' ? 1.2 : 1;
            const totalXP = Math.floor(baseXP * rankMult);
            setEarnedXP(totalXP);

            const rewards = rank === 'S' ? ['stim_pack', 'neural_booster'] : rank === 'A' ? ['stim_pack'] : [];
            setLootedItems(rewards);

            // Trigger Climax Lore
            if (streamer.lore?.climax) {
                setLoreQueue(prev => [...prev, streamer.lore!.climax]);
            }

            const timer = setTimeout(() => setResultStep(1), 1000);
            return () => clearTimeout(timer);
        }
    }, [result, rank, isBoss, resultStep, streamer.lore]);

    useEffect(() => {
        if (isShaking && !isTurn) {
            spawnParticles(10, 200, 250, 'bg-resistance-accent');
        }
        if (logs[0]?.includes("CRITICAL")) {
            setCritText("CRITICAL_OVERLOAD");
            setTimeout(() => setCritText(null), 1000);
        }
    }, [isShaking, isTurn, logs]);

    const spawnParticles = (count: number, x: number, y: number, color: string) => {
        const newParticles = Array.from({ length: count }).map((_, i) => ({
            id: Date.now() + i,
            x,
            y,
            color
        }));
        setParticles(prev => [...prev, ...newParticles].slice(-50));
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        filter: glitchIntensity > 0 ? `hue-rotate(${glitchIntensity * 90}deg) brightness(${1 + glitchIntensity}) saturate(${1 + glitchIntensity})` : 'none'
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 overflow-hidden"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" />

                    {/* Dynamic Ambient Glow */}
                    <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 ${isBoss ? 'bg-resistance-accent/20' : 'bg-neon-blue/10'}`} />

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-[210] w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all rounded-full"
                        title="De-sync Uplink"
                    >
                        ✕
                    </button>

                    {/* Expansive Battle Console */}
                    <div className="ds-terminal relative flex flex-col lg:flex-row gap-4 lg:p-6 w-full max-w-[1240px] items-stretch h-full lg:h-[800px]">

                        {/* Top Screen / Battle Arena */}
                        <motion.div
                            animate={isShaking || isAttacking ? {
                                x: isShaking ? [-8, 8, -8, 8, -4, 4, 0] : [0, 100, 0],
                                y: isShaking ? [-4, 4, -4, 4, -2, 2, 0] : [0, -50, 0],
                                scale: isAttacking ? [1, 1.05, 1] : 1,
                                filter: isShaking ? ["contrast(1.4) brightness(1.1)", "contrast(1) brightness(1)"] : "none"
                            } : {}}
                            transition={{ duration: isAttacking ? 0.2 : 0.35 }}
                            className={`relative flex-[1.5] bg-[#020202] border-2 ${isBoss ? 'border-resistance-accent/40 shadow-[0_0_50px_rgba(255,0,60,0.2)]' : 'border-white/10'} overflow-hidden flex flex-col rounded-lg`}
                        >
                            {/* Arena Atmosphere */}
                            <div className="absolute inset-0 z-0 opacity-40">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.15),transparent_70%)]" />
                                <div className="absolute inset-0 bg-[url('/grid_pattern.png')] opacity-20" />
                                <div className="absolute inset-0 battle-floor opacity-30 mt-[20%]" />
                            </div>

                            {/* HUD: Enemy Plate */}
                            <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-start">
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{
                                        x: isEnemyTakingDamage ? [-5, 5, -5, 5, 0] : 0,
                                        opacity: 1
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="hud-node min-w-[240px]"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-[11px] font-black tracking-[0.2em] ${isBoss ? 'text-resistance-accent animate-glitch' : 'text-white/80'}`}>
                                            {isBoss ? `SYSTEM_THREAT: ${enemy.name.toUpperCase()}` : enemy.name.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] font-mono text-white/40">LVL.{(stage * 10) + 40}</span>
                                    </div>
                                    <div className="relative h-2 bg-white/5 border border-white/10 overflow-hidden">
                                        <motion.div
                                            animate={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                                            className={`h-full transition-all duration-500 ${isBoss || (enemy.hp / enemy.maxHp) < 0.3 ? 'bg-resistance-accent' : 'bg-neon-green'}`}
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] bg-[size:200%_100%] animate-scan" />
                                    </div>
                                    <div className="flex justify-end mt-1">
                                        <span className="text-[9px] font-mono text-white/40">{enemy.hp} / {enemy.maxHp} HP</span>
                                    </div>
                                </motion.div>

                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-neon-blue tracking-widest bg-neon-blue/10 px-2 py-0.5 rounded-sm border border-neon-blue/30">TURN {turns}</span>
                                        <span className="text-[9px] font-mono text-neon-blue/60 tracking-tighter uppercase mb-0.5">Uplink_Signal: STABLE</span>
                                    </div>
                                    <div className="flex gap-1 justify-end">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`w-1.5 h-3 ${i < 4 ? 'bg-neon-blue' : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Battle Arena Viewport */}
                            <div className="flex-1 relative flex items-center justify-center pt-24 pb-32 overflow-hidden">
                                {/* Enemy Sprite */}
                                <motion.div
                                    animate={!isTurn ? {
                                        x: [0, -20, 20, -15, 15, 0],
                                        scale: [1, 1.05, 0.98, 1.02, 1],
                                        filter: isEnemyTakingDamage ? ["brightness(4) contrast(2)", "brightness(1) contrast(1)"] : "none"
                                    } : {
                                        y: [0, -5, 0],
                                        filter: isEnemyTakingDamage ? "brightness(3) sepia(1) hue-rotate(-50deg)" : "none"
                                    }}
                                    transition={{ duration: !isTurn ? 0.4 : 3, repeat: isTurn ? Infinity : 0 }}
                                    className="relative z-20 w-[280px] h-[280px] lg:w-[400px] lg:h-[400px]"
                                >
                                    <img
                                        src="/authority_sentinel_cipher_unit_1766789046162.png"
                                        alt="Enemy Boss"
                                        className={`w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,0,60,0.5)] ${isBoss ? 'brightness-125' : ''}`}
                                    />
                                    {/* Reflection beneath */}
                                    <img
                                        src="/authority_sentinel_cipher_unit_1766789046162.png"
                                        alt="Reflection"
                                        className="absolute top-full left-0 w-full h-1/2 object-contain scale-y-[-0.4] opacity-10 blur-md grayscale -mt-8"
                                    />
                                </motion.div>

                                {/* Player Avatar - Positioned as 'Over the shoulder' feel */}
                                <div className="absolute -bottom-12 -left-12 lg:-bottom-20 lg:-left-20 z-30 transform rotate-[15deg] opacity-90">
                                    <motion.div
                                        animate={isTurn ? {
                                            rotate: [15, 13, 17, 15],
                                            scale: [1, 1.02, 0.98, 1],
                                            filter: isTakingDamage ? "brightness(3) sepia(1) hue-rotate(-50deg)" : "none"
                                        } : {
                                            filter: isTakingDamage ? ["brightness(4) contrast(2)", "brightness(1) contrast(1)"] : "none"
                                        }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                        className="relative w-[220px] h-[220px] lg:w-[450px] lg:h-[450px]"
                                    >
                                        <img
                                            src={streamer.image}
                                            alt="Player Avatar"
                                            className="w-full h-full object-cover rounded-[40px] border-8 border-neon-blue shadow-[0_0_60px_rgba(0,243,255,0.4)]"
                                        />
                                        <div className="absolute inset-0 rounded-[40px] border-4 border-white/20 mix-blend-overlay" />

                                        {/* Floating Item Effects */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <AnimatePresence>
                                                {itemEffects.map(effect => (
                                                    <FloatingVFX
                                                        key={effect.id}
                                                        type={effect.type}
                                                        onComplete={() => setItemEffects(prev => prev.filter(e => e.id !== effect.id))}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Particles & VFX Layer */}
                                <div className="absolute inset-0 z-40 pointer-events-none">
                                    {particles.map(p => (
                                        <ParticleEffect key={p.id} x={p.x} y={p.y} color={p.color} />
                                    ))}
                                    {effectivenessFlash && (
                                        <motion.div
                                            initial={{ opacity: 1 }}
                                            animate={{ opacity: 0 }}
                                            className={`absolute inset-0 z-50 ${effectivenessFlash === 'super' ? 'bg-neon-green/20' : 'bg-red-500/20'}`}
                                        />
                                    )}

                                    {/* Damage Numbers */}
                                    <AnimatePresence>
                                        {damagePopups.map(popup => (
                                            <DamageNumber
                                                key={popup.id}
                                                amount={popup.amount}
                                                target={popup.target}
                                                onComplete={() => setDamagePopups(prev => prev.filter(p => p.id !== popup.id))}
                                            />
                                        ))}
                                    </AnimatePresence>

                                    {/* Impact Flash */}
                                    <AnimatePresence>
                                        {impactFlash && (
                                            <motion.div
                                                initial={{ opacity: 0.8 }}
                                                animate={{ opacity: 0 }}
                                                className="absolute inset-0 z-[120] bg-white pointer-events-none"
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Boss Phase Notification */}
                                    <AnimatePresence>
                                        {showPhaseBanner && (
                                            <motion.div
                                                key={`phase-${currentBossPhase}`}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 1.2, opacity: 0 }}
                                                className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none"
                                            >
                                                <div className="bg-resistance-accent/90 px-12 py-4 skew-x-[-12deg] border-y-4 border-white shadow-[0_0_50px_#ff003c]">
                                                    <div className="text-white font-black text-2xl tracking-[0.5em] italic">PHASE_{currentBossPhase}_EVOLUTION</div>
                                                    <div className="text-[10px] text-white/70 font-mono tracking-widest text-center mt-1">THREAT_LEVEL_CRITICAL</div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* HUD: Player Plate */}
                            <div className="absolute bottom-6 right-6 z-40">
                                <motion.div
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{
                                        x: isTakingDamage ? [-5, 5, -5, 5, 0] : 0,
                                        opacity: 1
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="hud-node w-[300px]"
                                >
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-black tracking-widest text-neon-blue">{player.name}</span>
                                                {streamerNature && (
                                                    <span className="text-[7px] px-1.5 py-0.5 bg-neon-pink/20 border border-neon-pink/40 text-neon-pink font-bold">
                                                        {natures[streamerNature].displayName.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[8px] font-mono text-white/30 uppercase mt-0.5 tracking-[0.2em]">{streamer.archetype}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-mono text-white/40 block">INTEGRITY_SYNC</span>
                                            <span className="text-[14px] font-mono font-black text-white">{player.hp} / {player.maxHp}</span>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-black/60 border border-white/10 overflow-hidden rounded-sm relative">
                                        <motion.div
                                            animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                                            className="h-full bg-neon-blue shadow-[0_0_20px_#00f3ff]"
                                        />
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,transparent_50%)] bg-[size:100%_2px]" />
                                    </div>

                                    {/* Buff Indicators */}
                                    <div className="flex gap-2 mt-2">
                                        {attackBoost.turnsLeft > 0 && (
                                            <div className="px-2 py-0.5 bg-neon-pink/10 border border-neon-pink/30 text-[7px] text-neon-pink font-bold rounded-sm animate-pulse">
                                                ⚔️ OVERCLOCK_{Math.round((attackBoost.multiplier - 1) * 100)}%
                                            </div>
                                        )}
                                        {defenseBoost.turnsLeft > 0 && (
                                            <div className="px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/30 text-[7px] text-neon-blue font-bold rounded-sm animate-pulse">
                                                🛡️ SHIELD_NODE_ACTVE
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Right Section / Command Deck */}
                        <div className="relative flex-1 bg-[#050505] border-2 border-white/10 flex flex-col p-6 rounded-lg overflow-y-auto lg:overflow-visible">

                            {/* Terminal Logs */}
                            <div className="flex-1 bg-black/60 border border-white/5 p-4 mb-6 font-mono text-[10px] leading-relaxed shadow-inner overflow-y-auto lg:h-[200px] rounded-sm">
                                <div className="space-y-1">
                                    {logs.map((log, i) => (
                                        <motion.div
                                            key={log + i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1 - (i * 0.15), x: 0 }}
                                            className={`flex items-start gap-2 ${i === 0 ? 'text-neon-blue font-bold' : 'text-white/30'}`}
                                        >
                                            <span className="opacity-40">{`[${(Date.now() % 10000).toString().padStart(4, '0')}]`}</span>
                                            <span className="flex-1">{log}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Commands */}
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
                                                onClick={() => {
                                                    playClick();
                                                    playMoveSound(move.type);
                                                    if (move.power > 50) playVoiceLine(streamer.name);
                                                    setIsAttacking(true);
                                                    setTimeout(() => setIsAttacking(false), 300);
                                                    spawnParticles(20, 500, 200, 'bg-neon-blue');

                                                    // Critical hit visual check (logic handled in hook, but we react here)
                                                    if (Math.random() > 0.85) {
                                                        setCritText("CRITICAL_OVERLOAD");
                                                        setTimeout(() => setCritText(null), 1000);
                                                    }

                                                    executeMove(move);
                                                }}
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
                                            onClick={() => {
                                                playClick();
                                                playUltimate();
                                                triggerGlitch(2);
                                                setIsAttacking(true);
                                                setTimeout(() => setIsAttacking(false), 500);
                                                spawnParticles(80, 500, 200, 'bg-neon-pink');
                                                executeUltimate();
                                            }}
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
                                        onClick={() => { playClick(); setShowItems(!showItems); }}
                                        disabled={!isTurn || isComplete}
                                        className={`w-full py-4 border font-black uppercase text-[10px] tracking-widest transition-all rounded-md ${showItems ? 'bg-neon-yellow/10 border-neon-yellow text-neon-yellow shadow-[0_0_20px_rgba(243,255,0,0.2)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {showItems ? '[ CLOSE_DECK ]' : '[ ACCESS_DEPLOYABLES ]'}
                                    </button>
                                </div>
                            </div>

                            {/* Inventory Overlay */}
                            <AnimatePresence>
                                {showItems && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute inset-x-6 bottom-32 z-50 bg-[#080808] border-2 border-neon-yellow shadow-[0_0_50px_rgba(243,255,0,0.15)] p-4 rounded-lg"
                                    >
                                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                            {Object.entries(items).map(([itemId, item]) => {
                                                const count = inventory[itemId] || 0;
                                                return (
                                                    <button
                                                        key={itemId}
                                                        disabled={count <= 0 || !isTurn || isComplete}
                                                        onClick={() => {
                                                            const item = items[itemId];
                                                            if (item) {
                                                                const type = item.effect === 'heal' ? 'heal' :
                                                                    item.effect === 'boostAttack' ? 'boost_atk' : 'boost_def';
                                                                setItemEffects(prev => [...prev, { id: Date.now(), type: type as any }]);
                                                                playItemUse(item.effect === 'heal' ? 'heal' : 'boost');
                                                            }
                                                            useBattleItem(itemId);
                                                            setShowItems(false);
                                                        }}
                                                        className={`p-3 text-left transition-all border rounded ${count > 0 ? 'border-white/10 hover:border-neon-yellow bg-white/[0.02] hover:bg-neon-yellow/10' : 'opacity-20 grayscale border-white/5'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[11px] font-black">{item.icon} {item.name}</span>
                                                            <span className="text-[10px] font-mono text-neon-yellow">x{count}</span>
                                                        </div>
                                                        <p className="text-[8px] text-white/40 leading-tight uppercase font-mono">{item.description}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Result Terminal Overlay */}
                            <AnimatePresence>
                                {isComplete && (
                                    <motion.div
                                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                        animate={{ opacity: 1, backdropFilter: 'blur(25px)' }}
                                        className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-white/5"
                                    >
                                        {result === 'SUCCESS' ? (
                                            <div className="w-full max-w-md space-y-12">
                                                {/* Step 1: Rank */}
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -10 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    className="relative"
                                                >
                                                    <h3 className="text-neon-green text-sm font-black tracking-[0.8em] mb-4 uppercase">UPLINK_STABILIZED</h3>
                                                    <div className="text-[140px] font-black leading-none text-white drop-shadow-[0_0_60px_rgba(57,255,20,0.5)] italic select-none">
                                                        {rank}
                                                    </div>
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.5 }}
                                                        className="text-neon-green text-[12px] font-black tracking-[0.5em] mt-2 uppercase"
                                                    >
                                                        {rank === 'S' ? 'SYSTEM_MESSIAH' :
                                                            rank === 'A' ? 'CORE_BREACHER' :
                                                                rank === 'B' ? 'SIGNAL_RUNNER' : 'LINK_ESTABLISHED'}
                                                    </motion.div>
                                                    <div className="text-white/20 text-[8px] font-mono tracking-widest mt-1">PERFORMANCE_GRADE_VERIFIED</div>
                                                </motion.div>

                                                {/* Step 2: XP & Level (Appears after delay) */}
                                                <AnimatePresence>
                                                    {resultStep >= 1 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="space-y-4"
                                                        >
                                                            <div className="flex justify-between items-end px-2">
                                                                <div className="text-left">
                                                                    <div className="text-[10px] font-mono text-white/40 mb-1">DATA_SYNC_XP</div>
                                                                    <div className="text-2xl font-black text-white">+{earnedXP} <span className="text-[10px] text-neon-blue font-mono">NEURAL_XP</span></div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] font-mono text-white/40 mb-1">NODE_LEVEL</div>
                                                                    <div className="text-2xl font-black text-neon-blue">LVL.{currentLevel}</div>
                                                                </div>
                                                            </div>
                                                            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                                <motion.div
                                                                    initial={{ width: `${xpProgress}%` }}
                                                                    animate={{ width: `${Math.min(100, xpProgress + (earnedXP / nextXPThreshold * 100))}%` }}
                                                                    transition={{ duration: 2, ease: "circOut" }}
                                                                    className="h-full bg-neon-blue shadow-[0_0:15px_rgba(0,243,255,0.6)]"
                                                                />
                                                            </div>
                                                            <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                                                                <span>{currentXP} XP</span>
                                                                <span>{nextXPThreshold} XP</span>
                                                            </div>
                                                            {xpProgress + (earnedXP / nextXPThreshold * 100) >= 100 && (
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                    transition={{ repeat: Infinity }}
                                                                    className="text-neon-yellow text-[10px] font-black tracking-[0.3em] mt-2"
                                                                >
                                                                    !! LEVEL_UP_DETECTED !!
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Step 3: Loot */}
                                                <AnimatePresence>
                                                    {resultStep >= 1 && lootedItems.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="flex justify-center gap-4 mt-8"
                                                        >
                                                            {lootedItems.map((itemId, idx) => (
                                                                <div key={idx} className="flex flex-col items-center">
                                                                    <div className="w-12 h-12 bg-neon-yellow/10 border border-neon-yellow/30 flex items-center justify-center text-xl rounded-md shadow-[0_0_15px_rgba(243,255,0,0.2)]">
                                                                        {items[itemId]?.icon}
                                                                    </div>
                                                                    <div className="text-[8px] font-mono text-neon-yellow mt-2 uppercase tracking-tighter">{items[itemId]?.name}</div>
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <motion.button
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 1 }}
                                                    onClick={onClose}
                                                    className="w-full py-5 border-4 border-neon-green text-neon-green font-black tracking-[0.5em] hover:bg-neon-green hover:text-black transition-all group relative overflow-hidden mt-8"
                                                >
                                                    <span className="relative z-10">TERMINATE_UPLINK</span>
                                                    <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-sm space-y-8">
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{
                                                        opacity: 1,
                                                        filter: ["none", "hue-rotate(90deg) brightness(2)", "none"],
                                                    }}
                                                    transition={{ duration: 0.5, repeat: 2 }}
                                                >
                                                    <div className="text-resistance-accent text-[80px] font-black italic animate-pulse">LOST_SIGNAL</div>
                                                    <div className="text-resistance-accent text-[10px] font-black tracking-[0.4em] uppercase mt-2">UPLINK_TERMINATED_BY_CORPORATE</div>
                                                </motion.div>

                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.8 }}
                                                    className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4"
                                                >
                                                    <div className="text-white/60 text-[10px] font-mono uppercase tracking-widest">Consolation_Data_Fragments</div>
                                                    <div className="text-2xl font-black text-white">+10 <span className="text-[10px] text-resistance-accent font-mono">NEURAL_XP</span></div>
                                                    <p className="text-[10px] text-white/30 font-mono italic">Even in failure, the rebellion learns. Signal fragments analyzed.</p>
                                                </motion.div>

                                                <button
                                                    onClick={onClose}
                                                    className="w-full py-4 border border-resistance-accent text-resistance-accent font-black tracking-[0.3em] uppercase hover:bg-resistance-accent hover:text-white transition-all text-xs"
                                                >
                                                    RESYNC_ATTEMPT
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Critical Hit Overlay */}
                            <AnimatePresence>
                                {critText && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                                        animate={{ opacity: 1, scale: 1.5, y: -100 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] pointer-events-none"
                                    >
                                        <div className="text-neon-pink font-black text-4xl italic tracking-tighter drop-shadow-[0_0_20px_#ff00ff]">
                                            {critText}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    {/* Lore Overlay Layer */}
                    <AnimatePresence>
                        {currentLore && (
                            <LoreOverlay
                                text={currentLore}
                                onComplete={() => setCurrentLore(null)}
                            />
                        )}
                    </AnimatePresence>
                </motion.div >
            )}
        </AnimatePresence >
    );
};


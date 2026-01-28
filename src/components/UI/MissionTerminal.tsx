"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Streamer } from '@/data/streamers';
import { useResistanceMission } from '@/hooks/useResistanceMission';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useCollectionStore, getMissionRecord } from '@/hooks/useCollectionStore';
import { useOperatorStore } from '@/hooks/useOperatorStore';
import { useGameDataStore } from '@/hooks/useGameDataStore';
import { TerminalLogs } from './MissionTerminal/TerminalLogs';
import { InventoryOverlay } from './MissionTerminal/InventoryOverlay';
import { CommandDeck } from './MissionTerminal/CommandDeck';
import { BattleArena } from './MissionTerminal/BattleArena';
import { LoreOverlay } from './MissionTerminal/VFX';
import { ResultOverlay } from './MissionTerminal/ResultOverlay';
import { useNeuralMusic } from '@/hooks/useNeuralMusic';

interface MissionTerminalProps {
    streamer: Streamer;
    isOpen: boolean;
    onClose: () => void;
}

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
        executeUseItem,
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
        lastDamageDealer,
        addLog
    } = useResistanceMission(streamer);

    // Initialize Dynamic Neural Music
    useNeuralMusic(isOpen && !isComplete);

    const {
        playVoiceLine, playClick, playItemUse, playMoveSound,
        playDamage, playUltimate, forceUnmute, playTurnStart,
        playBossIntro, playExpGain, playMiss, playCritical
    } = useAudioSystem();

    const { items } = useGameDataStore();
    const inventory = useCollectionStore(state => state.inventory);
    const triggerDialogue = useOperatorStore(state => state.triggerDialogue);
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
    const [impactFlash, setImpactFlash] = useState<string | null>(null);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [statsKey, setStatsKey] = useState(0); // Used to force re-render flashes

    // Define spawnParticles with useCallback so it can be used in useEffect
    const spawnParticles = useCallback((count: number, x: number, y: number, color: string) => {
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
    }, []);

    // Trigger Initial Lore on mount
    const hasInitialized = useRef(false);
    const startMission = useCollectionStore(state => state.startMission);

    useEffect(() => {
        if (isOpen && !hasInitialized.current) {
            hasInitialized.current = true;
            forceUnmute();
            addLog("AUDIO_UPLINK: Syncing neural frequencies...");

            // START MISSION TIMER (Anti-Cheat)
            startMission();

            // Trigger Operator Brief
            setTimeout(() => {
                triggerDialogue('mission_brief');
            }, 1000);

            if (streamer.lore?.statusLog) {
                // De-synchronize state update to satisfy React Compiler
                setTimeout(() => {
                    setCurrentLore(streamer.lore?.statusLog || null);
                }, 0);
            }
        }
    }, [isOpen, streamer.lore, forceUnmute, triggerDialogue, addLog, startMission]);

    // Handle Stage Progression Lore
    useEffect(() => {
        // Wrap in setTimeout to avoid synchronous setState inside effect
        if (stage === 2 && streamer.lore?.battle1) {
            setTimeout(() => {
                setLoreQueue(prev => [...prev, streamer.lore!.battle1]);
            }, 0);
        } else if (stage === 3 && streamer.lore?.battle2) {
            setTimeout(() => {
                setLoreQueue(prev => [...prev, streamer.lore!.battle2]);
            }, 0);
        }
    }, [stage, streamer.lore]);

    // Show Lore from queue if none active
    useEffect(() => {
        if (!currentLore && loreQueue.length > 0) {
            const next = loreQueue[0];
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setLoreQueue(prev => prev.slice(1));
                setCurrentLore(next);
            }, 0);
        }
    }, [currentLore, loreQueue]);

    useEffect(() => {
        if (lastDamageAmount !== null) {
            const now = Date.now();
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setDamagePopups(prev => [...prev, {
                    id: now + Math.random(),
                    amount: lastDamageAmount,
                    target: lastDamageDealer!
                }]);

                if (lastDamageAmount === 0) {
                    playMiss();
                } else if (lastDamageAmount > 50) {
                    setImpactFlash('bg-white');
                    setTimeout(() => setImpactFlash(null), 100);
                    playCritical();
                } else {
                    setImpactFlash(lastDamageDealer === 'enemy' ? 'bg-resistance-accent/30' : 'bg-white/20');
                    setTimeout(() => setImpactFlash(null), 50);
                    playDamage();
                }
                setStatsKey(prev => prev + 1);
            }, 0);
        }
    }, [lastDamageAmount, lastDamageDealer, playDamage, playCritical, playMiss]);

    // Handle Turn Starts
    useEffect(() => {
        if (isTurn && !isComplete) {
            playTurnStart();
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setScreenFlash('rgba(0, 243, 255, 0.05)');
                setTimeout(() => setScreenFlash(null), 300);
            }, 0);
        }
    }, [isTurn, isComplete, playTurnStart]);

    // Handle Health-based Narrative Triggers
    useEffect(() => {
        if (player.hp < 30 && !isComplete) {
            triggerDialogue('danger_warnings');
        }
        if (enemy.hp < 30 && enemy.hp > 0 && !isComplete) {
            triggerDialogue('encouragement');
        }
    }, [player.hp, enemy.hp, isComplete, triggerDialogue]);

    // Handle Boss Intro
    useEffect(() => {
        if (stage === 3) {
            playBossIntro();
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setImpactFlash('bg-resistance-accent/50');
                setTimeout(() => setImpactFlash(null), 1000);
            }, 0);
        }
    }, [stage, playBossIntro]);

    // Handle XP Gain SFX
    useEffect(() => {
        if (resultStep === 1) {
            const interval = setInterval(() => {
                playExpGain();
            }, 100);
            setTimeout(() => clearInterval(interval), 1000);
        }
    }, [resultStep, playExpGain]);

    // Get mission record to show XP/Level progress
    const record = useCollectionStore(state => getMissionRecord(state, streamer.id));
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
            const rewards = rank === 'S' ? ['stim_pack', 'neural_booster'] : rank === 'A' ? ['stim_pack'] : [];

            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setEarnedXP(totalXP);
                setLootedItems(rewards);

                // Trigger Climax Lore
                if (streamer.lore?.climax) {
                    setLoreQueue(prev => [...prev, streamer.lore!.climax]);
                }
            }, 0);

            const timer = setTimeout(() => setResultStep(1), 1000);
            return () => clearTimeout(timer);
        }
    }, [result, rank, isBoss, resultStep, streamer.lore]);

    useEffect(() => {
        if (isShaking && !isTurn) {
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                spawnParticles(10, 200, 250, 'bg-resistance-accent');
            }, 0);
        }
        if (logs[0]?.includes("CRITICAL")) {
            // Wrap in setTimeout to avoid synchronous setState inside effect
            setTimeout(() => {
                setCritText("CRITICAL_OVERLOAD");
                setTimeout(() => setCritText(null), 1000);
            }, 0);
        }
    }, [isShaking, isTurn, logs, spawnParticles]);

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
                        <BattleArena
                            isShaking={isShaking}
                            isAttacking={isAttacking}
                            isBoss={isBoss}
                            isEnemyTakingDamage={isEnemyTakingDamage}
                            isTakingDamage={isTakingDamage}
                            isTurn={isTurn}
                            enemy={enemy}
                            player={player}
                            stage={stage}
                            turns={turns}
                            streamer={streamer}
                            streamerNature={streamerNature}
                            attackBoost={attackBoost}
                            defenseBoost={defenseBoost}
                            particles={particles}
                            effectivenessFlash={effectivenessFlash}
                            damagePopups={damagePopups}
                            impactFlash={impactFlash}
                            screenFlash={screenFlash}
                            showPhaseBanner={showPhaseBanner}
                            currentBossPhase={currentBossPhase}
                            itemEffects={itemEffects}
                            onItemEffectComplete={(_id) => setItemEffects(prev => prev.filter(e => e.id !== _id))}
                            onDamagePopupComplete={(_id) => setDamagePopups(prev => prev.filter(p => p.id !== _id))}
                            statsKey={statsKey}
                        />

                        {/* Right Section / Command Deck */}
                        <div className="relative flex-1 bg-[#050505] border-2 border-white/10 flex flex-col p-6 rounded-lg overflow-y-auto lg:overflow-visible">

                            {/* Terminal Logs */}
                            <TerminalLogs logs={logs} />

                            {/* Commands */}
                            <CommandDeck
                                streamer={streamer}
                                movePP={movePP}
                                isTurn={isTurn}
                                isComplete={isComplete}
                                onMoveClick={(move) => {
                                    forceUnmute();
                                    playClick();
                                    playMoveSound(move.type);
                                    if (move.power > 50) playVoiceLine(streamer.name);
                                    setIsAttacking(true);
                                    setTimeout(() => setIsAttacking(false), 300);
                                    spawnParticles(20, 500, 200, 'bg-neon-blue');

                                    if (Math.random() > 0.85) {
                                        setCritText("CRITICAL_OVERLOAD");
                                        setTimeout(() => setCritText(null), 1000);
                                    }

                                    executeMove(move);
                                }}
                                charge={charge}
                                onUltimateClick={() => {
                                    forceUnmute();
                                    playClick();
                                    playUltimate();
                                    triggerGlitch(2);
                                    setIsAttacking(true);
                                    setTimeout(() => setIsAttacking(false), 500);
                                    spawnParticles(80, 500, 200, 'bg-neon-pink');
                                    executeUltimate();
                                }}
                                onToggleInventory={() => {
                                    playClick();
                                    setShowItems(!showItems);
                                }}
                                showItems={showItems}
                            />
                        </div>
                    </div>

                    {/* Inventory Overlay */}
                    <AnimatePresence>
                        {showItems && (
                            <InventoryOverlay
                                inventory={inventory}
                                isTurn={isTurn}
                                isComplete={isComplete}
                                onUseItem={(itemId) => {
                                    forceUnmute();
                                    const item = items[itemId];
                                    if (item) {
                                        const type = item.effect === 'heal' ? 'heal' :
                                            item.effect === 'boostAttack' ? 'boost_atk' : 'boost_def';
                                        setItemEffects(prev => [...prev, { id: Date.now(), type: type as any }]);
                                        playItemUse(item.effect === 'heal' ? 'heal' : 'boost');
                                    }
                                    executeUseItem(itemId);
                                    setShowItems(false);
                                }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Result Terminal Overlay */}
                    <AnimatePresence>
                        {isComplete && (
                            <ResultOverlay
                                result={result}
                                rank={rank}
                                earnedXP={earnedXP}
                                currentLevel={currentLevel}
                                currentXP={currentXP}
                                nextXPThreshold={nextXPThreshold}
                                xpProgress={xpProgress}
                                resultStep={resultStep}
                                lootedItems={lootedItems}
                                onClose={onClose}
                            />
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

                    {/* Lore Overlay Layer */}
                    <AnimatePresence>
                        {currentLore && (
                            <LoreOverlay
                                text={currentLore}
                                onComplete={() => setCurrentLore(null)}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

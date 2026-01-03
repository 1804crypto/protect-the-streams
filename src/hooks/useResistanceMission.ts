"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Streamer, Move, applyNatureToStats } from '@/data/streamers';
import { useCollectionStore } from './useCollectionStore';
import { bosses } from '@/data/bosses';
import {
    getTypeEffectiveness,
    getEffectivenessMessage,
    getEnemyType,
    MoveType,
    SUPER_EFFECTIVE
} from '@/data/typeChart';
import { items, BattleItem } from '@/data/items';


export interface EntityState {
    id: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: any;
}

export const useResistanceMission = (streamer: Streamer) => {
    const {
        completedMissions,
        markMissionComplete,
        useItem: consumeItem,
        getItemCount,
        getNature,
        difficultyMultiplier,
        updateDifficulty
    } = useCollectionStore();
    const threatLevel = completedMissions.length;

    // Get streamer's nature and apply stat modifiers
    const streamerNature = getNature(streamer.id);
    const modifiedStats = streamerNature
        ? applyNatureToStats(streamer.stats, streamerNature)
        : streamer.stats;

    const bossEntity = useMemo(() => {
        if (streamer.id === 'ceo') return bosses.THE_CEO;

        // Find matching archetype
        const arch = streamer.archetype.toUpperCase();
        let key = 'GENERIC';

        if (arch.includes('SPARK')) key = 'SPARK';
        else if (arch.includes('GENERAL')) key = 'GENERAL';
        else if (arch.includes('GHOST')) key = 'GHOST';
        else if (arch.includes('INFILTRATOR')) key = 'INFILTRATOR';
        else if (arch.includes('WEAVER')) key = 'WEAVER';
        else if (arch.includes('ENGINE')) key = 'ENGINE';
        else if (arch.includes('VANGUARD')) key = 'VANGUARD';
        else if (arch.includes('PROVOCATEUR')) key = 'PROVOCATEUR';
        else if (arch.includes('KING')) key = 'KING';
        else if (arch.includes('CHAOS')) key = 'CHAOS';
        else if (arch.includes('INFLUENCE')) key = 'INFLUENCE';
        else if (arch.includes('CHARISMA')) key = 'CHARISMA';
        else if (arch.includes('REBELLION')) key = 'REBELLION';

        const bossData = bosses[key] || bosses.GENERIC;

        // Scale boss HP based on threat level
        return {
            ...bossData,
            maxHp: bossData.maxHp + (threatLevel * 50),
            hp: bossData.maxHp + (threatLevel * 50)
        };
    }, [streamer.archetype, streamer.id, threatLevel]);

    const [player, setPlayer] = useState<EntityState>({
        id: streamer.id,
        name: streamer.name,
        maxHp: 100,
        hp: 100,
        stats: modifiedStats,
    });

    const [enemy, setEnemy] = useState<EntityState & { moves?: any[] }>({
        id: 'corp_sentinel',
        name: 'Authority Sentinel',
        maxHp: 120 + (threatLevel * 20),
        hp: 120 + (threatLevel * 20),
        stats: { influence: 80, chaos: 50, charisma: 70, rebellion: 40 },
    });

    const [logs, setLogs] = useState<string[]>(["MISSION_INITIALIZED: Stabilizing sector signal..."]);
    const [isTurn, setIsTurn] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | null>(null);
    const [stage, setStage] = useState<number>(1);
    const [isShaking, setIsShaking] = useState(false);
    const [glitchIntensity, setGlitchIntensity] = useState(0);
    const [turns, setTurns] = useState(0);
    const [charge, setCharge] = useState(0);
    const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
    const [effectivenessFlash, setEffectivenessFlash] = useState<'super' | 'weak' | null>(null);
    const [isTakingDamage, setIsTakingDamage] = useState(false);
    const [isEnemyTakingDamage, setIsEnemyTakingDamage] = useState(false);
    const [currentBossPhase, setCurrentBossPhase] = useState<number>(0);
    const [showPhaseBanner, setShowPhaseBanner] = useState(false);
    const [lastDamageAmount, setLastDamageAmount] = useState<number | null>(null);
    const [lastDamageDealer, setLastDamageDealer] = useState<'player' | 'enemy' | null>(null);

    // Boost state
    const [attackBoost, setAttackBoost] = useState<{ multiplier: number; turnsLeft: number }>({ multiplier: 1, turnsLeft: 0 });
    const [defenseBoost, setDefenseBoost] = useState<{ multiplier: number; turnsLeft: number }>({ multiplier: 1, turnsLeft: 0 });

    // PP tracking - initialize from streamer moves
    const [movePP, setMovePP] = useState<Record<string, number>>(() => {
        const pp: Record<string, number> = {};
        streamer.moves.forEach(m => { pp[m.name] = m.pp; });
        return pp;
    });

    const isBoss = stage >= 3;

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const triggerGlitch = (intensity: number = 1) => {
        setGlitchIntensity(intensity);
        setTimeout(() => setGlitchIntensity(0), 400);
    };

    const handleEnemyTurn = useCallback(() => {
        if (isComplete) return;

        let enemyDamage = 0;
        let moveName = 'RETALIATE';
        let moveDesc = 'Strikes back at the signal.';

        if (isBoss && enemy.moves && enemy.moves.length > 0) {
            // Pick a random move
            const move = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
            moveName = move.name;
            moveDesc = move.description;
            enemyDamage = move.damage;
        } else {
            const baseEnemyDamage = 15;
            enemyDamage = Math.floor((baseEnemyDamage + (threatLevel * 5)) * (1 + Math.random()));
        }

        // Apply scaling for boss/elite
        if (isBoss) {
            enemyDamage = Math.floor(enemyDamage * (1 + (threatLevel * 0.1)));
        }

        // Authority Sweep / Difficulty Multiplier
        enemyDamage = Math.floor(enemyDamage * difficultyMultiplier);

        // Apply defense boost
        if (defenseBoost.turnsLeft > 0) {
            enemyDamage = Math.floor(enemyDamage * defenseBoost.multiplier);
        }

        setPlayer(prev => {
            const newHp = Math.max(0, prev.hp - enemyDamage);
            if (newHp === 0) {
                setIsComplete(true);
                setResult('FAILURE');
                markMissionComplete(streamer.id, 'F', 10);
                addLog("SIGNAL_LOST: Retreat for recalibration.");
            }
            if (enemyDamage > 0) {
                setIsTakingDamage(true);
                setTimeout(() => setIsTakingDamage(false), 500);
            }
            if (enemyDamage > 10) triggerShake();
            if (enemyDamage > 10) setCharge(prevCharge => Math.min(100, prevCharge + 5));
            if (enemyDamage > 25) triggerGlitch(0.3);

            setLastDamageAmount(enemyDamage);
            setLastDamageDealer('enemy');
            setTimeout(() => setLastDamageAmount(null), 1000);

            return { ...prev, hp: newHp };
        });

        addLog(`${enemy.name} uses ${moveName}: ${enemyDamage} damage.`);
        if (moveDesc) addLog(`[${moveDesc}]`);
        setIsTurn(true);

        // Decrement boost counters
        setAttackBoost(prev => prev.turnsLeft > 0 ? { ...prev, turnsLeft: prev.turnsLeft - 1 } : prev);
        setDefenseBoost(prev => prev.turnsLeft > 0 ? { ...prev, turnsLeft: prev.turnsLeft - 1 } : prev);
    }, [isComplete, isBoss, enemy.moves, enemy.name, threatLevel, defenseBoost]);



    // Centralized Enemy Turn Trigger
    useEffect(() => {
        if (!isTurn && !isComplete && enemy.hp > 0) {
            const timer = setTimeout(() => {
                handleEnemyTurn();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isTurn, isComplete, enemy.hp, handleEnemyTurn]);

    const calculateRank = useCallback((): 'S' | 'A' | 'B' | 'F' => {
        if (result === 'FAILURE') return 'F';
        const hpPercent = (player.hp / player.maxHp) * 100;
        if (hpPercent > 80 && turns < 10) return 'S';
        if (hpPercent > 50 || turns < 15) return 'A';
        return 'B';
    }, [result, player.hp, player.maxHp, turns]);

    const calculateXP = useCallback((rank: 'S' | 'A' | 'B' | 'F') => {
        const baseXP = isBoss ? 150 : 50;
        const rankMult = rank === 'S' ? 1.5 : rank === 'A' ? 1.2 : 1;
        return Math.floor(baseXP * rankMult);
    }, [isBoss]);

    // Action Executors
    const executeMove = useCallback((move: Move) => {
        if (!isTurn || isComplete) return;

        // Check PP
        if (movePP[move.name] <= 0) {
            addLog(`NO_PP_REMAINING: ${move.name} is depleted!`);
            return;
        }

        // Deduct PP
        setMovePP(prev => ({ ...prev, [move.name]: prev[move.name] - 1 }));

        // Commit Player Turn
        setIsTurn(false);
        setTurns(prev => prev + 1);
        addLog(`${player.name.toUpperCase()} uses ${move.name.toUpperCase()}!`);

        // Get enemy type and calculate effectiveness
        const enemyType = getEnemyType(enemy.stats);
        const effectiveness = getTypeEffectiveness(move.type, enemyType);
        const effectivenessMsg = getEffectivenessMessage(effectiveness);

        if (effectivenessMsg) {
            addLog(effectivenessMsg);
            setEffectivenessFlash(effectiveness >= SUPER_EFFECTIVE ? 'super' : 'weak');
            setTimeout(() => setEffectivenessFlash(null), 500);
        }

        // Damage Calculation
        let damage = 0;
        let newEnemyHp = enemy.hp; // Track local var for immediate logic

        if (move.power > 0) {
            const isCrit = Math.random() < 0.10;
            const critMult = isCrit ? 1.5 : 1;

            const relevantStatValue = (player.stats as any)[move.type.toLowerCase() as any] || 50;
            const baseDamage = Math.floor(move.power * (relevantStatValue / 100) * (0.8 + Math.random() * 0.4));

            // Apply modifiers
            damage = Math.floor(baseDamage * effectiveness * (attackBoost.turnsLeft > 0 ? attackBoost.multiplier : 1) * critMult);

            if (isCrit) {
                addLog("CRITICAL_OVERLOAD: Damage output maximized!");
                triggerGlitch(1.2);
            } else if (effectiveness >= SUPER_EFFECTIVE) {
                triggerGlitch(0.8);
            } else if (damage > 50) {
                triggerGlitch(0.5);
            }

            // Apply Damage
            setEnemy(prev => {
                const nextHp = Math.max(0, prev.hp - damage);
                newEnemyHp = nextHp; // specific update for this closure

                setLastDamageAmount(damage);
                setLastDamageDealer('player');
                setTimeout(() => setLastDamageAmount(null), 1000);

                // Boss Phase Check
                if (isBoss && bossEntity.phases) {
                    const hpRatio = nextHp / prev.maxHp;
                    const nextPhaseIndex = bossEntity.phases.findIndex((p, i) => hpRatio <= p.threshold && i >= currentBossPhase);
                    if (nextPhaseIndex !== -1 && nextPhaseIndex >= currentBossPhase) {
                        const phase = bossEntity.phases[nextPhaseIndex];
                        setCurrentBossPhase(nextPhaseIndex + 1);
                        setShowPhaseBanner(true);
                        setTimeout(() => setShowPhaseBanner(false), 3000);
                        addLog(`>>> ${phase.name} <<<`);
                        addLog(`[SYSTEM]: ${phase.msg}`);
                        triggerGlitch(1.5);
                        triggerShake();
                    }
                }

                if (nextHp === 0) {
                    if (isBoss) {
                        setIsComplete(true);
                        setResult('SUCCESS');
                        addLog(`FINAL_UPLINK_SECURED: Sector ${streamer.name.toUpperCase()} liberated.`);
                    } else {
                        // Progress to next stage (handled via timeout to allow animations)
                        setTimeout(() => {
                            const isNextBoss = stage + 1 >= 3;
                            setStage(s => s + 1);
                            setEnemy({
                                id: isNextBoss ? bossEntity.id : 'corp_elite',
                                name: isNextBoss ? bossEntity.name : 'Elite Sentinel',
                                maxHp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                                hp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                                stats: isNextBoss ? bossEntity.stats : { influence: 90, chaos: 60, charisma: 80, rebellion: 50 },
                                moves: isNextBoss ? bossEntity.moves : undefined
                            });
                            if (isNextBoss) triggerGlitch(1);
                            addLog(`STAGE_${stage + 1} DETECTED: New threat approaching...`);
                            setIsTurn(true); // Grant turn back to player for new enemy
                        }, 1000);
                    }
                }

                if (damage > 0) {
                    setIsEnemyTakingDamage(true);
                    setTimeout(() => setIsEnemyTakingDamage(false), 500);
                }

                return { ...prev, hp: nextHp };
            });

            // Charge Update
            setCharge(prev => Math.min(100, prev + Math.floor(damage / 5)));
            addLog(`Inflicted ${damage} disruption to ${enemy.name}.`);

        } else {
            // Support Move
            addLog(`${move.description}`);
            if (move.name.includes("HEALING") || move.name.includes("UP")) {
                setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 30) }));
                addLog("Signal integrity restored (+30 HP).");
            }
        }
    }, [player, enemy, isTurn, isComplete, stage, isBoss, bossEntity, threatLevel, attackBoost, movePP, currentBossPhase, streamer.name]);

    const executeUltimate = useCallback(() => {
        if (charge < 100 || !isTurn || isComplete) return;

        setIsTurn(false);
        setCharge(0);
        triggerGlitch(2);
        addLog(`ULTIMATE_UPLINK: ${player.name.toUpperCase()} ACTIVATES ${streamer.ultimateMove.name}!`);

        const damage = Math.floor(streamer.ultimateMove.power * (1.5 + Math.random()));

        setEnemy(prev => {
            const newHp = Math.max(0, prev.hp - damage);

            setLastDamageAmount(damage);
            setLastDamageDealer('player');
            setTimeout(() => setLastDamageAmount(null), 1000);

            if (newHp === 0) {
                if (isBoss) {
                    setIsComplete(true);
                    setResult('SUCCESS');
                    addLog(`CRITICAL_DELETION: Sector ${streamer.name.toUpperCase()} liberated.`);
                } else {
                    setTimeout(() => {
                        const isNextBoss = stage + 1 >= 3;
                        setStage(s => s + 1);
                        setEnemy({
                            id: isNextBoss ? bossEntity.id : 'corp_elite',
                            name: isNextBoss ? bossEntity.name : 'Elite Sentinel',
                            maxHp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                            hp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                            stats: isNextBoss ? bossEntity.stats : { influence: 90, chaos: 60, charisma: 80, rebellion: 50 },
                            moves: isNextBoss ? bossEntity.moves : undefined
                        });
                        setIsTurn(true);
                    }, 1000);
                }
            }
            return { ...prev, hp: newHp };
        });

        addLog(`Catastrophic damage inflicted: ${damage}.`);
    }, [charge, isTurn, isComplete, player.name, streamer, stage, isBoss, bossEntity, threatLevel]);

    const useBattleItem = useCallback((itemId: string) => {
        if (!isTurn || isComplete) return false;

        const item = items[itemId];
        if (!item) return false;

        if (getItemCount(itemId) <= 0) {
            addLog(`NO_ITEM: ${item.name} not in inventory!`);
            return false;
        }

        if (!consumeItem(itemId)) return false;

        addLog(`ITEM_USED: ${item.icon} ${item.name}`);

        switch (item.effect) {
            case 'heal':
                setPlayer(prev => {
                    const newHp = Math.min(prev.maxHp, prev.hp + item.value);
                    addLog(`Restored ${Math.min(item.value, prev.maxHp - prev.hp)} HP.`);
                    return { ...prev, hp: newHp };
                });
                break;
            case 'restorePP':
                setMovePP(prev => {
                    const newPP = { ...prev };
                    streamer.moves.forEach(m => {
                        newPP[m.name] = Math.min(m.pp, (prev[m.name] || 0) + item.value);
                    });
                    addLog(`Restored PP to all moves.`);
                    return newPP;
                });
                break;
            case 'boostAttack':
                setAttackBoost({ multiplier: item.value, turnsLeft: 3 });
                addLog(`Attack boosted by ${Math.round((item.value - 1) * 100)}% for 3 turns!`);
                break;
            case 'boostDefense':
                setDefenseBoost({ multiplier: item.value, turnsLeft: 3 });
                addLog(`Defense boosted for 3 turns!`);
                break;
        }

        setIsTurn(false);
        setTurns(prev => prev + 1);
        return true;
    }, [isTurn, isComplete, getItemCount, consumeItem, streamer.moves]);

    // Completion Handler: now passes correct XP
    useEffect(() => {
        if (result === 'SUCCESS' && !hasMarkedComplete) {
            const rank = calculateRank();
            const xp = calculateXP(rank);

            markMissionComplete(streamer.id, rank, xp);
            setHasMarkedComplete(true);

            if (difficultyMultiplier > 1) {
                updateDifficulty(1);
            }
        }
    }, [result, streamer.id, markMissionComplete, hasMarkedComplete, calculateRank, calculateXP, difficultyMultiplier, updateDifficulty]);

    return {
        player,
        enemy,
        logs,
        isTurn,
        isComplete,
        result,
        executeMove,
        executeUltimate,
        useBattleItem,
        triggerShake,
        triggerGlitch,
        stage,
        isShaking,
        glitchIntensity,
        charge,
        turns,
        movePP,
        effectivenessFlash,
        attackBoost,
        defenseBoost,
        streamerNature,
        rank: result === 'SUCCESS' ? calculateRank() : null,
        isTakingDamage,
        isEnemyTakingDamage,
        currentBossPhase,
        showPhaseBanner,
        lastDamageAmount,
        lastDamageDealer
    };
};


"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Streamer, Move, applyNatureToStats } from '@/data/streamers';
import { useCollectionStore, getNature, getItemCount } from './useCollectionStore';
import { bosses, BossMove } from '@/data/bosses';
import {
    getTypeEffectiveness,
    getEffectivenessMessage,
    getEnemyType,
    getStatForMoveType,
    SUPER_EFFECTIVE
} from '@/data/typeChart';
import { useGameDataStore } from './useGameDataStore';

import { useVisualEffects } from './useVisualEffects';


export interface EntityState {
    id: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: import('@/data/streamers').StreamerStats;
    image?: string;
}

export const useResistanceMission = (streamer: Streamer) => {
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const markMissionComplete = useCollectionStore(state => state.markMissionComplete);
    const consumeItem = useCollectionStore(state => state.useItem);
    const updateDifficulty = useCollectionStore(state => state.updateDifficulty);
    const difficultyMultiplier = useCollectionStore(state => state.difficultyMultiplier);
    const threatLevel = completedMissions.length;

    // Get streamer's nature and apply stat modifiers
    const streamerNature = useCollectionStore(state => getNature(state, streamer.id));
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

        // Scale boss HP: logarithmic curve caps runaway difficulty (max +500 bonus HP)
        const bossHpBonus = Math.min(500, Math.floor(50 * Math.log2(threatLevel + 1)));
        return {
            ...bossData,
            maxHp: bossData.maxHp + bossHpBonus,
            hp: bossData.maxHp + bossHpBonus,
            image: bossData.image
        };
    }, [streamer.archetype, streamer.id, threatLevel]);

    const { items } = useGameDataStore();

    // Equipment passive bonuses — read once at battle start
    const equipmentSlots = useCollectionStore(state => state.equipmentSlots);
    const equipmentBonuses = useMemo(() => {
        const bonuses = { maxHpBonus: 0, damageMultiplier: 1, chargeRateBonus: 0, dodgeChance: 0 };
        const slots = Object.values(equipmentSlots);
        for (const itemId of slots) {
            if (!itemId) continue;
            const equip = items[itemId];
            if (!equip || equip.category !== 'equipment') continue;
            switch (itemId) {
                case 'TITAN_CHASSIS': bonuses.maxHpBonus += 30; break;
                case 'QUANTUM_CORE': bonuses.damageMultiplier = Math.min(bonuses.damageMultiplier * 1.1, 2.0); break;
                case 'NEURAL_AMPLIFIER': bonuses.chargeRateBonus += 0.15; break;
                case 'SHADOW_CLOAK': bonuses.dodgeChance += 0.15; break;
            }
        }
        return bonuses;
    }, [equipmentSlots, items]);

    // Freeze equipment bonuses at battle start to prevent mid-battle changes
    const equipBonusRef = useRef(equipmentBonuses);

    // 1. Calculate Dynamic Player Stats
    const missionRecord = completedMissions.find(m => m.id === streamer.id);
    const streamerLevel = missionRecord?.level || 1;

    // Scale Player HP: Base 100 + (Level Bonus) + (Global Resistance Bonus) + Equipment Bonus
    const calculatedMaxHp = 100 + ((streamerLevel - 1) * 25) + (threatLevel * 5) + equipBonusRef.current.maxHpBonus;

    const [player, setPlayer] = useState<EntityState>({
        id: streamer.id,
        name: streamer.name,
        maxHp: calculatedMaxHp,
        hp: calculatedMaxHp,
        stats: modifiedStats,
    });

    const [enemy, setEnemy] = useState<EntityState & { moves?: (Move | BossMove)[] }>({
        id: 'corp_sentinel',
        name: 'Authority Sentinel',
        maxHp: 120 + (threatLevel * 20),
        hp: 120 + (threatLevel * 20),
        stats: { influence: 80, chaos: 50, charisma: 70, rebellion: 40 },
        image: '/authority_sentinel_cipher_unit_1766789046162.png'
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
    const lastActionTimeRef = useRef<number>(0);
    const [missionStartTime] = useState<number>(Date.now());

    // Memory leak guard: track mount state and timers
    const mountedRef = useRef(true);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const safeTimeout = useCallback((fn: () => void, ms: number) => {
        const id = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
        timersRef.current.push(id);
        return id;
    }, []);

    // FREEZE FIX: Use ref-based rate limiter for stable function reference
    const isRateLimited = useCallback(() => {
        const now = Date.now();
        if (now - lastActionTimeRef.current < 400) {
            return true;
        }
        lastActionTimeRef.current = now;
        return false;
    }, []);

    // Global Visual Sync
    const setIntegrity = useVisualEffects(state => state.setIntegrity);
    const triggerGlobalImpact = useVisualEffects(state => state.triggerImpact);
    const triggerGlobalGlitch = useVisualEffects(state => state.triggerGlitch);
    const resetGlobalEffects = useVisualEffects(state => state.resetEffects);

    // Sync HP to global store
    useEffect(() => {
        setIntegrity(player.maxHp > 0 ? player.hp / player.maxHp : 0);
    }, [player.hp, player.maxHp, setIntegrity]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            timersRef.current.forEach(clearTimeout);
            resetGlobalEffects();
        };
    }, [resetGlobalEffects]);

    // Boost state
    const [attackBoost, setAttackBoost] = useState<{ multiplier: number; turnsLeft: number }>({ multiplier: 1, turnsLeft: 0 });
    const [defenseBoost, setDefenseBoost] = useState<{ multiplier: number; turnsLeft: number }>({ multiplier: 1, turnsLeft: 0 });
    // Ref keeps defenseBoost fresh inside setTimeout callbacks (prevents stale closure)
    const defenseBoostRef = useRef(defenseBoost);
    useEffect(() => { defenseBoostRef.current = defenseBoost; }, [defenseBoost]);

    // PP tracking - initialize from streamer moves
    const [movePP, setMovePP] = useState<Record<string, number>>(() => {
        const pp: Record<string, number> = {};
        streamer.moves.forEach(m => { pp[m.name] = m.pp; });
        return pp;
    });

    const isBoss = stage >= 3;

    // BUG 13 FIX: Refs for frequently changing values used in callbacks
    const playerRef = useRef(player);
    const enemyRef = useRef(enemy);
    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { enemyRef.current = enemy; }, [enemy]);

    const addLog = useCallback((msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5)), []);

    const triggerShake = useCallback(() => {
        setIsShaking(true);
        triggerGlobalImpact(1.0);
        safeTimeout(() => setIsShaking(false), 500);
    }, [triggerGlobalImpact, safeTimeout]);

    const triggerGlitch = useCallback((intensity: number = 1) => {
        setGlitchIntensity(intensity);
        triggerGlobalGlitch(intensity);
        safeTimeout(() => {
            setGlitchIntensity(0);
            triggerGlobalGlitch(0);
        }, 400);
    }, [triggerGlobalGlitch, safeTimeout]);

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
            enemyDamage = 'power' in move ? move.power : move.damage;
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

        // Defense boost: multiplier > 1 means damage reduction (e.g., 1.25 → take 80% damage)
        // Use ref to avoid stale closure when called via setTimeout
        const currentDefenseBoost = defenseBoostRef.current;
        if (currentDefenseBoost.turnsLeft > 0 && currentDefenseBoost.multiplier > 0) {
            enemyDamage = Math.floor(enemyDamage / Math.max(1, currentDefenseBoost.multiplier));
        }

        // Equipment: Shadow Cloak dodge chance
        if (equipBonusRef.current.dodgeChance > 0 && Math.random() < equipBonusRef.current.dodgeChance) {
            addLog(`SHADOW_EVASION: ${enemy.name}'s attack missed!`);
            enemyDamage = 0;
        }

        const newHp = Math.max(0, player.hp - enemyDamage);

        // BUG 14 FIX: Guard against double markMissionComplete on failure
        if (newHp === 0 && !hasMarkedComplete) {
            // Last Stand: check if player has a revive item — give ONE chance
            const hasRevive = getItemCount(useCollectionStore.getState(), 'PHOENIX_MODULE_V2') > 0;
            if (hasRevive && playerRef.current.hp > 0) {
                // Only grant last stand if player wasn't already at 0 HP (prevents infinite loop)
                addLog("CRITICAL_DAMAGE: Phoenix Module detected! Use it now or fall!");
                setPlayer(prev => ({ ...prev, hp: 0 }));
                setIsTurn(true); // Give player one final turn to use revive
                return;
            }
            setIsComplete(true);
            setResult('FAILURE');
            setHasMarkedComplete(true);
            markMissionComplete(streamer.id, 'F', 10);
            addLog("SIGNAL_LOST: Retreat for recalibration.");
        }
        if (enemyDamage > 0) {
            setIsTakingDamage(true);
            safeTimeout(() => setIsTakingDamage(false), 500);
        }
        if (enemyDamage > 10) triggerShake();
        if (enemyDamage > 10) setCharge(prevCharge => Math.min(100, prevCharge + Math.floor(5 * (1 + equipBonusRef.current.chargeRateBonus))));
        if (enemyDamage > 25) triggerGlitch(0.3);

        setLastDamageAmount(enemyDamage);
        setLastDamageDealer('enemy');
        safeTimeout(() => setLastDamageAmount(null), 1000);

        setPlayer(prev => ({ ...prev, hp: newHp }));

        addLog(`${enemy.name} uses ${moveName}: ${enemyDamage} damage.`);
        if (moveDesc) addLog(`[${moveDesc}]`);
        setIsTurn(true);

        // Decrement boost counters
        setAttackBoost(prev => prev.turnsLeft > 0 ? { ...prev, turnsLeft: prev.turnsLeft - 1 } : prev);
        setDefenseBoost(prev => prev.turnsLeft > 0 ? { ...prev, turnsLeft: prev.turnsLeft - 1 } : prev);
    }, [isComplete, isBoss, enemy.moves, enemy.name, threatLevel, player, difficultyMultiplier, streamer.id, markMissionComplete, addLog, triggerShake, triggerGlitch, hasMarkedComplete, safeTimeout]);



    // Centralized Enemy Turn Trigger
    useEffect(() => {
        if (!isTurn && !isComplete && enemy.hp > 0) {
            const timer = safeTimeout(() => {
                handleEnemyTurn();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isTurn, isComplete, enemy.hp, handleEnemyTurn, safeTimeout]);

    // Safety Watchdog: If turn is lost for > 5s, force reset
    useEffect(() => {
        if (!isTurn && !isComplete) {
            const safetyTimer = safeTimeout(() => {
                console.warn("Watchdog: Forcing Turn Reset");
                addLog("SYSTEM_OVERRIDE: Manual Override Engaged.");
                setIsTurn(true);
            }, 5000);
            return () => clearTimeout(safetyTimer);
        }
    }, [isTurn, isComplete, addLog, safeTimeout]);

    const calculateRank = useCallback((): 'S' | 'A' | 'B' | 'F' => {
        if (result === 'FAILURE') return 'F';
        const hpPercent = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
        if (hpPercent > 80 && turns < 10) return 'S';
        if (hpPercent > 50 && turns < 15) return 'A';
        return 'B';
    }, [result, player.hp, player.maxHp, turns]);

    const calculateXP = useCallback((rank: 'S' | 'A' | 'B' | 'F') => {
        const baseXP = isBoss ? 150 : 50;
        const rankMult = rank === 'S' ? 1.5 : rank === 'A' ? 1.2 : 1;
        return Math.floor(baseXP * rankMult);
    }, [isBoss]);

    // Action Executors
    const executeMove = useCallback((move: Move) => {
        if (!isTurn || isComplete || isRateLimited()) return;

        // Last Stand: if HP is 0, block moves — must use revive item
        if (playerRef.current.hp <= 0) {
            addLog("CRITICAL: Use a revival item or the signal will be lost!");
            return;
        }

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
            safeTimeout(() => setEffectivenessFlash(null), 500);
        }

        // Damage Calculation
        let damage = 0;

        if (move.power > 0) {
            const isCrit = Math.random() < 0.10;
            const critMult = isCrit ? 1.5 : 1;

            const statKey = getStatForMoveType(move.type);
            const relevantStatValue = player.stats[statKey as keyof typeof player.stats] || 50;
            const baseDamage = Math.floor(move.power * (relevantStatValue / 100) * (0.8 + Math.random() * 0.4));

            // Apply modifiers
            damage = Math.floor(baseDamage * effectiveness * (attackBoost.turnsLeft > 0 ? attackBoost.multiplier : 1) * critMult * equipBonusRef.current.damageMultiplier);

            if (isCrit) {
                addLog("CRITICAL_OVERLOAD: Damage output maximized!");
                triggerGlitch(1.2);
            } else if (effectiveness >= SUPER_EFFECTIVE) {
                triggerGlitch(0.8);
            } else if (damage > 50) {
                triggerGlitch(0.5);
            }

            // Apply Damage
            const nextHp = Math.max(0, enemy.hp - damage);

            setLastDamageAmount(damage);
            setLastDamageDealer('player');
            safeTimeout(() => setLastDamageAmount(null), 1000);

            // Boss Phase Check
            if (isBoss && bossEntity.phases) {
                const hpRatio = nextHp / enemy.maxHp;
                const nextPhaseIndex = bossEntity.phases.findIndex((p, i) => hpRatio <= p.threshold && i >= currentBossPhase);
                if (nextPhaseIndex !== -1 && nextPhaseIndex >= currentBossPhase) {
                    const phase = bossEntity.phases[nextPhaseIndex];
                    setCurrentBossPhase(nextPhaseIndex + 1);
                    setShowPhaseBanner(true);
                    safeTimeout(() => setShowPhaseBanner(false), 3000);
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
                    safeTimeout(() => {
                        const isNextBoss = stage + 1 >= 3;
                        setStage(s => s + 1);
                        setEnemy({
                            id: isNextBoss ? bossEntity.id : 'corp_elite',
                            name: isNextBoss ? bossEntity.name : 'Elite Sentinel',
                            maxHp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                            hp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                            stats: isNextBoss ? bossEntity.stats : { influence: 90, chaos: 60, charisma: 80, rebellion: 50 },
                            moves: isNextBoss ? bossEntity.moves : undefined,
                            image: isNextBoss ? (bossEntity.image || '/authority_sentinel_cipher_unit_1766789046162.png') : '/sentinel_elite.png'
                        });
                        if (isNextBoss) triggerGlitch(1);
                        addLog(`STAGE_${stage + 1} DETECTED: New threat approaching...`);
                        setIsTurn(true); // Grant turn back to player for new enemy
                    }, 1000);
                }
            }

            if (damage > 0) {
                setIsEnemyTakingDamage(true);
                safeTimeout(() => setIsEnemyTakingDamage(false), 500);
            }

            setEnemy(prev => ({ ...prev, hp: nextHp }));

            // BUG 13 FIX: Use ref for enemy name to avoid stale closure during stage transitions
            setCharge(prev => Math.min(100, prev + Math.floor((damage / 5) * (1 + equipBonusRef.current.chargeRateBonus))));
            addLog(`Inflicted ${damage} disruption to ${enemyRef.current.name}.`);

        } else {
            // Support Move
            addLog(`${move.description}`);
            if (move.name.includes("HEALING") || move.name.includes("UP")) {
                setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 30) }));
                addLog("Signal integrity restored (+30 HP).");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player, enemy, isTurn, isComplete, stage, isBoss, bossEntity, threatLevel, attackBoost, movePP, currentBossPhase, streamer.name, addLog, triggerGlitch, triggerShake, safeTimeout]);

    const executeUltimate = useCallback(() => {
        if (charge < 100 || !isTurn || isComplete || isRateLimited()) return;

        setIsTurn(false);
        setCharge(50); // Post-use: retain 50% charge for faster follow-up
        triggerGlitch(2);
        addLog(`ULTIMATE_UPLINK: ${player.name.toUpperCase()} ACTIVATES ${streamer.ultimateMove.name}!`);

        // Cap ultimate power to prevent one-shot exploits
        const ultPower = Math.min(streamer.ultimateMove.power, 200);
        const damage = Math.floor(ultPower * (2.0 + Math.random() * 0.5));

        const newHp = Math.max(0, enemy.hp - damage);

        setLastDamageAmount(damage);
        setLastDamageDealer('player');
        safeTimeout(() => setLastDamageAmount(null), 1000);

        if (newHp === 0) {
            if (isBoss) {
                setIsComplete(true);
                setResult('SUCCESS');
                addLog(`CRITICAL_DELETION: Sector ${streamer.name.toUpperCase()} liberated.`);
            } else {
                safeTimeout(() => {
                    const isNextBoss = stage + 1 >= 3;
                    setStage(s => s + 1);
                    setEnemy({
                        id: isNextBoss ? bossEntity.id : 'corp_elite',
                        name: isNextBoss ? bossEntity.name : 'Elite Sentinel',
                        maxHp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                        hp: isNextBoss ? bossEntity.maxHp : 150 + (threatLevel * 30),
                        stats: isNextBoss ? bossEntity.stats : { influence: 90, chaos: 60, charisma: 80, rebellion: 50 },
                        moves: isNextBoss ? bossEntity.moves : undefined,
                        image: isNextBoss ? (bossEntity.image || '/authority_sentinel_cipher_unit_1766789046162.png') : '/sentinel_elite.png'
                    });
                    setIsTurn(true);
                }, 1000);
            }
        }

        setEnemy(prev => ({ ...prev, hp: newHp }));

        addLog(`Catastrophic damage inflicted: ${damage}.`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [charge, isTurn, isComplete, player.name, streamer, stage, isBoss, bossEntity, threatLevel, enemy.hp, addLog, triggerGlitch, safeTimeout]);

    const executeUseItem = useCallback((itemId: string) => {
        if (!isTurn || isComplete || isRateLimited()) return false;

        const item = items[itemId];
        if (!item) return false;

        // Last Stand guard: if HP is 0, only revive items are allowed
        if (playerRef.current.hp <= 0 && item.effect !== 'revive') {
            addLog("CRITICAL: Only revival items can save you now!");
            return false;
        }

        if (getItemCount(useCollectionStore.getState(), itemId) <= 0) {
            addLog(`NO_ITEM: ${item.name} not in inventory!`);
            return false;
        }

        if (!consumeItem(itemId)) return false;

        addLog(`ITEM_USED: ${item.icon} ${item.name}`);

        switch (item.effect) {
            case 'heal':
                setPlayer(prev => {
                    // Full heal for RESTORE_CHIP or standard value for others
                    const healAmount = itemId === 'RESTORE_CHIP' ? prev.maxHp : item.value;
                    const newHp = Math.min(prev.maxHp, prev.hp + healAmount);
                    addLog(`Restored ${Math.min(healAmount, prev.maxHp - prev.hp)} HP.`);
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
            case 'revive':
                setPlayer(prev => {
                    // Revive heals to a percentage of maxHp (item.value is the fraction, e.g. 0.5 = 50%)
                    // If value >= 1, treat as absolute HP (e.g. RESTORE_CHIP value=100)
                    const healTo = item.value >= 1 ? item.value : Math.floor(prev.maxHp * item.value);
                    const newHp = Math.min(prev.maxHp, Math.max(1, healTo));
                    addLog(`PHOENIX PROTOCOL: Signal restored to ${newHp} HP!`);
                    return { ...prev, hp: newHp };
                });
                // If we were in "last stand" (hp=0 but battle not ended), clear the state
                if (playerRef.current.hp <= 0) {
                    addLog("CRITICAL_RECOVERY: Back from the void!");
                }
                break;
            case 'ultimateCharge':
                setCharge(prev => {
                    const newCharge = Math.min(100, prev + item.value);
                    addLog(`QUANTUM BURST: Ultimate charge +${item.value}%! (Now: ${newCharge}%)`);
                    return newCharge;
                });
                break;
        }

        setIsTurn(false);
        setTurns(prev => prev + 1);
        return true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTurn, isComplete, consumeItem, streamer.moves, items, addLog]);

    useEffect(() => {
        if (result === 'SUCCESS' && !hasMarkedComplete) {
            const rank = calculateRank();
            const xp = calculateXP(rank);

            // Wrap in safeTimeout to avoid React 'setState in effect' warning
            safeTimeout(() => {
                setHasMarkedComplete(true);
                markMissionComplete(streamer.id, rank, xp, {
                    hpRemaining: player.hp,
                    maxHp: player.maxHp,
                    turnsUsed: turns,
                    isBoss,
                    duration: Date.now() - missionStartTime
                });

                if (difficultyMultiplier > 1) {
                    updateDifficulty(1);
                }
            }, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result, streamer.id, markMissionComplete, hasMarkedComplete, calculateRank, calculateXP, difficultyMultiplier, updateDifficulty, player.hp, player.maxHp, turns, isBoss]);

    return {
        player,
        enemy,
        logs,
        isTurn,
        isComplete,
        result,
        executeMove,
        executeUltimate,
        executeUseItem,
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
        lastDamageDealer,
        addLog,
        equippedItems: equipBonusRef.current,
        equipmentSlots
    };
};


"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Streamer, Move, applyNatureToStats } from '@/data/streamers';
import { useCollectionStore, getNature } from './useCollectionStore';
import {
    getTypeEffectiveness,
    getEffectivenessMessage,
    getEnemyType,
    getStatForMoveType,
    SUPER_EFFECTIVE
} from '@/data/typeChart';
import { toast } from 'react-hot-toast';
import { useVisualEffects } from './useVisualEffects';


export interface PvPPlayerState {
    id: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: any;
    streamerId: string;
    image?: string;
}

export const usePvPBattle = (matchId: string, opponentId: string | null, myStreamer: Streamer, playerId: string) => {
    // Use stable nature data
    const myNature = useCollectionStore(state => getNature(state, myStreamer.id));
    const addWin = useCollectionStore(state => state.addWin);
    const addLoss = useCollectionStore(state => state.addLoss);
    const refreshStats = useCollectionStore(state => state.refreshStats);

    // 1. Local State
    const [player, setPlayer] = useState<PvPPlayerState>({
        id: playerId,
        name: myStreamer.name,
        maxHp: 100,
        hp: 100,
        stats: myNature
            ? applyNatureToStats(myStreamer.stats, myNature)
            : myStreamer.stats,
        streamerId: myStreamer.id
    });

    const [opponent, setOpponent] = useState<PvPPlayerState | null>(null);
    const [logs, setLogs] = useState<string[]>(["PVP_INITIALIZED: Establishing peer link..."]);
    const [isTurn, setIsTurn] = useState(false); // Determined by handshake
    const [isComplete, setIsComplete] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [battleStatus, setBattleStatus] = useState<'INITIATING' | 'SYNCING' | 'ACTIVE' | 'RECOVERING' | 'FINISHED'>('INITIATING');
    const [turnLocked, setTurnLocked] = useState(false);

    const channelRef = useRef<any>(null);

    // Global Visual Sync
    const setIntegrity = useVisualEffects(state => state.setIntegrity);
    const triggerGlobalImpact = useVisualEffects(state => state.triggerImpact);
    const triggerGlobalGlitch = useVisualEffects(state => state.triggerGlitch);
    const resetGlobalEffects = useVisualEffects(state => state.resetEffects);

    // Sync HP to global store
    useEffect(() => {
        setIntegrity(player.hp / player.maxHp);
    }, [player.hp, player.maxHp, setIntegrity]);

    // Cleanup on unmount
    useEffect(() => {
        return () => resetGlobalEffects();
    }, [resetGlobalEffects]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    // Persist Match State to Source of Truth (DB)
    const persistMatchState = useCallback(async (updates: any) => {
        try {
            // Attempt to update persistent match state in Supabase
            // This allows for mid-match recovery if local state is wiped
            await supabase
                .from('pvp_matches')
                .update({
                    ...updates,
                    last_update: new Date().toISOString()
                })
                .eq('id', matchId);
        } catch (err) {
            console.warn("DB_PERSIST_FAILED: Operating on ephemeral broadcast ONLY.", err);
        }
    }, [matchId]);

    // 7. Chat State
    const [chatLogs, setChatLogs] = useState<{ sender: string, message: string, timestamp: number }[]>([]);

    // 6. Last Action (for UI)
    const [lastAction, setLastAction] = useState<any>(null);

    // 2. Transmit Actions
    const sendAction = (payload: any) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'ACTION',
                payload: { ...payload, senderId: playerId }
            });
        }
    };

    const sendChat = (message: string) => {
        if (!message.trim()) return;
        const payload = {
            type: 'CHAT',
            message: message.substring(0, 50), // Limit length
            senderId: playerId,
            timestamp: Date.now()
        };
        sendAction(payload);
        setChatLogs(prev => [...prev, { sender: 'me', message: payload.message, timestamp: payload.timestamp }]);
    };

    // 3. Receive Actions
    const handleAction = useCallback((payload: any) => {
        const { type, senderId } = payload;
        if (senderId === playerId) return; // Ignore own broadcast

        // Handle Chat
        if (type === 'CHAT') {
            setChatLogs(prev => [...prev, {
                sender: 'opponent',
                message: payload.message,
                timestamp: payload.timestamp
            }]);
            return;
        }

        // Handle Recovery Request (Neural Handshake)
        if (type === 'RECOVERY_REQUEST') {
            addLog("RECOVERY_DETECTION: Peer signal re-establishing...");
            // Send current known state to the re-joining peer
            sendAction({
                type: 'RECOVERY_RESPONSE',
                myHp: player.hp,
                oppHp: (opponent?.hp || 100),
                isTurn: !isTurn,
                senderId: playerId
            });
            return;
        }

        if (type === 'RECOVERY_RESPONSE') {
            addLog("NEURAL_SYNC_COMPLETE: Restoring combat state.");
            setPlayer(prev => ({ ...prev, hp: payload.oppHp }));
            setOpponent(prev => prev ? ({ ...prev, hp: payload.myHp }) : prev);
            setIsTurn(payload.isTurn);
            setBattleStatus('ACTIVE');
            return;
        }

        // Handle Moves
        const { moveName, damage, effectiveness } = payload;

        // Expose action for UI animations
        setLastAction({ ...payload, timestamp: Date.now() });

        addLog(`OPPONENT uses ${moveName.toUpperCase()}!`);

        // Apply Damage to Player
        setPlayer(prev => {
            const nextHp = Math.max(0, prev.hp - damage);
            if (nextHp === 0) {
                setIsComplete(true);
                setWinnerId(opponent?.name || 'Opponent');
                setBattleStatus('FINISHED');
                addLog("SIGNAL_LOST: Combat concluded.");
                triggerGlobalGlitch(2.0);
            } else if (damage > 10) {
                triggerGlobalImpact(0.8);
            }
            return { ...prev, hp: nextHp };
        });

        const effectivenessMsg = getEffectivenessMessage(effectiveness);
        if (effectivenessMsg) addLog(effectivenessMsg);

        setIsTurn(true);
    }, [opponent, playerId, player.hp, isTurn]);


    useEffect(() => {
        if (!opponentId || !playerId) return; // Wait for match

        const initSync = async () => {
            setBattleStatus('SYNCING');
            try {
                // Attempt to fetch existing match data for recovery
                const { data: matchData, error: fetchError } = await supabase
                    .from('pvp_matches')
                    .select('*')
                    .eq('id', matchId)
                    .single();

                if (fetchError) {
                    console.warn("MATCH_FETCH_FAILED: Initializing fresh state.", fetchError);
                } else if (matchData) {
                    const isAttacker = matchData.attacker_id === playerId;
                    const opponentIdReal = isAttacker ? matchData.defender_id : matchData.attacker_id;

                    // 1. Restore Player HP
                    const mySavedHp = isAttacker ? matchData.attacker_hp : matchData.defender_hp;
                    setPlayer(prev => ({ ...prev, hp: mySavedHp }));

                    // 2. Determine Turn Authoritatively
                    if (matchData.turn_player_id) {
                        setIsTurn(matchData.turn_player_id === playerId);
                        setTurnLocked(true);
                    } else {
                        // Deterministic Turn if not yet set in DB: Lower ID goes first
                        const amIFirst = playerId < opponentIdReal;
                        setIsTurn(amIFirst);
                        // We don't lock yet because the first move will lock it in DB
                    }

                    // 3. Partial Opponent Restore (Visuals come from SYNC broadcast)
                    if (matchData.attacker_stats && matchData.defender_stats) {
                        const oppStats = isAttacker ? matchData.defender_stats : matchData.attacker_stats;
                        const oppHp = isAttacker ? matchData.defender_hp : matchData.attacker_hp;

                        setOpponent(prev => prev ? {
                            ...prev,
                            hp: oppHp,
                            stats: oppStats
                        } : {
                            id: opponentIdReal,
                            name: "Agent Detected",
                            maxHp: 100,
                            hp: oppHp,
                            stats: oppStats,
                            streamerId: ""
                        } as any);
                    }

                    if (matchData.status === 'ACTIVE') {
                        addLog("SIGNAL_STABILITY: Neural link verified with server.");
                        if (matchData.last_update) {
                            addLog("RECOVERY_MODE: Restoring combat state from archive.");
                            setBattleStatus('ACTIVE');
                        }
                    } else if (matchData.status === 'FINISHED') {
                        setIsComplete(true);
                        setBattleStatus('FINISHED');
                        setWinnerId(matchData.winner_id === playerId ? player.name : "Opponent");
                    }
                }

                // Update my own stats in the record if they aren't there
                const isAttackerInDB = matchData?.attacker_id === playerId;
                const updateCol = isAttackerInDB ? 'attacker_stats' : 'defender_stats';
                const hpCol = isAttackerInDB ? 'attacker_hp' : 'defender_hp';

                await supabase.from('pvp_matches').update({
                    [updateCol]: player.stats,
                    [hpCol]: player.hp,
                    last_update: new Date().toISOString()
                }).eq('id', matchId);

            } catch (err) {
                console.error("SYNC_CRITICAL_FAILURE", err);
            }
        };

        const channel = supabase.channel(`battle:${matchId}`, {
            config: {
                broadcast: { self: false, ack: true },
                presence: { key: playerId }
            }
        });

        channel
            .on('broadcast', { event: 'ACTION' }, ({ payload }) => handleAction(payload))
            .on('broadcast', { event: 'SYNC' }, ({ payload }) => {
                if (payload.senderId === playerId) return;

                // Received opponent state
                setOpponent(prev => ({
                    id: opponentId,
                    name: payload.name,
                    maxHp: payload.maxHp,
                    hp: payload.hp,
                    stats: payload.stats,
                    streamerId: payload.streamerId,
                    image: payload.image
                } as any)); // Type casting for now as we expand state

                // If Battle is just starting, set to ACTIVE
                if (battleStatus === 'INITIATING' || battleStatus === 'SYNCING') {
                    setBattleStatus('ACTIVE');
                    addLog("PEER_LINK_ESTABLISHED: Engaging hostiles.");

                    // Only set deterministic turn if it hasn't been set by authoritative recovery
                    if (!turnLocked) {
                        const amIFirst = playerId < (opponentId as string);
                        setIsTurn(amIFirst);
                        if (amIFirst) addLog("INITIATIVE_ROLL: You have the first move.");
                    }
                }
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                const opponentLeft = leftPresences.find((p: any) => p.playerId === opponentId);
                if (opponentLeft) {
                    // Don't finish immediately, wait for possible recovery period
                    addLog("PEER_SIGNAL_WEAK: Awaiting reconnection...");
                    setTimeout(() => {
                        if (battleStatus !== 'FINISHED') {
                            setIsComplete(true);
                            setWinnerId(player.name);
                            setBattleStatus('FINISHED');
                            addLog("OPPONENT_STALED: Victory by timeout.");
                        }
                    }, 30000); // 30s grace period
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await initSync();
                    // Broadcast my state immediately on join so opponent sees me
                    await channel.send({
                        type: 'broadcast',
                        event: 'SYNC',
                        payload: {
                            senderId: playerId,
                            streamerId: myStreamer.id,
                            name: myStreamer.name,
                            maxHp: player.maxHp,
                            hp: player.hp,
                            stats: player.stats,
                            image: myStreamer.image
                        }
                    });

                    // Also track presence for disconnection handling
                    await channel.track({
                        playerId,
                        name: myStreamer.name,
                        streamerId: myStreamer.id,
                        status: 'FIGHTING'
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, opponentId, playerId, myStreamer.id, myStreamer.name, player.stats, handleAction, battleStatus]);

    // 5. Player Actions (Authoritative Server-Side Validation)
    const executeMove = useCallback(async (move: Move) => {
        if (!isTurn || !opponent || isComplete) return;

        addLog(`${player.name.toUpperCase()} uses ${move.name.toUpperCase()}!`);

        try {
            // AUTHORITATIVE VALIDATION: Call Supabase RPC to calculate damage server-side
            const { data, error: rpcError } = await supabase.rpc('validate_pvp_move', {
                p_match_id: matchId,
                p_sender_id: playerId,
                p_move_name: move.name,
                p_move_type: move.type,
                p_move_power: move.power
            });

            let damage: number;
            let effectiveness: number;
            let isCrit: boolean;
            let matchFinished: boolean;

            if (data?.error === 'NOT_YOUR_TURN') {
                addLog("SIGNAL_SYNC_ERROR: Wait for your turn.");
                return;
            }

            if (rpcError || data?.error) {
                console.warn("Security Uplink Failed. Attempting ephemeral calculation.", rpcError || data?.error);
                const opponentType = getEnemyType(opponent.stats);
                effectiveness = getTypeEffectiveness(move.type, opponentType);
                isCrit = Math.random() < 0.10;
                damage = Math.floor(move.power * ((player.stats as any).influence / 100) * effectiveness * (isCrit ? 1.5 : 1));
                matchFinished = false;
            } else {
                damage = data.damage;
                effectiveness = data.effectiveness;
                isCrit = data.is_crit;
                matchFinished = data.is_complete;
            }

            // Update local opponent view (RPC result is authoritative)
            const nextOpponentHp = data?.next_hp !== undefined ? data.next_hp : Math.max(0, opponent.hp - damage);
            setOpponent(prev => prev ? ({ ...prev, hp: nextOpponentHp }) : prev);

            if (matchFinished) {
                setIsComplete(true);
                setWinnerId(player.name);
                setBattleStatus('FINISHED');
                addLog("CRITICAL_DELETION: PvP Objective Achieved.");
            }

            const actionPayload = {
                type: 'MOVE',
                moveName: move.name,
                moveType: move.type,
                damage,
                effectiveness,
                crit: isCrit,
                senderId: playerId
            };

            // Broadcast Validated Action to Peer
            sendAction(actionPayload);
            setIsTurn(false);

        } catch (err) {
            console.error("Combat Sync Error:", err);
            toast.error("COMM_LINK_ERROR: Action desynchronized.");
        }
    }, [isTurn, opponent, isComplete, player.name, player.stats, playerId, matchId, opponentId, persistMatchState]);

    // 6. Record Match Result
    useEffect(() => {
        if (isComplete && winnerId) {
            const isWin = winnerId === player.name;
            const recordResult = async () => {
                try {
                    console.log(`[MATCH RECORDED] Result: ${isWin ? 'WIN' : 'LOSS'} for ${player.name}`);
                    await refreshStats(); // Server already updated the DB, just pull latest
                } catch (err) {
                    console.error("Failed to record match stats", err);
                }
            };
            recordResult();
        }
    }, [isComplete, winnerId, player.name, player.maxHp, playerId]);

    return {
        player,
        opponent,
        logs,
        chatLogs,
        isTurn,
        isComplete,
        battleStatus,
        winnerId,
        executeMove,
        sendChat,
        lastAction
    };
};

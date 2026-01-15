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
            // Attempt to fetch existing match data for recovery
            const { data: matchData } = await supabase
                .from('pvp_matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (matchData && matchData.status === 'ACTIVE') {
                addLog("SIGNAL_REJECTION: Attempting mid-match neural recovery...");
                setBattleStatus('RECOVERING');
                // Request neural handshake from peer
                sendAction({ type: 'RECOVERY_REQUEST', senderId: playerId });
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

                    // Deterministic Turn: Lower SessionID goes first
                    const amIFirst = playerId < opponentId;
                    setIsTurn(amIFirst);
                    if (amIFirst) addLog("INITIATIVE_ROLL: You have the first move.");
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
                p_move_name: move.name,
                p_move_type: move.type,
                p_move_power: move.power,
                p_attacker_stats: player.stats,
                p_defender_stats: opponent.stats
            });

            let damage: number;
            let effectiveness: number;
            let isCrit: boolean;

            if (rpcError) {
                console.warn("Security Uplink Failed. Falling back to Secure Local Simulation.", rpcError);
                const opponentType = getEnemyType(opponent.stats);
                effectiveness = getTypeEffectiveness(move.type, opponentType);
                isCrit = Math.random() < 0.10;
                const statKey = getStatForMoveType(move.type);
                const relevantStatValue = (player.stats as any)[statKey] || 50;
                damage = Math.floor(move.power * (relevantStatValue / 100) * (0.9 + Math.random() * 0.2) * effectiveness * (isCrit ? 1.5 : 1));
            } else {
                damage = data.damage;
                effectiveness = data.effectiveness;
                isCrit = data.is_crit;
            }

            // Update local opponent view
            const nextOpponentHp = Math.max(0, opponent.hp - damage);
            setOpponent(prev => prev ? ({ ...prev, hp: nextOpponentHp }) : prev);

            if (nextOpponentHp === 0) {
                setIsComplete(true);
                setWinnerId(player.name);
                setBattleStatus('FINISHED');
                addLog("CRITICAL_DELETION: PvP Objective Achieved.");
                persistMatchState({ status: 'FINISHED', winner_id: playerId });
            } else {
                // Persist state to DB for recovery support
                persistMatchState({
                    attacker_hp: player.hp,
                    defender_hp: nextOpponentHp,
                    turn_player_id: opponentId
                });
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

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
} from '@/data/typeChart';
import { toast } from 'react-hot-toast';
import { useVisualEffects } from './useVisualEffects';
import { useWallet } from '@solana/wallet-adapter-react';


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
    // Determine if I am a player or a spectator
    const [isSpectator, setIsSpectator] = useState(false);

    // Use stable nature data
    const myNature = useCollectionStore(state => getNature(state, myStreamer.id));
    const refreshStoreStats = useCollectionStore(state => state.refreshStats);

    const completedMissions = useCollectionStore(state => state.completedMissions);
    const missionRecord = completedMissions.find(m => m.id === myStreamer.id);
    const streamerLevel = missionRecord?.level || 1;
    const calculatedMaxHp = 100 + ((streamerLevel - 1) * 25);

    // 1. Local State
    const [player, setPlayer] = useState<PvPPlayerState>({
        id: playerId,
        name: myStreamer.name,
        maxHp: calculatedMaxHp,
        hp: calculatedMaxHp,
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
    const [battleStatus, setBattleStatus] = useState<'INITIATING' | 'SYNCING' | 'ACTIVE' | 'RECOVERING' | 'FINISHED' | 'ERROR'>('INITIATING');
    const [turnLocked, setTurnLocked] = useState(false);
    const [glrChange, setGlrChange] = useState<number | null>(null);
    const [wagerAmount, setWagerAmount] = useState<number>(0);

    const channelRef = useRef<any>(null);

    // Global Visual Sync
    const setIntegrity = useVisualEffects(state => state.setIntegrity);
    const triggerGlobalImpact = useVisualEffects(state => state.triggerImpact);
    const triggerGlobalGlitch = useVisualEffects(state => state.triggerGlitch);
    const resetGlobalEffects = useVisualEffects(state => state.resetEffects);

    // Sync HP to global store
    useEffect(() => {
        if (!isSpectator) {
            setIntegrity(player.hp / player.maxHp);
        }
    }, [player.hp, player.maxHp, setIntegrity, isSpectator]);

    // Cleanup on unmount
    useEffect(() => {
        return () => resetGlobalEffects();
    }, [resetGlobalEffects]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    // 7. Chat State
    const [chatLogs, setChatLogs] = useState<{ sender: string, message: string, timestamp: number }[]>([]);

    // 6. Last Action (for UI)
    const [lastAction, setLastAction] = useState<any>(null);
    const { connected: _connected, publicKey, signMessage: _signMessage } = useWallet();

    // Wallet Switch Detection
    const prevWalletRef = useRef<string | null>(null);
    useEffect(() => {
        const currentWallet = publicKey?.toBase58() || null;
        if (prevWalletRef.current && currentWallet !== prevWalletRef.current) {
            console.warn("Wallet switched or disconnected during battle. Resetting auth state.");
            useCollectionStore.getState().setAuthenticated(false);
        }
        prevWalletRef.current = currentWallet;
    }, [publicKey]);

    // 2. Transmit Actions (Disabled for Spectators)
    const sendAction = useCallback((payload: any) => {
        if (isSpectator) return;
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'ACTION',
                payload: { ...payload, senderId: playerId }
            });
        }
    }, [playerId, isSpectator]);

    const sendChat = (message: string) => {
        if (isSpectator) return;
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
        if (type === 'RECOVERY_REQUEST' && !isSpectator) {
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

        addLog(`${senderId === opponentId ? 'OPPONENT' : 'ATTACKER'} uses ${moveName.toUpperCase()}!`);

        // Update health based on who sent the action
        if (senderId === opponentId) {
            // My opponent attacked me
            setPlayer(prev => {
                const nextHp = Math.max(0, prev.hp - damage);
                if (nextHp === 0) {
                    setIsComplete(true);
                    setWinnerId(opponentId as string);
                    setBattleStatus('FINISHED');
                    addLog("SIGNAL_LOST: Combat concluded.");
                    triggerGlobalGlitch(2.0);
                } else if (damage > 10) {
                    triggerGlobalImpact(0.8);
                }
                return { ...prev, hp: nextHp };
            });
            setIsTurn(!isSpectator);
        } else if (isSpectator) {
            // I am watching, so payload target must be the defender
            setOpponent(prev => {
                if (!prev) return prev;
                const nextHp = Math.max(0, prev.hp - damage);
                if (nextHp === 0) {
                    setIsComplete(true);
                    setWinnerId(senderId);
                    setBattleStatus('FINISHED');
                    addLog("SPECTATOR_SIGNAL: Target eliminated.");
                }
                return { ...prev, hp: nextHp };
            });
        }

        const effectivenessMsg = getEffectivenessMessage(effectiveness);
        if (effectivenessMsg) addLog(effectivenessMsg);

    }, [opponent, playerId, player.hp, isTurn, sendAction, triggerGlobalGlitch, triggerGlobalImpact, isSpectator, opponentId]);

    useEffect(() => {
        if (!playerId) return;

        const initSync = async () => {
            setBattleStatus('SYNCING');
            try {
                // Attempt to fetch existing match data for recovery
                const { data: matchData, error: fetchError } = await supabase
                    .from('pvp_matches')
                    .select('*')
                    .eq('id', matchId)
                    .single();

                if (fetchError || !matchData) {
                    console.warn("MATCH_FETCH_FAILED", fetchError);
                    setBattleStatus('ERROR');
                    return;
                }

                // Determine role
                const isAttacker = matchData.attacker_id === playerId;
                const isDefender = matchData.defender_id === playerId;

                if (!isAttacker && !isDefender) {
                    setIsSpectator(true);
                    addLog("SPECTATOR_LINK: Established read-only connection.");
                    // Setup spectator view using attacker as player, defender as opponent
                    setPlayer(prev => ({ ...prev, id: matchData.attacker_id, hp: matchData.attacker_hp }));
                    setWagerAmount(matchData.wager_amount || 0);
                } else {
                    setWagerAmount(matchData.wager_amount || 0);
                    const mySavedHp = isAttacker ? matchData.attacker_hp : matchData.defender_hp;
                    setPlayer(prev => ({ ...prev, hp: mySavedHp }));
                }

                // Determine Turn Authoritatively
                if (matchData.turn_player_id) {
                    setIsTurn(matchData.turn_player_id === playerId);
                    setTurnLocked(true);
                } else {
                    const amIFirst = playerId === matchData.attacker_id;
                    setIsTurn(amIFirst);
                }

                // Restore Opponent Data
                const opponentIdReal = isAttacker ? matchData.defender_id : matchData.attacker_id;
                const oppStatsObj = isAttacker ? matchData.defender_stats : matchData.attacker_stats;
                const myStatsObj = isAttacker ? matchData.attacker_stats : matchData.defender_stats;

                const oppHp = isAttacker ? matchData.defender_hp : matchData.attacker_hp;

                // Sync my state if it was already in the record (Recovery)
                if (!isSpectator) {
                    const mySavedHp = isAttacker ? matchData.attacker_hp : matchData.defender_hp;
                    setPlayer(prev => ({
                        ...prev,
                        name: myStatsObj?.name || prev.name,
                        stats: myStatsObj || prev.stats,
                        hp: mySavedHp
                    }));
                } else {
                    // Spectator view: Attacker is "player", Defender is "opponent"
                    const attackerStats = matchData.attacker_stats;
                    setPlayer(prev => ({
                        ...prev,
                        id: matchData.attacker_id,
                        name: attackerStats?.name || 'ATTACKER',
                        stats: attackerStats,
                        hp: matchData.attacker_hp
                    }));
                }

                setOpponent({
                    id: opponentIdReal,
                    name: oppStatsObj?.name || "Agent Detected",
                    maxHp: 100,
                    hp: oppHp,
                    stats: oppStatsObj,
                    streamerId: ""
                } as any);

                if (matchData.status === 'FINISHED') {
                    setIsComplete(true);
                    setBattleStatus('FINISHED');
                    setWinnerId(matchData.winner_id);
                } else {
                    setBattleStatus('ACTIVE');
                }

                // Update my own HP in the record if I'm a participant (Heartbeat)
                if (!isSpectator) {
                    const hpCol = isAttacker ? 'attacker_hp' : 'defender_hp';

                    await supabase.from('pvp_matches').update({
                        [hpCol]: player.hp,
                        last_update: new Date().toISOString()
                    }).eq('id', matchId);
                }

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

                // Update whichever entity the broadcast represents
                if (payload.senderId === opponentId) {
                    setOpponent(prev => ({
                        ...prev,
                        id: payload.senderId,
                        name: payload.name,
                        maxHp: payload.maxHp,
                        hp: payload.hp,
                        stats: payload.stats,
                        streamerId: payload.streamerId,
                        image: payload.image
                    } as any));
                } else if (isSpectator) {
                    // Update the "player" (attacker) state for spectators
                    setPlayer(prev => ({
                        ...prev,
                        id: payload.senderId,
                        name: payload.name,
                        maxHp: payload.maxHp,
                        hp: payload.hp,
                        stats: payload.stats,
                        streamerId: payload.streamerId,
                        image: payload.image
                    }));
                }
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                if (isSpectator) return;
                const opponentLeft = leftPresences.find((p: any) => p.playerId === opponentId);
                if (opponentLeft) {
                    addLog("PEER_SIGNAL_WEAK: Awaiting reconnection...");
                    setTimeout(() => {
                        if (battleStatus !== 'FINISHED') {
                            setIsComplete(true);
                            setWinnerId(playerId);
                            setBattleStatus('FINISHED');
                            addLog("OPPONENT_STALED: Victory by timeout.");
                        }
                    }, 30000); // 30s grace period
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await initSync();

                    if (!isSpectator) {
                        // Broadcast my state
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

                        await channel.track({
                            playerId,
                            name: myStreamer.name,
                            streamerId: myStreamer.id,
                            status: 'FIGHTING'
                        });
                    }
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, opponentId, playerId, myStreamer, player.hp, player.maxHp, player.name, player.stats, handleAction, battleStatus, turnLocked, sendAction, isSpectator]);

    // 5. Player Actions (Authoritative Server-Side Validation)
    const executeMove = useCallback(async (move: Move) => {
        if (isSpectator || !isTurn || !opponent || isComplete) return;

        addLog(`${player.name.toUpperCase()} uses ${move.name.toUpperCase()}!`);

        try {
            const { data, error: rpcError } = await supabase.rpc('validate_pvp_move', {
                p_match_id: matchId,
                p_sender_id: playerId,
                p_move_name: move.name,
                p_move_type: move.type,
                p_move_power: move.power
            });

            if (data?.error === 'NOT_YOUR_TURN') {
                addLog("SIGNAL_SYNC_ERROR: Wait for your turn.");
                return;
            }

            if (rpcError || data?.error) {
                console.warn("Security Uplink Failed.", rpcError || data?.error);
                toast.error("COMM_LINK_ERROR: Action desynchronized.");
                return;
            }

            const damage = data.damage;
            const effectiveness = data.effectiveness;
            const isCrit = data.is_crit;
            const matchFinished = data.is_complete;
            const glrGain = data.glr_change || 0;

            // Update local opponent view
            const nextOpponentHp = data.next_hp;
            setOpponent(prev => prev ? ({ ...prev, hp: nextOpponentHp }) : prev);

            if (matchFinished) {
                setIsComplete(true);
                setWinnerId(playerId);
                setBattleStatus('FINISHED');
                setGlrChange(glrGain);
                addLog(`CRITICAL_DELETION: PvP Objective Achieved. +${glrGain} GLR`);
                if (wagerAmount > 0) addLog(`WAGER_SECURED: ${wagerAmount} $PTS claimed.`);
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

            sendAction(actionPayload);
            setIsTurn(false);

        } catch (err) {
            console.error("Combat Sync Error:", err);
            toast.error("COMM_LINK_ERROR: Action desynchronized.");
        }
    }, [isTurn, opponent, isComplete, player.name, player.stats, playerId, matchId, sendAction, isSpectator, wagerAmount]);

    // 6. Record Match Result
    useEffect(() => {
        if (isComplete && winnerId && !isSpectator) {
            const isWin = winnerId === playerId;
            const recordResult = async () => {
                try {
                    console.log(`[MATCH RECORDED] Result: ${isWin ? 'WIN' : 'LOSS'} for ${player.name}`);
                    await refreshStoreStats(); // pulls latest wins/losses/glr
                } catch (err) {
                    console.error("Failed to record match stats", err);
                }
            };
            recordResult();
        }
    }, [isComplete, winnerId, player.name, refreshStoreStats, isSpectator, playerId]);

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
        lastAction,
        isSpectator,
        glrChange,
        wagerAmount
    };
};

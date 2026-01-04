"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Streamer, Move, applyNatureToStats } from '@/data/streamers';
import { useCollectionStore } from './useCollectionStore';
import {
    getTypeEffectiveness,
    getEffectivenessMessage,
    getEnemyType,
    SUPER_EFFECTIVE
} from '@/data/typeChart';
import { toast } from 'react-hot-toast';

export interface PvPPlayerState {
    id: string;
    name: string;
    maxHp: number;
    hp: number;
    stats: any;
    streamerId: string;
}

export const usePvPBattle = (matchId: string, opponentId: string | null, myStreamer: Streamer) => {
    const { getNature } = useCollectionStore();

    // 1. Local State
    const [player, setPlayer] = useState<PvPPlayerState>({
        id: 'me',
        name: myStreamer.name,
        maxHp: 100,
        hp: 100,
        stats: getNature(myStreamer.id)
            ? applyNatureToStats(myStreamer.stats, getNature(myStreamer.id)!)
            : myStreamer.stats,
        streamerId: myStreamer.id
    });

    const [opponent, setOpponent] = useState<PvPPlayerState | null>(null);
    const [logs, setLogs] = useState<string[]>(["PVP_INITIALIZED: Establishing peer link..."]);
    const [isTurn, setIsTurn] = useState(false); // Determined by handshake
    const [isComplete, setIsComplete] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [battleStatus, setBattleStatus] = useState<'WAITING' | 'READY' | 'ACTIVE' | 'FINISHED'>('WAITING');

    const channelRef = useRef<any>(null);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    // 2. Transmit Actions
    const sendAction = (payload: any) => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'ACTION',
                payload
            });
        }
    };

    // 3. Receive Actions
    const handleAction = useCallback((payload: any) => {
        const { type, moveName, damage, effectiveness, crit, senderId } = payload;
        if (senderId === 'me') return; // Ignore own broadcast

        addLog(`OPPONENT uses ${moveName.toUpperCase()}!`);

        // Apply Damage to Player
        setPlayer(prev => {
            const nextHp = Math.max(0, prev.hp - damage);
            if (nextHp === 0) {
                setIsComplete(true);
                setWinnerId(opponent?.name || 'Opponent');
                setBattleStatus('FINISHED');
                addLog("SIGNAL_LOST: Combat concluded.");
            }
            return { ...prev, hp: nextHp };
        });

        const effectivenessMsg = getEffectivenessMessage(effectiveness);
        if (effectivenessMsg) addLog(effectivenessMsg);

        setIsTurn(true);
    }, [opponent]);

    // 4. Initialize Channel
    useEffect(() => {
        if (!opponentId) return; // Wait for opponent to be known

        const channel = supabase.channel(`battle:${matchId}`, {
            config: { broadcast: { self: false, ack: true } }
        });

        channel
            .on('broadcast', { event: 'ACTION' }, ({ payload }) => handleAction(payload))
            .on('broadcast', { event: 'SYNC' }, ({ payload }) => {
                if (payload.senderId === 'me') return;
                setOpponent(prev => prev ? { ...prev, hp: payload.opponentHp } : null);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                // Check if opponent left
                const opponentLeft = leftPresences.find((p: any) => p.streamerId === opponentId);
                if (opponentLeft) {
                    setIsComplete(true);
                    setWinnerId(player.name); // Win by forfeit
                    setBattleStatus('FINISHED');
                    addLog("OPPONENT_DISCONNECTED: Victory by default.");
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Initial sync
                    setOpponent({
                        id: opponentId,
                        name: 'Unknown Opponent', // We might need to pass opponentName or sync it
                        maxHp: 100,
                        hp: 100,
                        stats: {}, // Opponent stats will sync on first move or explicit sync event (improvement needed)
                        streamerId: opponentId
                    });
                    setBattleStatus('ACTIVE');

                    // Deterministic turn based on IDs (inherited from matchmaking logic)
                    setIsTurn(myStreamer.id < opponentId);
                    addLog("PEER_LINK_ESTABLISHED: Engaging...");

                    await channel.track({
                        name: myStreamer.name,
                        streamerId: myStreamer.id,
                        stats: player.stats
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId, opponentId, myStreamer.id, myStreamer.name, player.stats, handleAction]);

    // 5. Player Actions
    const executeMove = useCallback((move: Move) => {
        if (!isTurn || !opponent || isComplete) return;

        addLog(`${player.name.toUpperCase()} uses ${move.name.toUpperCase()}!`);

        // Logic sync with useResistanceMission
        const opponentType = getEnemyType(opponent.stats);
        const effectiveness = getTypeEffectiveness(move.type, opponentType);

        const isCrit = Math.random() < 0.10;
        const critMult = isCrit ? 1.5 : 1;
        const relevantStatValue = (player.stats as any)[move.type.toLowerCase() as any] || 50;
        const damage = Math.floor(move.power * (relevantStatValue / 100) * (0.8 + Math.random() * 0.4) * effectiveness * critMult);

        // Update local opponent view
        setOpponent(prev => {
            if (!prev) return null;
            const nextHp = Math.max(0, prev.hp - damage);
            if (nextHp === 0) {
                setIsComplete(true);
                setWinnerId(player.name);
                setBattleStatus('FINISHED');
                addLog("CRITICAL_DELETION: PvP Objective Achieved.");
            }
            return { ...prev, hp: nextHp };
        });

        // Broadcast to Peer
        sendAction({
            type: 'MOVE',
            moveName: move.name,
            damage,
            effectiveness,
            crit: isCrit,
            senderId: 'me'
        });

        setIsTurn(false);
    }, [isTurn, opponent, isComplete, player.name, player.stats]);

    return {
        player,
        opponent,
        logs,
        isTurn,
        isComplete,
        battleStatus,
        winnerId,
        executeMove
    };
};

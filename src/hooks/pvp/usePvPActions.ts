
import { useCallback } from 'react';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Logger } from '@/lib/logger';
import { toast } from '@/hooks/useToastStore';
import { Move } from '@/data/streamers';
import { ValidateMoveResult, PvPPlayerState, PvPActionPayload } from '@/types/pvp';
import { useCollectionStore, getItemCount } from '../useCollectionStore';
import { useGameDataStore } from '../useGameDataStore';

interface UsePvPActionsProps {
    matchId: string;
    playerId: string;
    isSpectator: boolean;
    isTurn: boolean;
    isComplete: boolean;
    opponentId: string | null;
    wagerAmount: number;
    playerHp: number;
    streamerName: string;

    // Setters
    setIsTurn: (_val: boolean) => void;
    setPlayer: React.Dispatch<React.SetStateAction<PvPPlayerState>>;
    setOpponent: React.Dispatch<React.SetStateAction<PvPPlayerState | null>>;
    setIsComplete: (_val: boolean) => void;
    setWinnerId: (_val: string) => void;
    setBattleStatus: (_val: 'FINISHED') => void;
    setGlrChange: (_val: number) => void;
    setLastAction: React.Dispatch<React.SetStateAction<PvPActionPayload | null>>;
    addLog: (_msg: string) => void;
    addChat: (_sender: string, _msg: string, _ts: number) => void;

    // Socket
    sendAction: (_payload: PvPActionPayload) => void;
}

export const usePvPActions = ({
    matchId,
    playerId,
    isSpectator,
    isTurn,
    isComplete,
    opponentId: _opponentId,
    wagerAmount,
    playerHp: _playerHp,
    streamerName,
    setIsTurn,
    setPlayer,
    setOpponent,
    setIsComplete,
    setWinnerId,
    setBattleStatus,
    setGlrChange,
    setLastAction,
    addLog,
    addChat,
    sendAction
}: UsePvPActionsProps) => {

    const { items } = useGameDataStore();
    const consumeItem = useCollectionStore(state => state.useItem);

    const executeUseItem = useCallback((itemId: string): boolean => {
        if (isSpectator || !isTurn || !matchId || isComplete) return false;

        const item = items[itemId];
        if (!item) return false;

        const count = getItemCount(useCollectionStore.getState(), itemId);
        if (count <= 0) {
            toast.error("Out of Stock", `${item.name} depleted.`);
            return false;
        }

        // Bot matches: apply locally (non-competitive)
        if (matchId.startsWith('bot_match_')) {
            if (!consumeItem(itemId)) return false;

            let effectLog = '';
            switch (item.effect) {
                case 'heal':
                    setPlayer((prev: PvPPlayerState) => {
                        const healAmount = itemId === 'RESTORE_CHIP' ? prev.maxHp : item.value;
                        const newHp = Math.min(prev.maxHp, prev.hp + healAmount);
                        effectLog = `Restored ${newHp - prev.hp} HP`;
                        return { ...prev, hp: newHp };
                    });
                    break;
                default:
                    effectLog = `Used ${item.name}`;
            }

            addLog(`${streamerName.toUpperCase()} used ${item.name}: ${effectLog}`);
            setIsTurn(false);
            sendAction({ type: 'ITEM_USE', senderId: playerId, itemName: item.name, itemEffect: item.effect, itemValue: item.value });
            setLastAction({ type: 'ITEM_USE', senderId: playerId, timestamp: Date.now() });
            return true;
        }

        // Real matches: validate server-side
        setIsTurn(false);
        addLog(`${streamerName.toUpperCase()} uses ${item.name}...`);

        fetch('/api/pvp/validate-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, itemId }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    Logger.warn('PvPActions', 'Item validation failed', data.error);
                    toast.error("ITEM_REJECTED", data.error || "Item use denied by server.");
                    if (!isComplete) setIsTurn(true);
                    return;
                }

                // Server confirmed — apply canonical effect
                consumeItem(itemId);
                if (data.newHp !== undefined) {
                    setPlayer((prev: PvPPlayerState) => ({ ...prev, hp: data.newHp }));
                }
                addLog(`${streamerName.toUpperCase()} used ${item.name}: ${data.description}`);

                sendAction({
                    type: 'ITEM_USE',
                    senderId: playerId,
                    itemName: item.name,
                    itemEffect: item.effect,
                    itemValue: data.hpHealed ?? item.value,
                });
            })
            .catch((err) => {
                Logger.error('PvPActions', 'Item validation error', err);
                toast.error("COMM_LINK_ERROR", "Failed to validate item use.");
                if (!isComplete) setIsTurn(true);
            });

        return true;

    }, [isSpectator, isTurn, matchId, isComplete, items, consumeItem, setPlayer, streamerName, setIsTurn, sendAction, playerId, addLog, setLastAction]);

    const executeMove = useCallback(async (move: Move) => {
        if (isSpectator || !isTurn || !matchId || isComplete) return;

        // BOT SIMULATION
        if (matchId.startsWith('bot_match_')) {
            // ... (Bot logic handled in parent or separate bot hook to keep this clean? 
            // For now, let's keep it here or simplify.)
            // Let's implement full logic here for 10/10 completeness
            setIsTurn(false);
            addLog(`${streamerName.toUpperCase()} uses ${move.name.toUpperCase()}!`);

            // Calc damage
            const damage = Math.floor(move.power * (Math.random() * 0.4 + 0.8));
            const isCrit = Math.random() > 0.9;
            const finalDamage = isCrit ? damage * 2 : damage;

            setOpponent((prev: PvPPlayerState | null) => {
                if (!prev) return null;
                const nextHp = Math.max(0, prev.hp - finalDamage);
                if (nextHp === 0) {
                    setIsComplete(true);
                    setWinnerId(playerId);
                    setBattleStatus('FINISHED');
                    addLog("TARGET_NEUTRALIZED: Simulation Complete.");
                }
                return { ...prev, hp: nextHp };
            });

            setLastAction({
                type: 'MOVE',
                moveName: move.name,
                moveType: move.type,
                damage: finalDamage,
                senderId: playerId,
                timestamp: Date.now()
            });

            if (isCrit) addLog("CRITICAL_HIT: System Overload!");

            // Bot Response Timer would be triggered by parent effect on lastAction? 
            // Or handled here?
            return;
        }

        // REAL MATCH LOGIC
        setIsTurn(false);
        addLog(`${streamerName.toUpperCase()} uses ${move.name.toUpperCase()}!`);

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
                if (!isComplete) setIsTurn(true);
                return;
            }

            if (rpcError || data?.error) {
                Logger.warn('PvPActions', 'Security Uplink Failed', rpcError || data?.error);
                toast.error("COMM_LINK_ERROR", "Action desynchronized.");
                if (!isComplete) setIsTurn(true);
                return;
            }

            const result = data as ValidateMoveResult;

            // Optimistic update
            setOpponent((prev: PvPPlayerState | null) => prev ? ({ ...prev, hp: result.next_hp }) : prev);

            if (result.is_complete) {
                setIsComplete(true);
                setWinnerId(playerId);
                setBattleStatus('FINISHED');
                setGlrChange(result.glr_change || 0);
                addLog(`CRITICAL_DELETION: PvP Objective Achieved. +${result.glr_change} GLR`);
                if (wagerAmount > 0) addLog(`WAGER_SECURED: ${wagerAmount} $PTS claimed.`);
            }

            sendAction({
                type: 'MOVE',
                moveName: move.name,
                moveType: move.type,
                damage: result.damage,
                effectiveness: result.effectiveness,
                crit: result.is_crit,
                senderId: playerId
            });

        } catch (err) {
            Logger.error('PvPActions', 'Combat Sync Error', err);
            toast.error("COMM_LINK_ERROR", "Action desynchronized.");
            if (!isComplete) setIsTurn(true);
        }
    }, [isSpectator, isTurn, matchId, isComplete, playerId, streamerName, wagerAmount, sendAction,
        setIsTurn, setOpponent, setIsComplete, setWinnerId, setBattleStatus, setGlrChange, setLastAction, addLog]);

    const sendChat = useCallback((message: string) => {
        if (isSpectator || !message.trim()) return;
        const trimmedMsg = message.substring(0, 50);
        const ts = Date.now();

        sendAction({
            type: 'CHAT',
            message: trimmedMsg,
            senderId: playerId,
            timestamp: ts
        });

        addChat('me', trimmedMsg, ts);
    }, [isSpectator, playerId, sendAction, addChat]);

    return { executeMove, sendChat, executeUseItem };
};

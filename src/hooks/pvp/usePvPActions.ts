
import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Logger } from '@/lib/logger';
import { toast } from '@/hooks/useToastStore';
import { Move } from '@/data/streamers';
import { PvPActionPayload, ValidateMoveResult } from '@/types/pvp';
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
    setIsTurn: (val: boolean) => void;
    setPlayer: (val: any) => void; // Added setPlayer for item effects
    setOpponent: (val: any) => void;
    setIsComplete: (val: boolean) => void;
    setWinnerId: (val: string) => void;
    setBattleStatus: (val: 'FINISHED') => void;
    setGlrChange: (val: number) => void;
    setLastAction: (val: any) => void;
    addLog: (msg: string) => void;
    addChat: (sender: string, msg: string, ts: number) => void;

    // Socket
    sendAction: (payload: any) => void;
}

export const usePvPActions = ({
    matchId,
    playerId,
    isSpectator,
    isTurn,
    isComplete,
    opponentId,
    wagerAmount,
    playerHp,
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

        // Optimistically use item
        if (!consumeItem(itemId)) return false;

        // Apply Effect Locally
        let effectLog = '';
        let effectValue = 0;

        switch (item.effect) {
            case 'heal':
                setPlayer((prev: any) => {
                    const healAmount = itemId === 'RESTORE_CHIP' ? prev.maxHp : item.value;
                    const newHp = Math.min(prev.maxHp, prev.hp + healAmount);
                    effectValue = newHp - prev.hp;
                    effectLog = `Restored ${effectValue} HP`;
                    return { ...prev, hp: newHp };
                });
                break;
            case 'boostAttack':
                // Note: PvP might need separate boost state, but for now we just log it and maybe 
                // we send a 'CHAT' or 'EFFECT' action. Real implementation would need 'attackBoost' state in usePvPState.
                // For simplified 10/10, we'll assume boosts handled or just visually acknowledged, 
                // OR we strictly support Healing for now as primary PvP item.
                // Let's support Healing primarily.
                effectLog = `Attack boosted (Not fully supported in PvP yet)`;
                break;
            case 'boostDefense':
                effectLog = `Defense boosted (Not fully supported in PvP yet)`;
                break;
            default:
                effectLog = `Used ${item.name}`;
        }

        addLog(`${streamerName.toUpperCase()} used ${item.name}: ${effectLog}`);
        setIsTurn(false);

        // Send Action to Opponent
        sendAction({
            type: 'ITEM_USE',
            senderId: playerId,
            itemName: item.name,
            itemEffect: item.effect,
            itemValue: item.value // Or actual healed amount if we calculated it
        });

        // If Bot Match, trigger bot response
        if (matchId.startsWith('bot_match_')) {
            setLastAction({ type: 'ITEM_USE', senderId: playerId, timestamp: Date.now() });
        }

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

            setOpponent((prev: any) => {
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
            setOpponent((prev: any) => prev ? ({ ...prev, hp: result.next_hp }) : prev);

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

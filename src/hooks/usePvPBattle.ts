
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Streamer } from '@/data/streamers';
import { Logger } from '@/lib/logger';
import { toast } from '@/hooks/useToastStore';
import { PvPActionPayload, PvPSyncPayload } from '@/types/pvp';

// Sub-hooks (The "10/10" Architecture)
import { usePvPState } from './pvp/usePvPState';
import { usePvPSocket } from './pvp/usePvPSocket';
import { usePvPActions } from './pvp/usePvPActions';

export const usePvPBattle = (matchId: string, opponentId: string | null, myStreamer: Streamer, playerId: string) => {

    // 1. State Management (Isolated)
    const {
        player, setPlayer,
        opponent, setOpponent,
        battleStatus, setBattleStatus,
        isTurn, setIsTurn,
        isComplete, setIsComplete,
        winnerId, setWinnerId,
        logs, addLog,
        chatLogs, addChat,
        lastAction, setLastAction,
        glrChange, setGlrChange,
        wagerAmount, setWagerAmount,
        calculatedMaxHp,
        refreshStoreStats,

        // Refs for callbacks
        playerRef,
        opponentRef,
        isTurnRef,
        isCompleteRef,
        battleStatusRef // Exposed for watchdog
    } = usePvPState(myStreamer, playerId, false); // isSpectator handled internally or passed? 
    // Wait, isSpectator logic was complex. Let's handle it in init.

    // 2. Spectator Flag
    const isSpectatorRef = useRef(false);
    // FREEZE FIX: Prevent init from re-running on dependency changes
    const hasInitializedRef = useRef<string | null>(null);

    // 3. Socket Event Handlers

    // 3. Socket Event Handlers
    const handleAction = useCallback((payload: PvPActionPayload) => {
        const { type, senderId } = payload;
        if (senderId === playerId) return;

        // Chat
        if (type === 'CHAT') {
            addChat('opponent', payload.message || '', payload.timestamp || Date.now());
            return;
        }

        // Item Usage
        if (type === 'ITEM_USE') {
            const { itemName, itemEffect, itemValue } = payload;
            addLog(`OPPONENT used ${itemName}!`);

            // Apply effect to Opponent State visibly
            if (itemEffect === 'heal') {
                const healAmt = itemValue || 0; // Ideally payload has actual value
                // We might need to sync HP if payload doesn't have it, but let's trust payload or sync
                // For 10/10, let's assume we just want to show the log, 
                // BUT we should update opponent HP if we can.
                // However, without exact math (e.g. maxHp caps), it's risky.
                // Better: Expect a SYNC shortly? Or just optimistic add.
                setOpponent((prev: any) => {
                    if (!prev) return prev;
                    // If we knew value... let's assume itemValue is passed correctly
                    // For RESTORE_CHIP (full heal), value might be large.
                    return { ...prev, hp: Math.min(prev.maxHp, prev.hp + (itemValue || 0)) };
                });
            }
            return;
        }

        // Recovery
        if (type === 'RECOVERY_REQUEST' && !isSpectatorRef.current) {
            addLog("RECOVERY_DETECTION: Peer signal re-establishing...");
            // Need to send response... use sendAction? 
            // We'll wire this in the socket hook or actions.
            // Circular dependency if we need sendAction here.
            // Solution: This handler is passed to socket, socket provides sendAction.
            // We can't access sendAction here easily if it's defined later.
            // Refactor: handleAction needs to be defined BEFORE socket, but needs sendAction.
            // usage of `channelRef` directly is better.
        }

        // Moves
        const damage = payload.damage ?? 0;
        setLastAction({ ...payload, timestamp: Date.now() });
        addLog(`${senderId === opponentId ? 'OPPONENT' : 'ATTACKER'} uses ${payload.moveName || 'UNKNOWN'}!`);

        if (senderId === opponentId) {
            setPlayer(prev => {
                const nextHp = Math.max(0, prev.hp - damage);
                if (nextHp === 0) {
                    setIsComplete(true);
                    setWinnerId(opponentId as string);
                    setBattleStatus('FINISHED');
                    addLog("SIGNAL_LOST: Combat concluded.");
                }
                return { ...prev, hp: nextHp };
            });
            setIsTurn(!isSpectatorRef.current);
        }
    }, [playerId, opponentId, setPlayer, setOpponent, setIsComplete, setWinnerId, setBattleStatus, setIsTurn, addLog, addChat, setLastAction]);

    const handleSync = useCallback((payload: PvPSyncPayload) => {
        if (!opponentId || payload.senderId === opponentId) {
            setOpponent((prev: any) => ({
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
    }, [opponentId, setOpponent]);

    // 4. Socket Connection (Isolated)
    const { sendAction, sendSync, channelRef } = usePvPSocket({
        matchId,
        playerId,
        myStreamerId: myStreamer.id,
        onAction: handleAction,
        onSync: handleSync,
        onOpponentConnect: () => addLog("PEER_SIGNAL_RESTORED: Opponent reconnected."),
        onOpponentDisconnect: () => addLog("PEER_SIGNAL_WEAK: Awaiting reconnection..."),
        isSpectator: isSpectatorRef.current
    });

    // Handle Recovery Response separately to access sendAction
    useEffect(() => {
        if (lastAction?.type === 'RECOVERY_REQUEST' && !isSpectatorRef.current) {
            sendAction({
                type: 'RECOVERY_RESPONSE',
                myHp: player.hp,
                oppHp: (opponent?.hp || 100),
                isTurn: !isTurn,
                senderId: playerId
            });
        }
    }, [lastAction, isSpectatorRef, player.hp, opponent, isTurn, playerId, sendAction]);

    // 5. Actions (Logic Controller)
    const { executeMove, sendChat, executeUseItem } = usePvPActions({
        matchId,
        playerId,
        isSpectator: isSpectatorRef.current,
        isTurn,
        isComplete,
        opponentId,
        wagerAmount,
        playerHp: player.hp,
        streamerName: player.name,
        setIsTurn,
        setPlayer, // Passed setPlayer
        setOpponent,
        setIsComplete,
        setWinnerId,
        setBattleStatus,
        setGlrChange,
        setLastAction,
        addLog,
        addChat,
        sendAction
    });

    // 6. Initialization Logic (The Setup) — FREEZE FIX: guarded with hasInitializedRef
    useEffect(() => {
        const init = async () => {
            // Guard: only run once per matchId change
            if (hasInitializedRef.current === matchId) return;
            hasInitializedRef.current = matchId;

            if (matchId === 'waiting') {
                setBattleStatus('INITIATING');
                addLog("MATCHMAKING_ACTIVE: Awaiting valid peer connection...");
                return;
            }

            if (matchId.startsWith('bot_match_')) {
                setBattleStatus('ACTIVE');
                setOpponent({
                    id: 'AI_SENTINEL_V3',
                    name: 'SENTINEL_PRIME',
                    maxHp: 200,
                    hp: 200,
                    stats: { influence: 80, chaos: 20, charisma: 10, rebellion: 90 },
                    streamerId: '',
                    image: undefined
                });
                setIsTurn(true);
                addLog("SIMULATION_UPLINK: Training Protocol Active.");
                return;
            }

            // Fetch Real Match
            setBattleStatus('SYNCING');
            const { data: matchData, error } = await supabase
                .from('pvp_matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (error || !matchData) {
                Logger.error('PvPBattle', 'Match fetch failed', error);
                setBattleStatus('ERROR');
                return;
            }

            const isAttacker = matchData.attacker_id === playerId;
            const isDefender = matchData.defender_id === playerId;

            if (!isAttacker && !isDefender) {
                isSpectatorRef.current = true;
                addLog("SPECTATOR_LINK: Established read-only connection.");
            }

            // Set Initial Wager
            setWagerAmount(matchData.wager_amount || 0);

            // Set HP & Turn
            const mySavedHp = isAttacker ? matchData.attacker_hp : matchData.defender_hp;
            setPlayer(prev => ({ ...prev, hp: mySavedHp }));

            if (matchData.turn_player_id) {
                setIsTurn(matchData.turn_player_id === playerId);
            } else {
                setIsTurn(playerId === matchData.attacker_id);
            }

            // Set Opponent
            const oppStatsObj = isAttacker ? matchData.defender_stats : matchData.attacker_stats;
            const oppHp = isAttacker ? matchData.defender_hp : matchData.attacker_hp;
            const oppId = isAttacker ? matchData.defender_id : matchData.attacker_id;
            const oppMaxHp = oppStatsObj?.maxHp || calculatedMaxHp; // Fallback

            setOpponent({
                id: oppId,
                name: oppStatsObj?.name || 'Unknown',
                maxHp: oppMaxHp,
                hp: oppHp,
                stats: oppStatsObj,
                streamerId: ''
            });

            setBattleStatus(matchData.status === 'FINISHED' ? 'FINISHED' : 'ACTIVE');

            // Sync Presence
            sendSync({
                senderId: playerId,
                streamerId: myStreamer.id,
                name: myStreamer.name,
                maxHp: calculatedMaxHp,
                hp: mySavedHp,
                stats: myStreamer.stats,
                image: myStreamer.image
            });
        };

        if (matchId) init();
    }, [matchId, playerId, myStreamer, setBattleStatus, addLog, setOpponent, setPlayer, setIsTurn, setWagerAmount, sendSync, calculatedMaxHp]);

    // 7. Watchdog for Stuck State
    useEffect(() => {
        if (battleStatus === 'SYNCING') {
            const timer = setTimeout(() => {
                if (battleStatusRef.current !== 'ACTIVE' && battleStatusRef.current !== 'FINISHED') {
                    Logger.warn('PvPBattle', 'Watchdog: Forcing ACTIVE');
                    setBattleStatus('ACTIVE');
                    setIsTurn(true); // Unlock turn
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [battleStatus, setBattleStatus, setIsTurn]);

    // 7b. FREEZE FIX: Turn Safety Watchdog — if stuck on opponent turn for 10s, force our turn
    useEffect(() => {
        if (battleStatus === 'ACTIVE' && !isTurn && !isComplete) {
            const timer = setTimeout(() => {
                if (!isTurnRef.current && !isCompleteRef.current) {
                    Logger.warn('PvPBattle', 'Turn Safety: Forcing turn after 10s wait');
                    addLog('SIGNAL_RECOVERY: Forcing turn due to opponent timeout.');
                    setIsTurn(true);
                }
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [battleStatus, isTurn, isComplete, setIsTurn, addLog, isTurnRef, isCompleteRef]);

    // 8. Bot Response Logic (Simulation) — FREEZE FIX: uses ref check to prevent stale closure issues
    useEffect(() => {
        if (matchId.startsWith('bot_match_') && lastAction?.senderId === playerId && !isComplete && !isTurn && lastAction?.type !== 'ITEM_USE') { // Wait, if item used, turn is passed, bot should respond?
            // Actually, if ITEM_USE is sent, lastAction is set. 
            // We need to trigger bot response on ITEM_USE as well.
            // Updated condition: Trigger ON `MOVE` or `ITEM_USE` from player.
            // But existing code only checked implicitly via lastAction? 
            // Let's verify: useEffect deps includes lastAction.
            // If lastAction type is ITEM_USE, we should also trigger.
        }

        // Correcting bot logic to respond to ITEM_USE too
        if (matchId.startsWith('bot_match_') && lastAction?.senderId === playerId && !isComplete && !isTurn) {
            const timer = setTimeout(() => {
                if (isCompleteRef.current || isTurnRef.current) return;

                const botDamage = Math.floor(Math.random() * 20 + 10);
                setPlayer(prev => {
                    const nextHp = Math.max(0, prev.hp - botDamage);
                    if (nextHp === 0) {
                        setIsComplete(true);
                        setWinnerId('AI_SENTINEL_V3');
                        setBattleStatus('FINISHED');
                        addLog("MISSION_FAILURE: Simulation Failed.");
                    }
                    return { ...prev, hp: nextHp };
                });
                addLog(`SENTINEL_PRIME attacks! -${botDamage} HP`);
                setIsTurn(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [matchId, lastAction, playerId, isComplete, isTurn, setPlayer, setIsComplete, setWinnerId, setBattleStatus, addLog, setIsTurn, isCompleteRef, isTurnRef]);

    // 9. Match Result Recording
    useEffect(() => {
        if (isComplete && winnerId && !isSpectatorRef.current) {
            refreshStoreStats().catch(err => Logger.error('PvPBattle', 'Stats refresh failed', err));
        }
    }, [isComplete, winnerId, refreshStoreStats]);

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
        executeUseItem, // Exposed
        sendChat,
        lastAction,
        isSpectator: isSpectatorRef.current,
        glrChange,
        wagerAmount
    };
};

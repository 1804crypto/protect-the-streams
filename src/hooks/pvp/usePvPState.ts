
import { useState, useRef, useEffect, useCallback } from 'react';
import { StreamerStats, Streamer, applyNatureToStats } from '@/data/streamers';
import { useCollectionStore, getNature } from '../useCollectionStore';
import { useVisualEffects } from '../useVisualEffects';
import { PvPPlayerState } from '@/types/pvp';
import { Logger } from '@/lib/logger';

export const usePvPState = (
    myStreamer: Streamer,
    playerId: string,
    isSpectatorMode: boolean
) => {
    // Determine stats with nature bonus
    const refreshStoreStats = useCollectionStore(state => state.refreshStats);
    const myNature = useCollectionStore(state => getNature(state, myStreamer.id));

    // Calculate Level-Based Max HP
    const completedMissions = useCollectionStore(state => state.completedMissions);
    const missionRecord = completedMissions.find(m => m.id === myStreamer.id);
    const streamerLevel = missionRecord?.level || 1;
    const calculatedMaxHp = 100 + ((streamerLevel - 1) * 25);

    // --- Core State ---
    const [player, setPlayer] = useState<PvPPlayerState>({
        id: playerId,
        name: myStreamer.name,
        maxHp: calculatedMaxHp,
        hp: calculatedMaxHp,
        stats: myNature ? applyNatureToStats(myStreamer.stats, myNature) : myStreamer.stats,
        streamerId: myStreamer.id,
        image: myStreamer.image
    });

    const [opponent, setOpponent] = useState<PvPPlayerState | null>(null);
    const [battleStatus, setBattleStatus] = useState<'INITIATING' | 'SYNCING' | 'ACTIVE' | 'RECOVERING' | 'FINISHED' | 'ERROR'>('INITIATING');
    const [isTurn, setIsTurn] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);

    // --- UI/Log State ---
    const [logs, setLogs] = useState<string[]>(["PVP_INITIALIZED: Establishing peer link..."]);
    const [chatLogs, setChatLogs] = useState<{ sender: string, message: string, timestamp: number }[]>([]);
    const [lastAction, setLastAction] = useState<any | null>(null);
    const [glrChange, setGlrChange] = useState<number | null>(null);
    const [wagerAmount, setWagerAmount] = useState<number>(0);

    // --- Refs for Stable Socket Access ---
    const playerRef = useRef(player);
    const opponentRef = useRef(opponent);
    const battleStatusRef = useRef(battleStatus);
    const isTurnRef = useRef(isTurn);
    const isCompleteRef = useRef(isComplete);

    // Keep Refs Synced
    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { opponentRef.current = opponent; }, [opponent]);
    useEffect(() => { battleStatusRef.current = battleStatus; }, [battleStatus]);
    useEffect(() => { isTurnRef.current = isTurn; }, [isTurn]);
    useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);

    // --- Visual Sync ---
    const setIntegrity = useVisualEffects(state => state.setIntegrity);
    const resetGlobalEffects = useVisualEffects(state => state.resetEffects);

    useEffect(() => {
        if (!isSpectatorMode) {
            setIntegrity(player.hp / player.maxHp);
        }
    }, [player.hp, player.maxHp, setIntegrity, isSpectatorMode]);

    useEffect(() => {
        return () => resetGlobalEffects();
    }, [resetGlobalEffects]);

    // --- Helper Methods (STABILIZED with useCallback to prevent infinite re-renders) ---
    const addLog = useCallback((msg: string) => {
        setLogs(prev => [msg, ...prev].slice(0, 5));
        Logger.info('PvPState', msg);
    }, []);

    const addChat = useCallback((sender: string, message: string, timestamp: number = Date.now()) => {
        setChatLogs(prev => [...prev, { sender, message, timestamp }]);
    }, []);

    return {
        // State
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

        // Refs
        playerRef,
        opponentRef,
        battleStatusRef,
        isTurnRef,
        isCompleteRef
    };
};

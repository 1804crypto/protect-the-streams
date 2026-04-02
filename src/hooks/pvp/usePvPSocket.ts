
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Logger } from '@/lib/logger';
import { PvPActionPayload, PvPSyncPayload, MatchmakingPresence } from '@/types/pvp';

interface UsePvPSocketProps {
    matchId: string;
    playerId: string;
    myStreamerId: string;
    onAction: (_payload: PvPActionPayload) => void;
    onSync: (_payload: PvPSyncPayload) => void;
    onOpponentConnect: () => void;
    onOpponentDisconnect: () => void;
    isSpectator: boolean;
}

export const usePvPSocket = ({
    matchId,
    playerId,
    myStreamerId,
    onAction,
    onSync,
    onOpponentConnect,
    onOpponentDisconnect,
    isSpectator
}: UsePvPSocketProps) => {

    const channelRef = useRef<any>(null);
    const isSpectatorRef = useRef(isSpectator);
    const onActionRef = useRef(onAction);
    const onSyncRef = useRef(onSync);
    const onOpponentConnectRef = useRef(onOpponentConnect);
    const onOpponentDisconnectRef = useRef(onOpponentDisconnect);

    // Keep all refs fresh — no reconnect needed when callbacks change
    useEffect(() => { isSpectatorRef.current = isSpectator; }, [isSpectator]);
    useEffect(() => { onActionRef.current = onAction; }, [onAction]);
    useEffect(() => { onSyncRef.current = onSync; }, [onSync]);
    useEffect(() => { onOpponentConnectRef.current = onOpponentConnect; }, [onOpponentConnect]);
    useEffect(() => { onOpponentDisconnectRef.current = onOpponentDisconnect; }, [onOpponentDisconnect]);

    // Connect to Channel
    useEffect(() => {
        if (!matchId || matchId === 'waiting' || matchId.startsWith('bot_match_')) return;

        Logger.info('PvPSocket', `Initializing connection to channel: battle:${matchId}`);

        const channel = supabase.channel(`battle:${matchId}`, {
            config: {
                broadcast: { self: false, ack: true },
                presence: { key: playerId }
            }
        });

        channel
            .on('broadcast', { event: 'ACTION' }, ({ payload }) => {
                try {
                    onActionRef.current(payload);
                } catch (e) {
                    Logger.error('PvPSocket', 'Error handling ACTION', e);
                }
            })
            .on('broadcast', { event: 'SYNC' }, ({ payload }) => {
                try {
                    if (payload.senderId !== playerId) {
                        onSyncRef.current(payload);
                    }
                } catch (e) {
                    Logger.error('PvPSocket', 'Error handling SYNC', e);
                }
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                const joined = (newPresences as unknown as MatchmakingPresence[]).find((p) => p.playerId !== playerId);
                if (joined) {
                    Logger.info('PvPSocket', 'Opponent Connected', joined.playerId);
                    onOpponentConnectRef.current();
                }
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                const left = (leftPresences as unknown as MatchmakingPresence[]).find((p) => p.playerId !== playerId);
                if (left) {
                    Logger.warn('PvPSocket', 'Opponent Disconnected', left.playerId);
                    onOpponentDisconnectRef.current();
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    Logger.info('PvPSocket', 'Subscribed to channel');
                    // Initial sync trigger handled by parent effect or explicit call
                }
            });

        channelRef.current = channel;

        return () => {
            Logger.info('PvPSocket', 'Cleaning up channel');
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally minimal; adding callbacks would cause reconnect loops
    }, [matchId, playerId]);

    // Broadcast Action
    const sendAction = useCallback(async (payload: PvPActionPayload) => {
        if (isSpectatorRef.current || !channelRef.current) return;

        try {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'ACTION',
                payload: { ...payload, senderId: playerId }
            });
        } catch (e) {
            Logger.error('PvPSocket', 'Failed to send action', e);
        }
    }, [playerId]);

    // Broadcast Sync
    const sendSync = useCallback(async (payload: PvPSyncPayload) => {
        if (isSpectatorRef.current || !channelRef.current) return;

        try {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'SYNC',
                payload
            });

            // Also track presence
            await channelRef.current.track({
                playerId,
                streamerId: myStreamerId,
                status: 'FIGHTING'
            });
        } catch (e) {
            Logger.error('PvPSocket', 'Failed to send sync', e);
        }
    }, [playerId, myStreamerId]);

    return { sendAction, sendSync, channelRef };
};

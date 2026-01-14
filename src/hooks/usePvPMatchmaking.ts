import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type MatchmakingState = 'IDLE' | 'SEARCHING' | 'MATCH_FOUND' | 'TIMEOUT' | 'ERROR';

export const usePvPMatchmaking = (streamerId: string, enabled: boolean) => {
    const [matchStatus, setMatchStatus] = useState<MatchmakingState>('IDLE');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [sessionId] = useState(() => crypto.randomUUID()); // Stable ID via state
    const channelRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) {
            setMatchStatus('IDLE');
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        setMatchStatus('SEARCHING');

        // Start 30s timeout
        timeoutRef.current = setTimeout(() => {
            if (matchStatus === 'SEARCHING') {
                setMatchStatus('TIMEOUT');
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                }
            }
        }, 30000); // 30 seconds

        // Join global lobby
        const channel = supabase.channel('lobby:global', {
            config: { presence: { key: sessionId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const peers = Object.values(state).flat() as any[];

                // Filter out self and only find those actively searching
                const others = peers.filter(p => p.sessionId !== sessionId && p.status === 'SEARCHING');

                if (others.length > 0) {
                    // Match found logic
                    const opponent = others[0];

                    if (sessionId < opponent.sessionId) {
                        const newRoomId = crypto.randomUUID();
                        channel.send({
                            type: 'broadcast',
                            event: 'MATCH_PROPOSAL',
                            payload: {
                                targetId: opponent.sessionId,
                                roomId: newRoomId,
                                hostId: sessionId
                            }
                        });

                        setRoomId(newRoomId);
                        setOpponentId(opponent.sessionId);
                        setMatchStatus('MATCH_FOUND');
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    }
                }
            })
            .on('broadcast', { event: 'MATCH_PROPOSAL' }, ({ payload }) => {
                if (payload.targetId === sessionId) {
                    setRoomId(payload.roomId);
                    setOpponentId(payload.hostId);
                    setMatchStatus('MATCH_FOUND');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }
            })
            .subscribe(async (subStatus) => {
                if (subStatus === 'SUBSCRIBED') {
                    await channel.track({
                        sessionId,
                        streamerId,
                        timestamp: Date.now(),
                        status: 'SEARCHING'
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            if (channel) supabase.removeChannel(channel);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [enabled, streamerId, sessionId, matchStatus]);

    const retry = () => {
        setMatchStatus('SEARCHING');
    };

    return { status: matchStatus, roomId, opponentId, playerId: sessionId, retry };
};

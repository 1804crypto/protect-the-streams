import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type MatchmakingState = 'IDLE' | 'SEARCHING' | 'MATCH_FOUND' | 'ERROR';

export const usePvPMatchmaking = (streamerId: string, enabled: boolean) => {
    const [status, setStatus] = useState<MatchmakingState>('IDLE');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!enabled) {
            setStatus('IDLE');
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            return;
        }

        setStatus('SEARCHING');

        // Join global lobby
        const channel = supabase.channel('lobby:global', {
            config: { presence: { key: streamerId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const peers = Object.values(state).flat() as any[];

                // Filter out self and only find those actively searching
                const others = peers.filter(p => p.streamerId !== streamerId && p.status === 'SEARCHING');

                if (others.length > 0) {
                    // Match found logic
                    // Deterministic Host Selection: Lower ID is host
                    const opponent = others[0]; // Simple match with first available

                    // To prevent race conditions, we need a stable sort or logic.
                    // Simple logic: We only "propose" a match if MyID < OpponentID (I am host)
                    // If MyID > OpponentID, I wait for them to propose.

                    if (streamerId < opponent.streamerId) {
                        // I am host
                        const newRoomId = crypto.randomUUID();
                        channel.send({
                            type: 'broadcast',
                            event: 'MATCH_PROPOSAL',
                            payload: {
                                targetId: opponent.streamerId,
                                roomId: newRoomId,
                                hostId: streamerId
                            }
                        });

                        // Set my state
                        setRoomId(newRoomId);
                        setOpponentId(opponent.streamerId);
                        setStatus('MATCH_FOUND');
                    }
                }
            })
            .on('broadcast', { event: 'MATCH_PROPOSAL' }, ({ payload }) => {
                if (payload.targetId === streamerId) {
                    // I have been challenged/matched
                    setRoomId(payload.roomId);
                    setOpponentId(payload.hostId);
                    setStatus('MATCH_FOUND');
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        streamerId,
                        timestamp: Date.now(),
                        status: 'SEARCHING'
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [enabled, streamerId]);

    return { status, roomId, opponentId };
};

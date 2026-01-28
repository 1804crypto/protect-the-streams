import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserAuth } from './useUserAuth';

export type MatchmakingState = 'IDLE' | 'SEARCHING' | 'MATCH_FOUND' | 'TIMEOUT' | 'ERROR';

export const usePvPMatchmaking = (streamerId: string, enabled: boolean) => {
    const { userId } = useUserAuth();
    const [matchStatus, setMatchStatus] = useState<MatchmakingState>('IDLE');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [sessionId] = useState(() => crypto.randomUUID()); // Local random for socket stability
    const playerId = userId || sessionId; // Global identifiable ID
    const channelRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) {
            setTimeout(() => setMatchStatus('IDLE'), 0);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        setTimeout(() => setMatchStatus('SEARCHING'), 0);

        // Start 30s timeout
        timeoutRef.current = setTimeout(() => {
            setMatchStatus(currentStatus => {
                if (currentStatus === 'SEARCHING') return 'TIMEOUT';
                return currentStatus;
            });
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }, 30000); // 30 seconds

        // Join global lobby
        const channel = supabase.channel('lobby:global', {
            config: { presence: { key: playerId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const peers = Object.values(state).flat() as any[];

                // Filter out self and only find those actively searching
                const others = peers.filter(p => p.playerId !== playerId && p.status === 'SEARCHING');

                if (others.length > 0) {
                    // Match found logic
                    const opponent = others[0];

                    if (sessionId < opponent.sessionId) {
                        const newRoomId = crypto.randomUUID();
                        channel.send({
                            type: 'broadcast',
                            event: 'MATCH_PROPOSAL',
                            payload: {
                                targetId: opponent.playerId,
                                roomId: newRoomId,
                                hostId: playerId
                            }
                        });

                        // PERSIST: Host creates the match record
                        supabase.from('pvp_matches').insert([{
                            id: newRoomId,
                            attacker_id: playerId,
                            defender_id: opponent.playerId,
                            status: 'ACTIVE'
                        }]).then(({ error }) => {
                            if (error) console.error("Match Persist Error:", error);
                        });

                        setRoomId(newRoomId);
                        setOpponentId(opponent.playerId);
                        setMatchStatus('MATCH_FOUND');
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    }
                }
            })
            .on('broadcast', { event: 'MATCH_PROPOSAL' }, ({ payload }) => {
                if (payload.targetId === playerId) {
                    setRoomId(payload.roomId);
                    setOpponentId(payload.hostId);
                    setMatchStatus('MATCH_FOUND');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }
            })
            .subscribe(async (subStatus) => {
                if (subStatus === 'SUBSCRIBED') {
                    await channel.track({
                        playerId,
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
    }, [enabled, streamerId, sessionId, playerId]);

    const retry = () => {
        setMatchStatus('SEARCHING');
    };

    return { status: matchStatus, roomId, opponentId, playerId, retry };
};

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserAuth } from './useUserAuth';
import { useCollectionStore, getNature, getMissionRecord } from './useCollectionStore';
import { streamers, applyNatureToStats } from '@/data/streamers';
import { toast } from 'react-hot-toast';

export type MatchmakingState = 'IDLE' | 'SEARCHING' | 'MATCH_FOUND' | 'TIMEOUT' | 'ERROR';

export const usePvPMatchmaking = (streamerId: string, enabled: boolean, wager: number = 0) => {
    const { userId } = useUserAuth();
    const [matchStatus, setMatchStatus] = useState<MatchmakingState>('IDLE');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [opponentWager, setOpponentWager] = useState<number>(0);
    const [sessionId] = useState(() => crypto.randomUUID()); // Local random for socket stability
    const playerId = userId || sessionId; // Global identifiable ID
    const channelRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch stats for the current operative
    const myNature = useCollectionStore(state => getNature(state, streamerId));
    const _myMission = useCollectionStore(state => getMissionRecord(state, streamerId));
    const baseStreamer = streamers.find(s => s.id === streamerId);

    // Calculate final stats object
    const myStats = baseStreamer ? (
        myNature ? applyNatureToStats(baseStreamer.stats, myNature) : baseStreamer.stats
    ) : {};

    const playerName = useCollectionStore.getState().isAuthenticated ? 'OPERATIVE' : 'GUEST';

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
                const others = peers.filter(p =>
                    p.playerId !== playerId &&
                    p.status === 'SEARCHING' &&
                    (wager === 0 || (p.wager >= wager * 0.5 && p.wager <= wager * 1.5))
                );

                if (others.length > 0) {
                    const opponent = others[0];
                    if (sessionId < opponent.sessionId) {
                        const newRoomId = crypto.randomUUID();
                        const finalWager = Math.max(wager, opponent.wager);

                        // PERSIST: Host creates the match record via secure RPC
                        supabase.rpc('initialize_pvp_match', {
                            p_match_id: newRoomId,
                            p_defender_id: opponent.playerId,
                            p_wager_amount: finalWager,
                            p_attacker_stats: { ...myStats, name: playerName, hp: 100 },
                            p_defender_stats: { ...opponent.stats, name: opponent.name || 'DEFENDER', hp: 100 }
                        }).then(({ data, error }) => {
                            if (error || (data && !data.success)) {
                                console.error("Match Initialization Failed:", error || data?.error);
                                toast.error(`UPLINK_FAILURE: ${data?.error || 'Insufficient Funds'}`);
                                return;
                            }

                            // Match record secured and wagers deducted. Broadcast the proposal.
                            channel.send({
                                type: 'broadcast',
                                event: 'MATCH_PROPOSAL',
                                payload: {
                                    targetId: opponent.playerId,
                                    roomId: newRoomId,
                                    hostId: playerId,
                                    wager: finalWager
                                }
                            });

                            setRoomId(newRoomId);
                            setOpponentId(opponent.playerId);
                            setOpponentWager(finalWager);
                            setMatchStatus('MATCH_FOUND');
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        });
                    }
                }
            })
            .on('broadcast', { event: 'MATCH_PROPOSAL' }, ({ payload }) => {
                if (payload.targetId === playerId) {
                    setRoomId(payload.roomId);
                    setOpponentId(payload.hostId);
                    setOpponentWager(payload.wager);
                    setMatchStatus('MATCH_FOUND');
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }
            })
            .subscribe(async (subStatus) => {
                if (subStatus === 'SUBSCRIBED') {
                    await channel.track({
                        playerId,
                        streamerId,
                        wager,
                        stats: myStats,
                        name: playerName,
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
    }, [enabled, streamerId, sessionId, playerId, wager, myStats, playerName]);

    const retry = () => {
        setMatchStatus('SEARCHING');
    };

    return { status: matchStatus, roomId, opponentId, opponentWager, playerId, retry };
};

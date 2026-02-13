import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserAuth } from './useUserAuth';
import { useCollectionStore, getNature, getMissionRecord } from './useCollectionStore';
import { streamers, applyNatureToStats } from '@/data/streamers';
import { toast } from '@/hooks/useToastStore';

export type MatchmakingState = 'IDLE' | 'SEARCHING' | 'MATCH_FOUND' | 'TIMEOUT' | 'ERROR';

export const usePvPMatchmaking = (streamerId: string, enabled: boolean, wager: number = 0) => {
    const { userId } = useUserAuth();
    const [matchStatus, setMatchStatus] = useState<MatchmakingState>('IDLE');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [opponentWager, setOpponentWager] = useState<number>(0);
    const [sessionId] = useState(() => crypto.randomUUID()); // Local random for socket stability
    const [retryCounter, setRetryCounter] = useState(0); // BUG 12 fix: force re-subscribe on retry
    const playerId = userId || sessionId; // Global identifiable ID
    const channelRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMatchingRef = useRef(false); // Guard against multiple RPC calls from rapid sync events

    // Fetch stats for the current operative
    const myNature = useCollectionStore(state => getNature(state, streamerId));
    const myMission = useCollectionStore(state => getMissionRecord(state, streamerId));
    const baseStreamer = streamers.find(s => s.id === streamerId);
    const myMaxHp = 100 + (((myMission?.level || 1) - 1) * 25);

    // BUG 2 FIX: Memoize stats to prevent infinite re-subscribe loop
    const myStats = useMemo(() => {
        if (!baseStreamer) return {};
        return myNature ? applyNatureToStats(baseStreamer.stats, myNature) : baseStreamer.stats;
    }, [baseStreamer, myNature]);

    const playerName = useCollectionStore.getState().isAuthenticated ? 'OPERATIVE' : 'GUEST';

    // Use ref so the presence sync callback always has current stats
    const myStatsRef = useRef(myStats);
    useEffect(() => { myStatsRef.current = myStats; }, [myStats]);

    useEffect(() => {
        if (!enabled) {
            setTimeout(() => setMatchStatus('IDLE'), 0);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        setTimeout(() => setMatchStatus('SEARCHING'), 0);

        // Start 15s timeout
        timeoutRef.current = setTimeout(() => {
            setMatchStatus(currentStatus => {
                if (currentStatus === 'SEARCHING') {
                    // FALLBACK TO BOT MATCH
                    const botRoomId = `bot_match_${crypto.randomUUID()}`;
                    setRoomId(botRoomId);
                    setOpponentId('AI_SENTINEL_V3');
                    setOpponentWager(0);
                    return 'MATCH_FOUND';
                }
                return currentStatus;
            });
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }, 15000);

        // Join global lobby
        const channel = supabase.channel('lobby:global', {
            config: { presence: { key: playerId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const peers = Object.values(state).flat() as any[];

                // Filter out self and only find those actively searching
                // WAGER FIX: Exact wager match for non-zero. Zero wagers only match zero.
                const others = peers.filter(p =>
                    p.playerId !== playerId &&
                    p.status === 'SEARCHING' &&
                    p.wager === wager
                );

                if (others.length > 0 && !isMatchingRef.current) {
                    const opponent = others[0];
                    if (sessionId < opponent.sessionId) {
                        isMatchingRef.current = true; // Lock to prevent duplicate RPC calls
                        const newRoomId = crypto.randomUUID();
                        // Both players wagered the same amount (exact match enforced above)
                        const finalWager = wager;

                        // PERSIST: Host creates the match record via secure RPC
                        supabase.rpc('initialize_pvp_match', {
                            p_match_id: newRoomId,
                            p_defender_id: opponent.playerId,
                            p_wager_amount: finalWager,
                            p_attacker_stats: { ...myStatsRef.current, name: playerName, hp: myMaxHp },
                            p_defender_stats: { ...opponent.stats, name: opponent.name || 'DEFENDER', hp: opponent.stats?.hp || 100 }
                        }).then(({ data, error }) => {
                            if (error || (data && !data.success)) {
                                console.error("Match Initialization Failed:", error || data?.error);
                                toast.error('UPLINK_FAILURE', data?.error || 'Insufficient Funds');
                                // Reset status so user isn't stuck in SEARCHING forever
                                isMatchingRef.current = false;
                                setMatchStatus('ERROR');
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
                        sessionId,
                        streamerId,
                        wager,
                        stats: { ...myStatsRef.current, hp: myMaxHp },
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
            isMatchingRef.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, streamerId, sessionId, playerId, wager, playerName, retryCounter]);

    // BUG 12 FIX: retry now forces the effect to re-run via retryCounter
    const retry = useCallback(() => {
        setMatchStatus('IDLE');
        setRoomId(null);
        setOpponentId(null);
        setRetryCounter(c => c + 1);
    }, []);

    return { status: matchStatus, roomId, opponentId, opponentWager, playerId, retry };
};

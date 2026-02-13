import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logger';
import { verifySession } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: NextRequest) {
    try {
        // H6 FIX: Verify session — forfeit is a mutating action
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifySession(token);
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
        }

        const { matchId } = await req.json();
        // Derive claimantId from verified session, not from client body
        const claimantId = session.userId as string;

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(matchId)) {
            return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
        }

        // Fetch the match
        const { data: match, error: fetchError } = await supabase
            .from('pvp_matches')
            .select('*')
            .eq('id', matchId)
            .single();

        if (fetchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        // Must be an active match
        if (match.status === 'FINISHED') {
            return NextResponse.json({ error: 'Match already finished', winnerId: match.winner_id }, { status: 409 });
        }

        // Claimant must be a participant
        const isAttacker = match.attacker_id === claimantId;
        const isDefender = match.defender_id === claimantId;
        if (!isAttacker && !isDefender) {
            return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
        }

        // Anti-grief: Match must have had at least 30s of inactivity
        // This prevents instant forfeit claims when the opponent has a brief disconnect
        if (match.last_update) {
            const lastActivity = new Date(match.last_update).getTime();
            const inactivityMs = Date.now() - lastActivity;
            if (inactivityMs < 25000) { // 25s server-side (client waits 30s)
                return NextResponse.json({
                    error: 'Match still active. Opponent may reconnect.',
                    retryAfterMs: 25000 - inactivityMs
                }, { status: 425 });
            }
        }

        // Finalize: Claimant wins by forfeit
        const loserId = isAttacker ? match.defender_id : match.attacker_id;
        const wagerAmount = match.wager_amount || 0;

        const updates: { status: string; winner_id: string; last_update: string } = {
            status: 'FINISHED',
            winner_id: claimantId,
            last_update: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('pvp_matches')
            .update(updates)
            .eq('id', matchId);

        if (updateError) {
            Logger.error('API_Forfeit', "Forfeit update failed", updateError);
            return NextResponse.json({ error: 'Failed to finalize match' }, { status: 500 });
        }

        // Return wager to winner (double payout) if wagers exist
        if (wagerAmount > 0) {
            // Credit winner with their wager back + opponent's wager
            const { error: winnerError } = await supabase.rpc('adjust_pts_balance', {
                p_user_id: claimantId,
                p_amount: wagerAmount * 2
            });

            if (winnerError) {
                // Non-fatal: log but still report success on match finalization
                Logger.error('API_Forfeit', "Wager return failed for winner", winnerError);
            }
        }

        return NextResponse.json({
            success: true,
            winnerId: claimantId,
            loserId,
            wagerReturned: wagerAmount * 2,
            reason: 'opponent_disconnect'
        });

    } catch (error) {
        Logger.error('API_Forfeit', "Forfeit API Error", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

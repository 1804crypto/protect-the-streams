import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { sanitizeInventory } from '@/lib/sanitizeInventory';
import { Logger } from '@/lib/logger';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabase = getServiceSupabase();

// DB-based rate limit: minimum 2s between syncs (survives serverless cold starts)
const MIN_SYNC_INTERVAL_MS = 2000;

// Valid streamer IDs for mission validation
export const VALID_STREAMER_IDS = new Set([
    'kaicenat', 'adinross', 'ishowspeed', 'xqc', 'dukedennis',
    'fanum', 'agent00', 'druski', 'hasanabi', 'zoey',
    'sneako', 'plaqueboymax', 'rakai', 'reggie', 'bendadonnn',
    'ddg', 'extraemily', 'rayasianboy', 'tylil', 'jazzygunz'
]);

/**
 * HARDENED SYNC ENDPOINT — state reconciliation only.
 *
 * This endpoint persists client-side state changes (inventory, natures, faction).
 * It does NOT grant rewards. All XP, PTS, wins, and losses are awarded exclusively
 * by server-authoritative endpoints:
 *   - /api/mission/complete  (XP, PTS, wins, losses, items, rank)
 *   - /api/pvp/forfeit       (wins, losses, wager PTS)
 *   - /api/shop/purchase     (PTS deduction, item grants)
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Verify Session
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifySession(token);
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
        }

        const userId = session.userId as string;

        // 2. Parse Body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const {
            inventory,
            streamerNatures,
            completedMissions,
            faction,
            isFactionMinted,
            journeyProgress
        } = body;

        // 3. Fetch user from DB
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, inventory, streamer_natures, completed_missions, faction, is_faction_minted, xp, level, pts_balance, updated_at')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // DB-BASED RATE LIMIT: Check updated_at timestamp
        if (user.updated_at) {
            const lastUpdate = new Date(user.updated_at).getTime();
            if (Date.now() - lastUpdate < MIN_SYNC_INTERVAL_MS) {
                return NextResponse.json({ error: 'Rate limit exceeded. Slow down.' }, { status: 429 });
            }
        }

        // 4. Build update — state fields only, NO reward fields
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        // HARDENED INVENTORY: Sanitize client inventory against whitelist
        if (inventory) {
            updates.inventory = sanitizeInventory(inventory, user.inventory);
        }

        if (streamerNatures !== undefined) updates.streamer_natures = streamerNatures;
        if (completedMissions !== undefined) updates.completed_missions = completedMissions;
        if (faction !== undefined && (faction === 'RED' || faction === 'PURPLE' || faction === 'NONE')) {
            updates.faction = faction;
        }
        if (isFactionMinted !== undefined) updates.is_faction_minted = isFactionMinted;
        if (journeyProgress !== undefined && typeof journeyProgress === 'object') {
            updates.journey_progress = journeyProgress;
        }

        // 5. Optimistic lock: only update if updated_at hasn't changed since we read it
        let updateQuery = supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (user.updated_at) {
            updateQuery = updateQuery.eq('updated_at', user.updated_at);
        }

        const { data: updateResult, error: updateError } = await updateQuery.select('id').maybeSingle();

        if (updateError) {
            Logger.error('API_Sync', "Sync Update Error", updateError);
            return NextResponse.json({ error: 'Failed to persist' }, { status: 500 });
        }

        if (!updateResult) {
            return NextResponse.json({ error: 'Conflict: state changed. Please retry.' }, { status: 409 });
        }

        // Return current authoritative values so client stays in sync
        return NextResponse.json({
            success: true,
            newXp: user.xp,
            newLevel: user.level,
            newPtsBalance: user.pts_balance
        });

    } catch (error) {
        Logger.error('API_Sync', "Sync API Error", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

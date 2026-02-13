import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth';
import { calculateLevel } from '@/lib/gameMechanics';
import { sanitizeInventory } from '@/lib/sanitizeInventory';
import { Logger } from '@/lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// DB-based rate limit: minimum 2s between syncs (survives serverless cold starts)
const MIN_SYNC_INTERVAL_MS = 2000;

// Valid streamer IDs for mission validation
export const VALID_STREAMER_IDS = new Set([
    'kaicenat', 'adinross', 'ishowspeed', 'xqc', 'dukedennis',
    'fanum', 'agent00', 'druski', 'hasanabi', 'zoey',
    'sneako', 'plaqueboymax', 'rakai', 'reggie', 'bendadonnn',
    'ddg', 'extraemily', 'rayasianboy', 'tylil', 'jazzygunz'
]);

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
        const {
            deltaXp,
            inventory,
            missionId,
            rank,
            duration,
            deltaWins,
            deltaLosses,
            streamerNatures,
            completedMissions,
            faction,
            isFactionMinted
        } = await req.json();

        // 3. Validation (Basic Sanity Checks)
        if (deltaXp && deltaXp > 5000) {
            return NextResponse.json({ error: 'Suspicious Activity Detected: XP gain too high' }, { status: 400 });
        }

        // BUG 7 FIX: Validate delta values are 0 or 1 (not arbitrary numbers)
        if (deltaWins !== undefined && (deltaWins < 0 || deltaWins > 1)) {
            return NextResponse.json({ error: 'Invalid win delta' }, { status: 400 });
        }
        if (deltaLosses !== undefined && (deltaLosses < 0 || deltaLosses > 1)) {
            return NextResponse.json({ error: 'Invalid loss delta' }, { status: 400 });
        }

        // ANTI-CHEAT: Duration Check
        if (missionId && (!duration || duration < 30000)) {
            Logger.warn('API_Sync', `Suspicious Mission Duration: ${duration}ms for User ${userId}`);
            return NextResponse.json({ error: 'Suspicious Cycle Time: Uplink Rejected.' }, { status: 400 });
        }

        // Validate missionId is a real streamer ID (if provided)
        if (missionId && !VALID_STREAMER_IDS.has(missionId)) {
            return NextResponse.json({ error: 'Invalid mission target' }, { status: 400 });
        }

        // 4. Calculate Rewards
        let ptsReward = 0;
        if (missionId && rank) {
            const rewardMap: Record<string, number> = {
                'S': 100,
                'A': 50,
                'B': 25,
                'F': 0
            };
            ptsReward = rewardMap[rank] || 0;
            Logger.info('API_Sync', `Mission ${missionId} Rank ${rank}: Awarding ${ptsReward} $PTS`);
        }

        // 5. Fetch user from DB
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
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

        // Calculate New State
        const newXp = (user.xp || 0) + (deltaXp || 0);
        const newPtsBalance = (user.pts_balance || 0) + ptsReward;

        // SERVER AUTHORITATIVE LEVEL CALCULATION
        const newLevel = calculateLevel(newXp);

        // HARDENED INVENTORY: Sanitize client inventory against whitelist
        const newInventory = inventory
            ? sanitizeInventory(inventory, user.inventory)
            : user.inventory;

        const updates: Record<string, unknown> = {
            xp: newXp,
            level: newLevel,
            inventory: newInventory,
            pts_balance: newPtsBalance,
            updated_at: new Date().toISOString()
        };

        // BUG 7 FIX: Server-side increment for wins/losses
        if (deltaWins === 1) updates.wins = (user.wins || 0) + 1;
        if (deltaLosses === 1) updates.losses = (user.losses || 0) + 1;
        if (streamerNatures !== undefined) updates.streamer_natures = streamerNatures;
        // HARDENED: Only accept completedMissions when a valid missionId accompanies the request
        if (completedMissions !== undefined && missionId) {
            updates.completed_missions = completedMissions;
        }
        if (faction !== undefined && (faction === 'RED' || faction === 'PURPLE' || faction === 'NONE')) {
            updates.faction = faction;
        }
        if (isFactionMinted !== undefined) updates.is_faction_minted = isFactionMinted;

        const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (updateError) {
            Logger.error('API_Sync', "Sync Update Error", updateError);
            return NextResponse.json({ error: 'Failed to persist' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            newXp,
            newLevel,
            newPtsBalance,
            ptsGained: ptsReward
        });

    } catch (error) {
        Logger.error('API_Sync', "Sync API Error", error);

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

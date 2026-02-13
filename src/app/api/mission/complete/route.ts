import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth';
import { calculateLevel } from '@/lib/gameMechanics';
import { computeRank, computeXp, computePtsReward, computeRewardItems } from '@/lib/missionRewards';
import { sanitizeInventory, VALID_ITEM_IDS, MAX_ITEM_QUANTITY } from '@/lib/sanitizeInventory';
import { VALID_STREAMER_IDS } from '@/app/api/player/sync/route';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Minimum mission duration to prevent instant-complete exploits
const MIN_MISSION_DURATION_MS = 30000;

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

        // 2. Parse & Validate Body
        const { missionId, hpRemaining, maxHp, turnsUsed, isBoss, duration } = await req.json();

        if (!missionId || typeof missionId !== 'string') {
            return NextResponse.json({ error: 'Missing missionId' }, { status: 400 });
        }
        if (!VALID_STREAMER_IDS.has(missionId)) {
            return NextResponse.json({ error: 'Invalid mission target' }, { status: 400 });
        }

        // Validate numeric fields
        if (typeof hpRemaining !== 'number' || typeof maxHp !== 'number' ||
            typeof turnsUsed !== 'number' || typeof duration !== 'number') {
            return NextResponse.json({ error: 'Invalid battle data types' }, { status: 400 });
        }

        if (hpRemaining < 0 || hpRemaining > maxHp || maxHp <= 0) {
            return NextResponse.json({ error: 'Invalid HP values' }, { status: 400 });
        }
        if (turnsUsed < 1 || turnsUsed > 100) {
            return NextResponse.json({ error: 'Invalid turn count' }, { status: 400 });
        }

        // Anti-cheat: minimum duration
        const isFailure = hpRemaining <= 0;
        if (duration < MIN_MISSION_DURATION_MS && !isFailure) {
            return NextResponse.json({ error: 'Mission duration too short' }, { status: 400 });
        }

        // 3. Server computes all rewards
        const rank = computeRank(hpRemaining, maxHp, turnsUsed, isFailure);
        const xpGained = computeXp(rank, !!isBoss);
        const ptsGained = computePtsReward(rank);
        const itemsAwarded = computeRewardItems(rank);

        // 4. Fetch current user state
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('xp, level, inventory, pts_balance, completed_missions, faction, updated_at')
            .eq('id', userId)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userData as {
            xp: number; level: number; inventory: Record<string, number> | null;
            pts_balance: number; completed_missions: Array<{
                id: string; rank: string; clearedAt: number; xp: number; level: number;
            }> | null; faction: string | null; updated_at: string | null;
        };

        // Rate limit: minimum 2s between operations
        if (user.updated_at) {
            const lastUpdate = new Date(user.updated_at).getTime();
            if (Date.now() - lastUpdate < 2000) {
                return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
            }
        }

        // 5. Compute new state
        const newXp = (user.xp || 0) + xpGained;
        const newLevel = calculateLevel(newXp);
        const newPtsBalance = (user.pts_balance || 0) + ptsGained;

        // Merge items into inventory
        const currentInventory = (user.inventory || {}) as Record<string, number>;
        const newInventory = { ...currentInventory };
        itemsAwarded.forEach(itemId => {
            if (VALID_ITEM_IDS.has(itemId)) {
                newInventory[itemId] = Math.min((newInventory[itemId] || 0) + 1, MAX_ITEM_QUANTITY);
            }
        });

        // Update completed missions
        const existingMissions = (user.completed_missions || []) as Array<{
            id: string; rank: string; clearedAt: number; xp: number; level: number;
        }>;
        const missionIndex = existingMissions.findIndex(m => m.id === missionId);
        const rankWeight: Record<string, number> = { 'S': 3, 'A': 2, 'B': 1, 'F': 0 };

        if (missionIndex >= 0) {
            const existing = { ...existingMissions[missionIndex] };
            existing.xp = (existing.xp || 0) + xpGained;
            if (rankWeight[rank] > (rankWeight[existing.rank] || 0)) {
                existing.rank = rank;
                existing.clearedAt = Date.now();
            }
            // Recalculate mission-level based on accumulated xp
            existing.level = existing.xp >= 1000 ? 5 : existing.xp >= 500 ? 4 :
                existing.xp >= 250 ? 3 : existing.xp >= 100 ? 2 : 1;
            existingMissions[missionIndex] = existing;
        } else {
            const missionLevel = xpGained >= 1000 ? 5 : xpGained >= 500 ? 4 :
                xpGained >= 250 ? 3 : xpGained >= 100 ? 2 : 1;
            existingMissions.push({
                id: missionId,
                rank,
                clearedAt: Date.now(),
                xp: xpGained,
                level: missionLevel
            });
        }

        // 6. Write to DB
        const updates: Record<string, unknown> = {
            xp: newXp,
            level: newLevel,
            pts_balance: newPtsBalance,
            inventory: sanitizeInventory(newInventory, currentInventory),
            completed_missions: existingMissions,
            updated_at: new Date().toISOString()
        };
        const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (updateError) {
            console.error('Mission complete DB update failed:', updateError);
            return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
        }

        // 7. Faction war contribution (if applicable)
        if (user.faction && user.faction !== 'NONE' && rank !== 'F') {
            supabase.rpc('contribute_to_faction_war', {
                p_streamer_id: missionId,
                p_faction: user.faction
            }).then(({ error }) => {
                if (error) console.error('Faction contribution failed:', error);
            });
        }

        return NextResponse.json({
            success: true,
            rank,
            xpGained,
            newXp,
            newLevel,
            ptsGained,
            newPtsBalance,
            itemsAwarded,
            newInventory: sanitizeInventory(newInventory, currentInventory),
            completedMissions: existingMissions
        });

    } catch (error) {
        console.error('Mission complete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

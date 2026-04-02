import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { calculateLevel } from '@/lib/gameMechanics';
import { computeRank, computeXp, computePtsReward, computeRewardItems } from '@/lib/missionRewards';
import { sanitizeInventory, VALID_ITEM_IDS, MAX_ITEM_QUANTITY } from '@/lib/sanitizeInventory';
import { VALID_STREAMER_IDS } from '@/app/api/player/sync/route';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabase = getServiceSupabase();

// Minimum mission duration to prevent instant-complete exploits
const MIN_MISSION_DURATION_MS = 30000;

// Anti-farm: max completions per streamer per 24h window
const MAX_COMPLETIONS_PER_STREAMER_PER_DAY = 5;

// Anti-farm: minimum cooldown between mission completions (any streamer)
const MIN_MISSION_COOLDOWN_MS = 10_000; // 10 seconds

// Balance caps to prevent overflow exploits
const MAX_XP = 999_999_999;
const MAX_PTS_BALANCE = 999_999_999;

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
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { missionId, hpRemaining, maxHp, turnsUsed, duration, idempotencyKey } = body;
        // Determine isBoss server-side from the missionId prefix — never trust client value
        const isBoss = typeof missionId === 'string' && missionId.startsWith('boss_');

        if (!missionId || typeof missionId !== 'string') {
            return NextResponse.json({ error: 'Missing missionId' }, { status: 400 });
        }

        // Idempotency: If key provided, check if already processed
        if (idempotencyKey && typeof idempotencyKey === 'string') {
            const { data: existing } = await supabase
                .from('mission_completions')
                .select('result')
                .eq('idempotency_key', idempotencyKey)
                .single();

            if (existing?.result) {
                return NextResponse.json({ ...existing.result, cached: true });
            }
        }
        if (!VALID_STREAMER_IDS.has(missionId) && !missionId.startsWith('boss_')) {
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

        // Anti-cheat: plausibility checks on battle results
        // Max possible HP is ~300 (base 100 + level bonus 100 + threat bonus 50 + equipment 50)
        if (maxHp > 500) {
            return NextResponse.json({ error: 'Implausible max HP value' }, { status: 400 });
        }
        // Boss fights should take at least 3 turns (bosses have 400+ HP, max player damage ~80/turn)
        if (isBoss && !isFailure && turnsUsed < 3) {
            return NextResponse.json({ error: 'Implausible turn count for boss battle' }, { status: 400 });
        }
        // Minimum duration per turn (~2s per turn is the fastest reasonable pace)
        if (!isFailure && duration < turnsUsed * 1500) {
            return NextResponse.json({ error: 'Battle pace too fast for reported turns' }, { status: 400 });
        }

        // 3. Server computes all rewards
        const rank = computeRank(hpRemaining, maxHp, turnsUsed, isFailure);
        const xpGained = computeXp(rank, !!isBoss);
        const ptsGained = computePtsReward(rank);
        const itemsAwarded = computeRewardItems(rank);

        // 4. Fetch current user state
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('xp, level, inventory, pts_balance, completed_missions, faction, updated_at, wins, losses')
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
            wins: number; losses: number;
        };

        // Rate limit: minimum cooldown between mission completions
        if (user.updated_at) {
            const lastUpdate = new Date(user.updated_at).getTime();
            if (Date.now() - lastUpdate < MIN_MISSION_COOLDOWN_MS) {
                return NextResponse.json({ error: 'Mission cooldown active. Try again shortly.' }, { status: 429 });
            }
        }

        // Anti-farm: max completions per streamer per 24h window
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: dailyCount, error: countError } = await supabase
            .from('mission_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('mission_id', missionId)
            .gte('created_at', twentyFourHoursAgo);

        if (!countError && dailyCount !== null && dailyCount >= MAX_COMPLETIONS_PER_STREAMER_PER_DAY) {
            return NextResponse.json({
                error: 'Daily mission limit reached for this streamer. Try a different operative or return tomorrow.',
                dailyLimit: MAX_COMPLETIONS_PER_STREAMER_PER_DAY,
                resetIn: '24h'
            }, { status: 429 });
        }

        // 5. Compute new state (capped to prevent overflow)
        const newXp = Math.min((user.xp || 0) + xpGained, MAX_XP);
        const newLevel = calculateLevel(newXp);
        const newPtsBalance = Math.min((user.pts_balance || 0) + ptsGained, MAX_PTS_BALANCE);
        const newWins = (user.wins || 0) + (!isFailure ? 1 : 0);
        const newLosses = (user.losses || 0) + (isFailure ? 1 : 0);

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

        // 6. Write to DB (with optimistic locking to prevent TOCTOU race)
        const updates: Record<string, unknown> = {
            xp: newXp,
            level: newLevel,
            pts_balance: newPtsBalance,
            inventory: sanitizeInventory(newInventory, currentInventory),
            completed_missions: existingMissions,
            wins: newWins,
            losses: newLosses,
            updated_at: new Date().toISOString()
        };

        // Optimistic lock: only update if updated_at hasn't changed since we read it
        let updateQuery = supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (user.updated_at) {
            updateQuery = updateQuery.eq('updated_at', user.updated_at);
        }

        const { data: updateResult, error: updateError } = await updateQuery.select('id').maybeSingle();

        if (updateError) {
            console.error('Mission complete DB update failed:', updateError);
            return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
        }

        // If no row was updated, another request modified the user between our read and write
        if (!updateResult) {
            return NextResponse.json({ error: 'Conflict: state changed. Please retry.' }, { status: 409 });
        }

        // 7. Store idempotency record (BLOCKING — must complete before response
        // to prevent TOCTOU race where duplicate requests slip through)
        if (idempotencyKey && typeof idempotencyKey === 'string') {
            const resultPayload = {
                success: true, rank, xpGained, newXp, newLevel,
                ptsGained, newPtsBalance, newWins, newLosses, itemsAwarded
            };
            const { error: idemError } = await supabase
                .from('mission_completions')
                .upsert({
                    idempotency_key: idempotencyKey,
                    user_id: userId,
                    mission_id: missionId,
                    result: resultPayload,
                    created_at: new Date().toISOString()
                });
            if (idemError) console.error('Mission idempotency insert failed:', idemError);
        }

        // 8. Faction war contribution (if applicable)
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
            newWins,
            newLosses,
            itemsAwarded,
            newInventory: sanitizeInventory(newInventory, currentInventory),
            completedMissions: existingMissions
        });

    } catch (error) {
        console.error('Mission complete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

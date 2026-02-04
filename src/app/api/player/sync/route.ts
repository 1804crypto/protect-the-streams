import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth';
import { calculateLevel } from '@/lib/gameMechanics';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
        // We ignore 'deltaLevel' from client. Server validates progression.
        // 2. Parse Body
        // We ignore 'deltaLevel' from client. Server validates progression.
        const {
            deltaXp,
            inventory,
            missionId,
            rank,
            duration,
            wins,
            losses,
            securedIds,
            streamerNatures,
            completedMissions,
            faction,
            isFactionMinted
        } = await req.json();

        // 3. Validation (Basic Sanity Checks)
        if (deltaXp && deltaXp > 5000) {
            return NextResponse.json({ error: 'Suspicious Activity Detected: XP gain too high' }, { status: 400 });
        }

        // ANTI-CHEAT: Duration Check
        // If a mission was completed (missionId sent), we require a reasonable duration.
        // 30 seconds (30000ms) is the minimum realistic time for a battle.
        if (missionId && (!duration || duration < 30000)) {
            console.warn(`Suspicious Mission Duration: ${duration}ms for User ${userId}`);
            return NextResponse.json({ error: 'Suspicious Cycle Time: Uplink Rejected.' }, { status: 400 });
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
            console.log(`Mission ${missionId} Rank ${rank}: Awarding ${ptsReward} $PTS`);
        }

        // 5. Update DB
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Calculate New State
        const newXp = (user.xp || 0) + (deltaXp || 0);
        const newPtsBalance = (user.pts_balance || 0) + ptsReward;

        // SERVER AUTHORITATIVE LEVEL CALCULATION
        const newLevel = calculateLevel(newXp);

        // Inventory Merge
        const newInventory = inventory || user.inventory;

        const updates: any = {
            xp: newXp,
            level: newLevel,
            inventory: newInventory,
            pts_balance: newPtsBalance,
            updated_at: new Date().toISOString()
        };

        if (wins !== undefined) updates.wins = wins;
        if (losses !== undefined) updates.losses = losses;
        if (securedIds !== undefined) updates.secured_ids = securedIds;
        if (streamerNatures !== undefined) updates.streamer_natures = streamerNatures;
        if (completedMissions !== undefined) updates.completed_missions = completedMissions;
        if (faction !== undefined) updates.faction = faction;
        if (isFactionMinted !== undefined) updates.is_faction_minted = isFactionMinted;

        const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (updateError) {
            console.error("Sync Update Error:", updateError);
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
        console.error("Sync API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseClient';
import { items as battleItems } from '@/data/items';
import { VALID_ITEM_IDS } from '@/lib/sanitizeInventory';

const supabase = getServiceSupabase();

/**
 * POST /api/pvp/validate-item
 *
 * Server-authoritative PvP item validation.
 * Verifies:
 *   1. Auth — user must have a valid session
 *   2. Match — must be ACTIVE and user must be a participant
 *   3. Turn — must be the user's turn
 *   4. Item — must be a valid consumable the user owns
 *   5. Effect — server computes heal/boost and updates match HP
 *
 * Returns the validated effect so the client applies the canonical result.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Auth
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const session = await verifySession(token);
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }
        const userId = session.userId as string;

        // 2. Parse body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { matchId, itemId } = body;

        if (!matchId || typeof matchId !== 'string') {
            return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
        }
        if (!itemId || typeof itemId !== 'string') {
            return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
        }

        // UUID validation for matchId
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(matchId)) {
            return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
        }

        // 3. Validate item exists and is a valid consumable
        if (!VALID_ITEM_IDS.has(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }
        const item = battleItems[itemId];
        if (!item) {
            return NextResponse.json({ error: 'Item not found in catalog' }, { status: 400 });
        }
        if (item.category !== 'consumable') {
            return NextResponse.json({ error: 'Only consumable items can be used in PvP' }, { status: 400 });
        }

        // 4. Fetch match
        const { data: match, error: matchError } = await supabase
            .from('pvp_matches')
            .select('id, attacker_id, defender_id, attacker_hp, defender_hp, turn_player_id, status, attacker_stats, defender_stats')
            .eq('id', matchId)
            .single();

        if (matchError || !match) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }
        if (match.status === 'FINISHED') {
            return NextResponse.json({ error: 'Match already finished' }, { status: 409 });
        }

        // 5. Verify participation
        const isAttacker = match.attacker_id === userId;
        const isDefender = match.defender_id === userId;
        if (!isAttacker && !isDefender) {
            return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }

        // 6. Verify turn
        if (match.turn_player_id !== userId) {
            return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
        }

        // 7. Check inventory — user must own the item
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('inventory, updated_at')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const inventory = (user.inventory || {}) as Record<string, number>;
        const owned = inventory[itemId] || 0;
        if (owned <= 0) {
            return NextResponse.json({ error: 'Item not in inventory' }, { status: 400 });
        }

        // 8. Compute effect
        const currentHp = isAttacker ? match.attacker_hp : match.defender_hp;
        const maxHp = isAttacker
            ? (match.attacker_stats as Record<string, unknown>)?.maxHp as number || 100
            : (match.defender_stats as Record<string, unknown>)?.maxHp as number || 100;

        let newHp = currentHp;
        let effectDescription = '';

        switch (item.effect) {
            case 'heal': {
                // RESTORE_CHIP heals to full, others heal by item.value
                const healAmount = itemId === 'RESTORE_CHIP' ? maxHp : item.value;
                newHp = Math.min(maxHp, currentHp + healAmount);
                effectDescription = `healed ${newHp - currentHp} HP`;
                break;
            }
            case 'restorePP':
                // PP is client-side only in current implementation, just acknowledge
                effectDescription = `restored PP`;
                break;
            case 'boostAttack':
                effectDescription = `attack boosted by ${item.value}x`;
                break;
            case 'boostDefense':
                effectDescription = `defense boosted by ${item.value}x`;
                break;
            default:
                effectDescription = `used ${item.name}`;
        }

        // 9. Deduct item from inventory (optimistic lock)
        const newInventory = { ...inventory, [itemId]: owned - 1 };
        if (newInventory[itemId] <= 0) delete newInventory[itemId];

        let inventoryUpdate = supabase
            .from('users')
            .update({ inventory: newInventory, updated_at: new Date().toISOString() } as Record<string, unknown>)
            .eq('id', userId);

        if (user.updated_at) {
            inventoryUpdate = inventoryUpdate.eq('updated_at', user.updated_at);
        }

        const { data: invResult } = await (inventoryUpdate as unknown as {
            select: (_s: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        })
            .select('id')
            .maybeSingle();

        if (!invResult) {
            return NextResponse.json({ error: 'Inventory conflict — retry' }, { status: 409 });
        }

        // 10. Update match HP + advance turn
        const opponentId = isAttacker ? match.defender_id : match.attacker_id;
        const hpField = isAttacker ? 'attacker_hp' : 'defender_hp';

        const matchUpdate: Record<string, unknown> = {
            [hpField]: newHp,
            turn_player_id: opponentId,
            last_update: new Date().toISOString(),
        };

        const { error: matchUpdateError } = await supabase
            .from('pvp_matches')
            .update(matchUpdate)
            .eq('id', matchId);

        if (matchUpdateError) {
            console.error('[PvP ValidateItem] Match update failed:', matchUpdateError.message);
            return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            itemId,
            itemName: item.name,
            effect: item.effect,
            effectValue: item.value,
            newHp,
            hpHealed: newHp - currentHp,
            description: effectDescription,
            nextTurnPlayerId: opponentId,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[PvP ValidateItem] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

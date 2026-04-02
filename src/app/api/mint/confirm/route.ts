import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabase = getServiceSupabase();

/**
 * POST /api/mint/confirm
 *
 * Called by the client after on-chain transaction confirmation.
 * Marks the mint_attempts record as COMPLETED so the idempotency
 * system prevents duplicate mints on page refresh.
 */
export async function POST(req: NextRequest) {
    try {
        // Verify session — only authenticated users can confirm their own mints
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const session = await verifySession(token);
        if (!session?.wallet) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }
        const wallet = session.wallet as string;

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { idempotencyKey } = body;

        if (!idempotencyKey) {
            return NextResponse.json({ error: 'Missing idempotencyKey' }, { status: 400 });
        }

        // Only transition BUILT → COMPLETED, and only for this user's wallet
        const { data, error } = await supabase
            .from('mint_attempts')
            .update({ status: 'COMPLETED' } as Record<string, unknown>)
            .eq('idempotency_key', idempotencyKey)
            .eq('user_wallet', wallet)
            .eq('status', 'BUILT')
            .select('idempotency_key, status, streamer_id')
            .single();

        if (error || !data) {
            console.warn('[MINT CONFIRM] No BUILT record found for key:', idempotencyKey, 'wallet:', wallet, error?.message);
            return NextResponse.json({
                warning: 'No pending mint found for this key',
                detail: error?.message
            }, { status: 404 });
        }

        // Persist secured_id to the user's record so session restore reflects ownership
        const streamerId = (data as Record<string, unknown>).streamer_id as string | undefined;
        if (streamerId) {
            const { data: userData } = await supabase
                .from('users')
                .select('secured_ids')
                .eq('wallet_address', wallet)
                .single();

            if (userData) {
                const currentIds = (userData as { secured_ids: string[] | null }).secured_ids || [];
                if (!currentIds.includes(streamerId)) {
                    await supabase
                        .from('users')
                        .update({ secured_ids: [...currentIds, streamerId] } as Record<string, unknown>)
                        .eq('wallet_address', wallet);
                }
            }
        }

        console.log('[MINT CONFIRM] Mint confirmed:', data.idempotency_key);
        return NextResponse.json({ success: true, status: 'COMPLETED' });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[MINT CONFIRM] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

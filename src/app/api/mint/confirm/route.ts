import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * POST /api/mint/confirm
 * 
 * Called by the client after on-chain transaction confirmation.
 * Marks the mint_attempts record as COMPLETED so the idempotency
 * system prevents duplicate mints on page refresh.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { idempotencyKey } = body;

        if (!idempotencyKey) {
            return NextResponse.json({ error: 'Missing idempotencyKey' }, { status: 400 });
        }

        // Only transition BUILT → COMPLETED (prevents race conditions)
        const { data, error } = await supabase
            .from('mint_attempts')
            .update({ status: 'COMPLETED' } as Record<string, unknown>)
            .eq('idempotency_key', idempotencyKey)
            .eq('status', 'BUILT')
            .select('idempotency_key, status')
            .single();

        if (error || !data) {
            // Not finding a BUILT record is not fatal — it may already be COMPLETED
            // or the idempotency key was invalid
            console.warn('[MINT CONFIRM] No BUILT record found for key:', idempotencyKey, error?.message);
            return NextResponse.json({
                warning: 'No pending mint found for this key',
                detail: error?.message
            }, { status: 200 });
        }

        console.log('[MINT CONFIRM] Mint confirmed:', data.idempotency_key);
        return NextResponse.json({ success: true, status: 'COMPLETED' });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[MINT CONFIRM] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

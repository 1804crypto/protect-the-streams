import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabase = getServiceSupabase();

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ authenticated: false });
        }

        const session = await verifySession(token);
        if (!session || !session.userId) {
            return NextResponse.json({ authenticated: false });
        }

        // H5 FIX: Explicit column selection — don't expose internal fields
        const { data: user, error } = await supabase
            .from('users')
            .select('id, wallet_address, xp, level, wins, losses, inventory, secured_ids, streamer_natures, completed_missions, faction, pts_balance, is_faction_minted, equipment_slots')
            .eq('id', session.userId)
            .single();

        if (error || !user) {
            return NextResponse.json({ authenticated: false });
        }

        const response = NextResponse.json({
            authenticated: true,
            user: user
        });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;

    } catch (error) {
        console.error("Session API Error:", error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}

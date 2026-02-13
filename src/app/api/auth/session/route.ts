import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
            .select('id, wallet_address, xp, level, wins, losses, inventory, secured_ids, streamer_natures, completed_missions, faction, pts_balance, is_faction_minted')
            .eq('id', session.userId)
            .single();

        if (error || !user) {
            return NextResponse.json({ authenticated: false });
        }

        return NextResponse.json({
            authenticated: true,
            user: user
        });

    } catch (error) {
        console.error("Session API Error:", error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}

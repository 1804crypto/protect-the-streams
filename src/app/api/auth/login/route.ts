import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { signSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseClient';
import { checkRateLimit } from '@/lib/rateLimit';

const supabase = getServiceSupabase();
const LOGIN_RATE_LIMIT = { name: 'auth_login', maxRequests: 15, windowMs: 60_000 };

export async function POST(req: NextRequest) {
    try {
        const limited = checkRateLimit(req, LOGIN_RATE_LIMIT);
        if (limited) return limited;
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { publicKey, signature, message } = body;

        if (process.env.NODE_ENV !== 'production') {
            console.log("Login attempt:", { publicKey, message });
        }

        if (!publicKey || !signature || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify Message Format & Timestamp
        // Expected format: "Sign in to Protect The Streams. Nonce: <timestamp>"
        const timestampMatch = message.match(/Nonce: (\d+)/);
        if (!timestampMatch) {
            return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
        }

        const timestamp = parseInt(timestampMatch[1]);
        const now = Date.now();
        const TWO_MINUTES = 2 * 60 * 1000;

        // Check if timestamp is within accepted window (allow 2 mins past, 30s future for clock skew)
        if (now - timestamp > TWO_MINUTES || timestamp > now + 30 * 1000) {
            return NextResponse.json({ error: 'Signature expired. Please try again.' }, { status: 401 });
        }

        // 2. Verify Signature (always required — no dev bypass)
        try {
            {
                const messageUint8 = new TextEncoder().encode(message);
                const publicKeyUint8 = bs58.decode(publicKey);
                const signatureUint8 = bs58.decode(signature);

                const verified = nacl.sign.detached.verify(
                    messageUint8,
                    signatureUint8,
                    publicKeyUint8
                );

                if (!verified) {
                    console.error("Signature verification failed for", publicKey);
                    return NextResponse.json({ error: 'Invalid signature verification' }, { status: 401 });
                }
            }
        } catch (err) {
            console.error("Signature verification error details:", err);
            return NextResponse.json({ error: 'Signature processing failed' }, { status: 400 });
        }

        // 3. User Lookup / Creation
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', publicKey)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is Row not found
            console.error("DB Fetch Error:", fetchError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        let user = existingUser;

        if (!existingUser) {
            console.log("Creating new user for:", publicKey);
            // Create New User
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    wallet_address: publicKey,
                    username: `Operator_${publicKey.slice(0, 4)}`,
                    // Default values handled by DB
                }])
                .select()
                .single();

            if (createError) {
                console.error("Create User Error:", createError);
                return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
            }
            user = newUser;
        } else {
            // Record exists, no schema-breaking updates required.
        }

        // 4. Issue JWT Session
        const token = await signSession({ userId: user.id, wallet: publicKey });

        // Return only safe fields — don't expose internal DB columns
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                wallet_address: user.wallet_address,
                username: user.username,
                xp: user.xp,
                level: user.level,
                wins: user.wins,
                losses: user.losses,
                inventory: user.inventory,
                secured_ids: user.secured_ids,
                streamer_natures: user.streamer_natures,
                completed_missions: user.completed_missions,
                faction: user.faction,
                pts_balance: user.pts_balance,
                is_faction_minted: user.is_faction_minted,
                equipment_slots: user.equipment_slots,
            },
            message: 'Authenticated successfully'
        });

        // Set HTTP-Only Cookie
        response.cookies.set('pts_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

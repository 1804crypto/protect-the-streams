import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { signSession } from '@/lib/auth';

// Initialize Supabase Service Client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { publicKey, signature, message } = body;

        console.log("Login attempt:", { publicKey, message });

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
        const FIVE_MINUTES = 5 * 60 * 1000;

        // Check if timestamp is within accepted window (allow 5 mins past, 1 min future for clock skew)
        if (now - timestamp > FIVE_MINUTES || timestamp > now + 60 * 1000) {
            return NextResponse.json({ error: 'Signature expired. Please try again.' }, { status: 401 });
        }

        // 2. Verify Signature
        try {
            // Encode message to Uint8Array
            const messageUint8 = new TextEncoder().encode(message);

            // Decode Public Key (Base58)
            const publicKeyUint8 = bs58.decode(publicKey);

            // Decode Signature (Base58) - The logic assumes frontend sends Base58 string
            const signatureUint8 = bs58.decode(signature);

            // Verify
            const verified = nacl.sign.detached.verify(
                messageUint8,
                signatureUint8,
                publicKeyUint8
            );

            if (!verified) {
                console.error("Signature verification failed for", publicKey);
                return NextResponse.json({ error: 'Invalid signature verification' }, { status: 401 });
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
                    last_login: new Date().toISOString(),
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
            // Update Last Login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', existingUser.id);
        }

        // 4. Issue JWT Session
        const token = await signSession({ userId: user.id, wallet: publicKey });

        const response = NextResponse.json({
            success: true,
            user: user,
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

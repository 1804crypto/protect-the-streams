import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { getRpcUrl } from '@/lib/rpc';

// Rate limit: 1 fund request per wallet per hour
const fundRateLimit = new Map<string, number>();
const FUND_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not permitted' }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'No wallet' }, { status: 400 });

    // Rate limit per wallet
    const lastFund = fundRateLimit.get(wallet) || 0;
    if (Date.now() - lastFund < FUND_COOLDOWN_MS) {
        const minutesLeft = Math.ceil((FUND_COOLDOWN_MS - (Date.now() - lastFund)) / 60000);
        return NextResponse.json({ error: `Rate limited. Try again in ${minutesLeft} minutes.` }, { status: 429 });
    }

    try {
        const keyArray = JSON.parse(process.env.BACKEND_WALLET_PRIVATE_KEY || '[]');
        if (keyArray.length === 0) throw new Error("Backend key missing");
        
        const keypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
        const connection = new Connection(getRpcUrl());

        const destPubkey = new PublicKey(wallet);

        // Check if wallet already has SOL to avoid unnecessary transfers
        const balance = await connection.getBalance(destPubkey);
        if (balance > 500000000) { // 0.5 SOL
            return NextResponse.json({ success: true, message: 'Wallet already funded' });
        }

        const tx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: destPubkey,
                lamports: 1000000000 // 1 SOL
            })
        );

        const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
        fundRateLimit.set(wallet, Date.now());
        return NextResponse.json({ success: true, sig });
    } catch (e: any) {
        console.error("Funding error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

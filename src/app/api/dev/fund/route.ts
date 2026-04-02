import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { getRpcUrl } from '@/lib/rpc';

// Rate limit: 1 fund request per wallet per hour
const fundRateLimit = new Map<string, number>();
const FUND_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * DEV-ONLY endpoint: Funds a wallet with 1 SOL for testing.
 * Triple-guarded: NODE_ENV + ENABLE_DEV_FUND flag + non-production RPC check.
 */
export async function GET(req: NextRequest) {
    // Guard 1: Block in production by NODE_ENV
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Guard 2: Require explicit opt-in flag
    if (process.env.ENABLE_DEV_FUND !== 'true') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Guard 3: Block if using mainnet RPC
    const rpcUrl = getRpcUrl();
    if (rpcUrl.includes('mainnet')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'No wallet' }, { status: 400 });

    // Validate wallet address format before using it
    let destPubkey: PublicKey;
    try {
        destPubkey = new PublicKey(wallet);
        if (!PublicKey.isOnCurve(destPubkey.toBytes())) {
            return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

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
        const connection = new Connection(rpcUrl);

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
    } catch (e) {
        console.error("Funding error:", e);
        return NextResponse.json({ error: 'Funding failed' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder, signTransaction, createNoopSigner } from '@metaplex-foundation/umi';
import { create, fetchCollection } from '@metaplex-foundation/mpl-core';
import { CONFIG } from '@/data/config';
import { getMintPrice } from '@/lib/priceOracle';
import { getRpcUrl } from '@/lib/rpc';
import { getServiceSupabase } from '@/lib/supabaseClient';
import { verifySession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

const isDev = process.env.NODE_ENV !== 'production';
const debug = (...args: unknown[]) => { if (isDev) console.log(...args); };

const umi = createUmi(getRpcUrl());

// BUG 25 FIX: Guard module-level init to prevent crash when env var is missing
const BACKEND_PRIVATE_KEY = JSON.parse(process.env.BACKEND_WALLET_PRIVATE_KEY || '[]');
let backendSigner: ReturnType<typeof createSignerFromKeypair> | null = null;

if (BACKEND_PRIVATE_KEY.length > 0) {
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(BACKEND_PRIVATE_KEY));
    backendSigner = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(backendSigner));
} else {
    console.error("FATAL: BACKEND_WALLET_PRIVATE_KEY is missing or empty. Mint API will not function.");
}

// Supabase for mint_attempts table
const supabase = getServiceSupabase();

const MINT_RATE_LIMIT = { name: 'mint_transaction', maxRequests: 10, windowMs: 60_000 };

export async function POST(req: NextRequest) {
    debug('🔧 [API DEBUG] Mint transaction request received');
    let idempotencyKey: string | undefined;
    try {
        // Rate limit: 10 mint requests per IP per minute
        const limited = checkRateLimit(req, MINT_RATE_LIMIT);
        if (limited) return limited;

        if (!backendSigner) {
            return NextResponse.json({ error: 'Server misconfigured: backend wallet not available' }, { status: 503 });
        }

        // Auth: verify session — only authenticated users can mint
        const token = req.cookies.get('pts_session')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const session = await verifySession(token);
        if (!session || !session.wallet) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { streamerId, userPublicKey, currency = 'SOL' } = body;
        idempotencyKey = body.idempotencyKey;
        debug('📋 [API DEBUG] Request params:', { streamerId, userPublicKey, currency, idempotencyKey });

        if (!streamerId || !userPublicKey) {
            console.error('❌ [API DEBUG] Missing required parameters');
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Verify the userPublicKey matches the authenticated session wallet
        if (userPublicKey !== session.wallet) {
            return NextResponse.json({ error: 'Wallet mismatch: userPublicKey does not match authenticated session' }, { status: 403 });
        }

        // IDEMPOTENCY CHECK: Prevent duplicate mints
        if (idempotencyKey) {
            // Check if this key has already been used
            const { data: existing } = await supabase
                .from('mint_attempts')
                .select('status, asset_id')
                .eq('idempotency_key', idempotencyKey)
                .single();

            if (existing?.status === 'COMPLETED') {
                return NextResponse.json({
                    error: 'ALREADY_COMPLETED',
                    message: 'This mint has already been completed.',
                    assetId: existing.asset_id
                }, { status: 409 });
            }

            // BUILT = transaction was built and signed but not yet confirmed on-chain.
            // Client is retrying because confirmation timed out. Block rebuild so we don't
            // generate a conflicting asset_id while the original tx may still land.
            if (existing?.status === 'BUILT') {
                return NextResponse.json({
                    error: 'PENDING_CONFIRMATION',
                    message: 'A transaction for this mint is already in-flight. Please wait for on-chain confirmation before retrying.',
                }, { status: 409 });
            }

            // Also check if this wallet+streamer combo already has a completed mint
            const { data: walletMint } = await supabase
                .from('mint_attempts')
                .select('status, asset_id')
                .eq('user_wallet', userPublicKey)
                .eq('streamer_id', streamerId)
                .eq('status', 'COMPLETED')
                .single();

            if (walletMint) {
                return NextResponse.json({
                    error: 'ALREADY_COMPLETED',
                    message: 'This streamer has already been minted by this wallet.',
                    assetId: walletMint.asset_id
                }, { status: 409 });
            }

            // Insert PENDING record (upsert to handle retries)
            await supabase
                .from('mint_attempts')
                .upsert({
                    idempotency_key: idempotencyKey,
                    user_wallet: userPublicKey,
                    streamer_id: streamerId,
                    status: 'PENDING'
                }, { onConflict: 'idempotency_key' });
        }

        debug(`🎯 [API DEBUG] Building Mint Transaction for ${streamerId} to ${userPublicKey}`);

        const user = publicKey(userPublicKey);
        // NoopSigner wraps the user's publicKey as a Signer for setFeePayer().
        // The user signs client-side; server only needs their address.
        const userSigner = createNoopSigner(user);

        // Collection Address
        if (!process.env.NEXT_PUBLIC_COLLECTION_ADDRESS) {
            return NextResponse.json({ error: 'Server misconfigured: collection address not set' }, { status: 503 });
        }
        const collectionAddress = publicKey(process.env.NEXT_PUBLIC_COLLECTION_ADDRESS);
        debug('📦 [API DEBUG] Collection address:', collectionAddress.toString());

        // Fetch Collection to satisfy type requirements
        debug('🔍 [API DEBUG] Fetching collection from chain...');
        const collection = await fetchCollection(umi, collectionAddress);
        debug('✅ [API DEBUG] Collection fetched successfully');

        // Mint Asset (NFT)
        // We generate a new signer for the Asset
        const assetSigner = umi.eddsa.generateKeypair();
        const asset = createSignerFromKeypair(umi, assetSigner);
        debug('🆔 [API DEBUG] Generated new asset ID:', asset.publicKey.toString());

        // Define Metadata URI
        // In production, this should be a stable URL. 
        // For dynamic hosting: current origin + /api/metadata/${streamerId}
        // Since API routes don't easily know absolute URL without config, we'll use a placeholder or derived one.
        // Let's assume the user accesses via the public domain.
        // Use canonical host only — never trust Origin header for metadata URIs
        const canonicalHost = process.env.NEXT_PUBLIC_HOST_URL || 'https://protectthestreamers.xyz';
        const uri = `${canonicalHost}/api/metadata/${streamerId}`;
        debug('🔗 [API DEBUG] Metadata URI:', uri);

        // Build Transaction
        debug('🔨 [API DEBUG] Building transaction...');
        let builder = transactionBuilder()
            // 1. Payment (Transfer SOL from User to Treasury)
            // Note: For USDC/PTS, we would use SPL Token Transfer here.
            // Currently proxied via SOL system transfer for stability.
            .add({
                instruction: {
                    keys: [
                        { pubkey: user, isSigner: true, isWritable: true },
                        { pubkey: publicKey(CONFIG.TREASURY_WALLET), isSigner: false, isWritable: true },
                    ],
                    programId: publicKey('11111111111111111111111111111111'), // System Program
                    data: await (async function () {
                        const data = new Uint8Array(12);
                        data.set([2, 0, 0, 0]); // Index 2 = Transfer

                        // Live price oracle with fallback to hardcoded rates
                        const { priceSol, source } = await getMintPrice(currency, CONFIG.MINT_PRICE);

                        const lamports = BigInt(Math.floor(priceSol * 1_000_000_000));
                        const view = new DataView(data.buffer);
                        view.setBigUint64(4, lamports, true); // Little Endian
                        debug(`💰 [API DEBUG] Processing Payment: ${currency} (${priceSol} SOL = ${lamports} lamports) [source: ${source}]`);
                        return data;
                    })()
                },
                bytesCreatedOnChain: 0,
                signers: [],
            })
            // 2. Create Asset
            .add(create(umi, {
                asset,
                collection: collection,
                name: `PTS Agent: ${streamerId}`,
                uri: uri,
                owner: user,
                authority: backendSigner,
            }));
        debug('✅ [API DEBUG] Transaction builder configured');

        const blockhash = await umi.rpc.getLatestBlockhash();
        debug('⛓️ [API DEBUG] Latest blockhash:', blockhash.blockhash);

        // Build the transaction
        debug('🔧 [API DEBUG] Building final transaction...');
        const transaction = await builder.setFeePayer(userSigner).setBlockhash(blockhash).build(umi);
        debug('✅ [API DEBUG] Transaction built successfully');

        // Sign with Backend (Authority) & Asset (New Mint) - User will sign on frontend
        debug('✍️ [API DEBUG] Signing transaction with backend wallet and asset...');
        const signedTx = await signTransaction(transaction, [backendSigner, asset]);
        debug('✅ [API DEBUG] Transaction signed successfully');

        // Serialize
        const serialized = umi.transactions.serialize(signedTx);
        const base64 = Buffer.from(serialized).toString('base64');
        debug('📦 [API DEBUG] Transaction serialized, length:', base64.length);

        // Update mint_attempts with asset_id — mark as BUILT, not COMPLETED.
        // The user hasn't signed yet; marking COMPLETED here would block legitimate retries
        // if the user cancels or the on-chain transaction fails.
        if (idempotencyKey) {
            await supabase
                .from('mint_attempts')
                .update({ asset_id: asset.publicKey.toString(), status: 'BUILT' } as Record<string, unknown>)
                .eq('idempotency_key', idempotencyKey);
        }

        debug('🎉 [API DEBUG] Returning transaction to frontend');
        return NextResponse.json({
            transaction: base64,
            assetId: asset.publicKey.toString(),
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("💥 [API DEBUG] Mint Transaction Error:", error);
        console.error("💥 [API DEBUG] Error stack:", error instanceof Error ? error.stack : 'N/A');

        // Mark mint attempt as FAILED
        if (idempotencyKey) {
            await supabase
                .from('mint_attempts')
                .update({ status: 'FAILED' } as Record<string, unknown>)
                .eq('idempotency_key', idempotencyKey);
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

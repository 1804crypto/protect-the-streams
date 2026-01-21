import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder, signTransaction } from '@metaplex-foundation/umi';
import { create, fetchCollection } from '@metaplex-foundation/mpl-core';
import { CONFIG } from '@/data/config';
// Imports removed (manual implementation used)
import { base58 } from '@metaplex-foundation/umi/serializers';

// Note: Umi helpers for SOL transfer might need 'mpl-toolbox'
// We will simply use the Umi transaction builder functionality.

const RPC_ENDPOINT = CONFIG.NETWORK === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

const umi = createUmi(RPC_ENDPOINT);

// Load Backend Wallet
const BACKEND_PRIVATE_KEY = JSON.parse(process.env.BACKEND_WALLET_PRIVATE_KEY || '[]');
if (BACKEND_PRIVATE_KEY.length === 0) {
    console.error("Backend Private Key missing!");
}

const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(BACKEND_PRIVATE_KEY));
const backendSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(backendSigner));

export async function POST(req: NextRequest) {
    try {
        const { streamerId, userPublicKey } = await req.json();

        if (!streamerId || !userPublicKey) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        console.log(`Building Mint Transaction for ${streamerId} to ${userPublicKey}`);

        const user = publicKey(userPublicKey);

        // Collection Address
        const collectionAddress = publicKey(process.env.NEXT_PUBLIC_COLLECTION_ADDRESS!);
        // Fetch Collection to satisfy type requirements
        const collection = await fetchCollection(umi, collectionAddress);

        // Mint Asset (NFT)
        // We generate a new signer for the Asset
        const assetSigner = umi.eddsa.generateKeypair();
        const asset = createSignerFromKeypair(umi, assetSigner);

        // Define Metadata URI
        // In production, this should be a stable URL. 
        // For dynamic hosting: current origin + /api/metadata/${streamerId}
        // Since API routes don't easily know absolute URL without config, we'll use a placeholder or derived one.
        // Let's assume the user accesses via the public domain.
        const origin = req.headers.get('origin') || 'https://protect-the-streams.vercel.app';
        const uri = `${origin}/api/metadata/${streamerId}`;

        // Build Transaction
        let builder = transactionBuilder()
            // 1. Payment (Transfer SOL from User to Treasury)
            .add({
                instruction: {
                    keys: [
                        { pubkey: user, isSigner: true, isWritable: true },
                        { pubkey: publicKey(CONFIG.TREASURY_WALLET), isSigner: false, isWritable: true },
                    ],
                    programId: publicKey('11111111111111111111111111111111'), // System Program
                    data: (function () {
                        const data = new Uint8Array(12);
                        data.set([2, 0, 0, 0]); // Index 2 = Transfer
                        const lamports = BigInt(Math.floor(CONFIG.MINT_PRICE * 1_000_000_000));
                        const view = new DataView(data.buffer);
                        view.setBigUint64(4, lamports, true); // Little Endian
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

        const blockhash = await umi.rpc.getLatestBlockhash();

        // Build the transaction
        const transaction = await builder.setFeePayer(user).setBlockhash(blockhash).build(umi);

        // Sign with Backend (Authority) & Asset (New Mint) - User will sign on frontend
        const signedTx = await signTransaction(transaction, [backendSigner, asset]);

        // Serialize
        const serialized = umi.transactions.serialize(signedTx);
        const base64 = Buffer.from(serialized).toString('base64');

        return NextResponse.json({
            transaction: base64,
            assetId: asset.publicKey.toString(),
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        });

    } catch (error: any) {
        console.error("Mint Transaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

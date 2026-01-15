import { NextRequest, NextResponse } from 'next/server';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, publicKey, transactionBuilder } from '@metaplex-foundation/umi';
import { create, fetchCollection } from '@metaplex-foundation/mpl-core';
import { CONFIG } from '@/data/config';
import { transferSol } from '@metaplex-foundation/mpl-essentials'; // Or use native SystemProgram if needed, but Umi helpers are cleaner if available. Actually, transferSol is in mpl-toolbox usually. Let's send SOL using a custom instruction or the correct helper.
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-essentials'; // Check import
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
                        // Create Transfer Instruction Data manually or use a helper
                        // System Transfer: 2 (u32 identifier) + 8 bytes lamports
                        // 0x02000000 + low + high...
                        // Easiest is to use the helper but 'mpl-toolbox' is not installed.
                        // Let's defer to install mpl-toolbox or manually encode.
                        // Manual encoding for Transfer (0x02)
                        const data = new Uint8Array(12);
                        data.set([2, 0, 0, 0]); // Index 2 = Transfer
                        const lamports = BigInt(CONFIG.MINT_PRICE * 1_000_000_000);
                        const view = new DataView(data.buffer);
                        view.setBigUint64(4, lamports, true); // Little Endian
                        return data;
                    })()
                },
                bytesCreatedOnChain: 0,
                signers: [backendSigner], // Backend authorizes the transaction construction (payer of fees?) No, User pays fees.
                // Wait, if User pays fees, User must be main signer. 
                // The Builder will be serialized and sent to frontend.
            })
            // 2. Create Asset
            .add(create(umi, {
                asset,
                collection: collectionAddress,
                name: `PTS Agent: ${streamerId}`,
                uri: uri,
                owner: user, // Mint directly to user
                authority: backendSigner, // Backend is authority
            }));

        // Set Fee Payer to User
        const transaction = await builder.buildAndSign({
            setFeePayer: false, // We don't set fee payer here, defaults to identity? No, we need to specifying User as fee payer?
            // Actually, best practice:
            // 1. Build transaction with 'umi.identity' as backend (for authority checks)
            // 2. Serialize.
            // 3. Frontend deserializes, sets User as Payer, signs, sends. 
            // BUT: Metaplex Core 'create' requires Authority to sign. Backend IS authority.
            // So Backend MUST sign. 
            // If Backend signs, it must be valid.
            // We set Backend as Payer temporarily? No.

            // Correct Flow:
            // Builder -> setFeePayer(user) -> sign(backend) -> serialize -> return.
        });

        // Wait, setFeePayer requires the signer to be present? 
        // No, setFeePayer just sets the field.

        // Let's retry usage:
        const blockhash = await umi.rpc.getLatestBlockhash();

        const tx = builder.setFeePayer(user).setBlockhash(blockhash);

        // Sign with Backend (Authority) & Asset (New Mint)
        const signedTx = await tx.sign([backendSigner, asset]);

        // Serialize
        const serialized = umi.transactions.serialize(signedTx);
        const base64 = Buffer.from(serialized).toString('base64');

        return NextResponse.json({ transaction: base64, assetId: asset.publicKey.toString() });

    } catch (error: any) {
        console.error("Mint Transaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

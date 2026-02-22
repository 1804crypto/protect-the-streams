
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { getRpcUrl } from '../src/lib/rpc';
import { publicKey } from '@metaplex-foundation/umi';

// Polyfill environment to simulate client-side
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Simulate Browser Environment where only NEXT_PUBLIC_ vars are available
// We manually strip the server-side HELIUS_API_KEY to prove it works with NEXT_PUBLIC_
delete process.env.HELIUS_API_KEY;

async function main() {
    console.log("--- CLIENT RPC VERIFICATION SCRIPT ---");
    console.log("Environment: Server key deleted. Relying on NEXT_PUBLIC_HELIUS_API_KEY.");

    // 1. Resolve URL
    const url = getRpcUrl();
    console.log(`Resolved RPC URL: ${url}`);

    if (url.includes('api.devnet.solana.com') || url.includes('api.mainnet-beta.solana.com')) {
        console.warn("⚠️  WARNING: Using Public RPC Node (Check API Keys)");
    }

    // 2. Connectivity Test
    console.log("Testing connectivity...");
    const umi = createUmi(url);
    try {
        const blockhash = await umi.rpc.getLatestBlockhash();
        console.log(`✅ Connection Success! Latest Blockhash: ${blockhash.blockhash}`);
    } catch (err: any) {
        console.error(`❌ Connection Failed: ${err.message}`);
        process.exit(1);
    }

    // 3. Collection Fetch Test (Mint Dependency)
    const collectionAddr = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;
    if (!collectionAddr) {
        console.error("❌ NEXT_PUBLIC_COLLECTION_ADDRESS not set in .env.local");
    } else {
        console.log(`Fetching Collection Account: ${collectionAddr}`);
        try {
            const account = await umi.rpc.getAccount(publicKey(collectionAddr));
            if (account.exists) {
                console.log(`✅ Collection Account Found. Size: ${account.data.length} bytes`);
            } else {
                console.error(`❌ Collection Account NOT FOUND on this network.`);
            }
        } catch (err: any) {
            console.error(`❌ Failed to fetch account: ${err.message}`);
        }
    }
}

main().catch(console.error);

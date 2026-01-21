
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { publicKey } from '@metaplex-foundation/umi';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkWallet() {
    const umi = createUmi('https://api.devnet.solana.com');

    const BACKEND_PRIVATE_KEY = JSON.parse(process.env.BACKEND_WALLET_PRIVATE_KEY || '[]');
    if (BACKEND_PRIVATE_KEY.length === 0) {
        console.error("Backend Private Key missing in .env.local!");
        return;
    }

    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(BACKEND_PRIVATE_KEY));
    const address = keypair.publicKey;
    console.log("Backend Wallet Address:", address.toString());

    const balance = await umi.rpc.getBalance(address);
    console.log("Balance:", Number(balance.basisPoints) / 1_000_000_000, "SOL");

    const collectionAddr = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;
    console.log("Collection Address:", collectionAddr);

    if (collectionAddr) {
        try {
            const exists = await umi.rpc.accountExists(publicKey(collectionAddr));
            console.log("Collection Account Exists:", exists);
        } catch (e) {
            console.log("Error checking collection:", e.message);
        }
    }
}

checkWallet();

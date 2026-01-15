import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const RPC_ENDPOINT = 'https://api.devnet.solana.com';

const main = async () => {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Load Wallet
    const KEYPAIR_PATH = path.resolve(process.cwd(), 'backend-wallet.json');
    if (!fs.existsSync(KEYPAIR_PATH)) {
        console.error("No wallet found at", KEYPAIR_PATH);
        process.exit(1);
    }

    // We only need the public key to airdrop, but we loaded the keypair file to be sure it matches
    const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
    // Reconstruct keypair just to get pubkey easily (or use other lib)
    // Actually, let's just use web3.js Keypair
    const { Keypair } = require('@solana/web3.js');
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    const publicKey = keypair.publicKey;

    console.log("Requesting Airdrop for:", publicKey.toString());

    const balanceBefore = await connection.getBalance(publicKey);
    console.log("Current Balance:", balanceBefore / LAMPORTS_PER_SOL, "SOL");

    try {
        const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
        console.log("Airdrop Signature:", signature);

        console.log("Waiting for confirmation...");
        const confirmation = await connection.confirmTransaction(signature);

        if (confirmation.value.err) {
            throw new Error("Transaction failed");
        }

        const balanceAfter = await connection.getBalance(publicKey);
        console.log("New Balance:", balanceAfter / LAMPORTS_PER_SOL, "SOL");
        console.log("SUCCESS! Wallet funded.");

    } catch (e) {
        console.error("Airdrop Failed:", e);
        console.log("Rate limit likely reached. Please fund manually.");
    }
};

main().catch(console.error);

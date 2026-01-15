import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, generateSigner, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { createCollection } from '@metaplex-foundation/mpl-core';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Use Devnet
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

const main = async () => {
    const umi = createUmi(RPC_ENDPOINT);

    // 1. Load or Generate Backend Wallet
    const KEYPAIR_PATH = path.resolve(process.cwd(), 'backend-wallet.json');
    let backendKeypair: any;

    if (fs.existsSync(KEYPAIR_PATH)) {
        console.log("Loading existing backend wallet...");
        const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
        backendKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    } else {
        console.log("Generating NEW backend wallet...");
        const kp = Keypair.generate();
        backendKeypair = umi.eddsa.createKeypairFromSecretKey(kp.secretKey);
        // Save to file
        fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)));
        console.log("Wallet saved to:", KEYPAIR_PATH);
    }

    const backendSigner = createSignerFromKeypair(umi, backendKeypair);
    umi.use(signerIdentity(backendSigner));

    console.log("Using Wallet Public Key:", backendSigner.publicKey.toString());

    // Check balance
    const balance = await umi.rpc.getBalance(backendSigner.publicKey);
    console.log("Wallet Balance (SOL):", Number(balance.basisPoints) / 1000000000);

    if (Number(balance.basisPoints) < 5000000) { // 0.005 SOL
        console.error("ERROR: Wallet balance too low. Please fund it via Devnet Faucet.");
        console.log("To fund: solana airdrop 1 " + backendSigner.publicKey.toString() + " --url devnet");
        process.exit(1);
    }

    // 2. Create Collection
    console.log("Initializing Collection...");
    const collectionSigner = generateSigner(umi);

    await createCollection(umi, {
        collection: collectionSigner,
        name: 'Protect The Streams',
        uri: 'https://protect-the-streams.vercel.app/api/collection.json',
    }).sendAndConfirm(umi);

    console.log("-----------------------------------------");
    console.log("COLLECTION CREATED SUCCESSFULLY!");
    console.log("Collection Address:", collectionSigner.publicKey.toString());
    console.log("-----------------------------------------");

    // Save to .env.local (helper)
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    if (!envContent.includes('NEXT_PUBLIC_COLLECTION_ADDRESS')) {
        fs.appendFileSync(envPath, `\nNEXT_PUBLIC_COLLECTION_ADDRESS=${collectionSigner.publicKey.toString()}`);
    } else {
        console.log("Update .env.local manually with new collection address if needed.");
    }

    // Save Private Key to .env.local if not present
    if (!envContent.includes('BACKEND_WALLET_PRIVATE_KEY')) {
        fs.appendFileSync(envPath, `\nBACKEND_WALLET_PRIVATE_KEY=${JSON.stringify(Array.from(backendKeypair.secretKey))}`);
    }
};

main().catch(console.error);

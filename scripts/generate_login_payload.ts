
import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const WALLET_PATH = path.join(process.cwd(), 'backend-wallet.json');

function main() {
    try {
        const secretKeyRaw = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
        const secretKey = Uint8Array.from(secretKeyRaw);
        const keypair = nacl.sign.keyPair.fromSecretKey(secretKey);

        const publicKey = bs58.encode(keypair.publicKey);
        const timestamp = Date.now();
        const message = `Sign in to Protect The Streams. Nonce: ${timestamp}`;
        const messageBytes = new TextEncoder().encode(message);

        const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
        const signatureBase58 = bs58.encode(signature);

        console.log(JSON.stringify({
            publicKey,
            signature: signatureBase58,
            message
        }));

    } catch (error) {
        console.error("Error generating payload:", error);
        process.exit(1);
    }
}

main();

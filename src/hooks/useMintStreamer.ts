"use client";

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { CONFIG } from '@/data/config';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';

export const useMintStreamer = () => {
    const { connection } = useConnection();
    const { connected, publicKey, wallet } = useWallet();
    const secureAsset = useCollectionStore(state => state.secureAsset);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);

    const mint = async (streamerId?: string) => {
        if (!connected || !publicKey || !wallet) {
            setError({
                code: "UPLINK_TERMINATED",
                message: "No Resistance Wallet detected. Signal cannot be established."
            });
            return;
        }

        if (!streamerId) {
            setError({ code: "NO_TARGET", message: "No streamer target selected." });
            return;
        }

        setLoading(true);
        setStatus(`Establishing Secure Uplink via Solana (${CONFIG.NETWORK})...`);
        setError(null);
        setSignature(null);

        try {
            // 1. Fetch Transaction from Backend
            setStatus("Constructing Neural Link... [REQUESTING_FRAMEWORK]");

            const response = await fetch('/api/mint/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    streamerId,
                    userPublicKey: publicKey.toBase58()
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Server rejected uplink request.');
            }

            const { transaction: base64Tx, blockhash, lastValidBlockHeight } = await response.json();

            // 2. Deserialize Transaction
            setStatus("Reviewing Corporate Protocols... [USER_SIGNATURE_REQUIRED]");

            const umi = createUmi(connection);
            umi.use(walletAdapterIdentity(wallet.adapter));

            const txBuffer = Buffer.from(base64Tx, 'base64');
            const transaction = umi.transactions.deserialize(new Uint8Array(txBuffer));

            // 3. User Sign
            const signedTx = await umi.identity.signTransaction(transaction);

            // 4. Broadcast with Retry Logic (Exponential Backoff)
            setStatus("Broadcasting Signal... [INJECTING_PAYLOAD]");

            const MAX_RETRIES = 3;
            let attempt = 0;
            let validSignature: Uint8Array | null = null;

            while (attempt < MAX_RETRIES && !validSignature) {
                try {
                    validSignature = await umi.rpc.sendTransaction(signedTx, {
                        skipPreflight: true, // Standard for core minting to reduce latency
                        preflightCommitment: 'processed'
                    });
                } catch (sendErr) {
                    attempt++;
                    if (attempt >= MAX_RETRIES) throw sendErr;
                    setStatus(`Signal Interference Detected. Retrying Link... [ATTEMPT_${attempt}/${MAX_RETRIES}]`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // 2s, 4s, 8s
                }
            }

            if (!validSignature) throw new Error("SIGNAL_LOSS: Max retries exceeded during broadcast.");

            // Deserialize Signature for UI
            const sigString = userFriendlySignature(validSignature);
            setSignature(sigString);

            // 5. Confirm with Persistence
            setStatus("Verifying Chain Integrity... [NODE_CONSENSUS_PENDING]");

            try {
                await umi.rpc.confirmTransaction(validSignature, {
                    strategy: {
                        type: 'blockhash',
                        blockhash: blockhash,
                        lastValidBlockHeight: lastValidBlockHeight
                    },
                    commitment: 'confirmed'
                });
            } catch {
                // If confirmation times out, we do one final check of the signature status
                const statuses = await umi.rpc.getSignatureStatuses([validSignature]);
                const status = statuses[0] as any;
                // Check if status exists and doesn't have an error
                if (!status || status.err || status.confirmationStatus === 'failed') {
                    throw new Error("CENTRAL_NODE_REJECTION: Transaction failed or not found on-chain.");
                }
            }

            // 6. Success
            setStatus("Asset Secured. NFT Verified on Blockchain. Corporate Control Severed.");
            secureAsset(streamerId);
            setLoading(false);

        } catch (err: any) {
            console.error("Mint Error:", err);
            setError({
                code: "SIGNAL_JAMMED",
                message: err.message.includes("User rejected")
                    ? "Uplink Request Rejected by Agent. Security Protocol Intact."
                    : `Network Error: ${err.message}`
            });
            setStatus(null);
            setLoading(false);
        }
    };

    return { mint, loading, status, error, signature };
};

// Helper for display
function userFriendlySignature(sig: Uint8Array): string {
    const bs58 = require('bs58');
    return bs58.encode(sig);
}

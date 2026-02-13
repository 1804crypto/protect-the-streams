"use client";

import { useState, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { CONFIG } from '@/data/config';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import bs58 from 'bs58';

export const useMintStreamer = () => {
    const { connection } = useConnection();
    const { connected, publicKey, wallet } = useWallet();
    const secureAsset = useCollectionStore(state => state.secureAsset);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);
    // Idempotency key: persists across retries, resets on success or non-retryable error
    const idempotencyKeyRef = useRef<string | null>(null);

    const mint = async (streamerId?: string, currency: 'SOL' | 'USDC' | 'PTS' = 'SOL') => {
        console.log('🎯 [MINT DEBUG] Starting mint process', { streamerId, currency, connected, publicKey: publicKey?.toBase58() });

        if (!connected || !publicKey || !wallet) {
            console.error('❌ [MINT DEBUG] Wallet not connected');
            setError({
                code: "UPLINK_TERMINATED",
                message: "No Resistance Wallet detected. Signal cannot be established."
            });
            return;
        }

        if (!streamerId) {
            console.error('❌ [MINT DEBUG] No streamer ID provided');
            setError({ code: "NO_TARGET", message: "No streamer target selected." });
            return;
        }

        console.log('✅ [MINT DEBUG] Wallet connected, starting transaction build');
        setLoading(true);
        setStatus(`Establishing Secure Uplink via Solana (${CONFIG.NETWORK})...`);
        setError(null);
        setSignature(null);

        // Generate idempotency key (reuse existing if retrying)
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }
        const idempotencyKey = idempotencyKeyRef.current;

        try {
            // 1. Fetch Transaction from Backend
            setStatus("Constructing Neural Link... [REQUESTING_FRAMEWORK]");
            console.log('📡 [MINT DEBUG] Fetching transaction from backend API');

            const response = await fetch('/api/mint/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    streamerId,
                    userPublicKey: publicKey.toBase58(),
                    currency,
                    idempotencyKey
                })
            });

            console.log('📡 [MINT DEBUG] API Response status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                console.error('❌ [MINT DEBUG] API returned error:', data);
                throw new Error(data.error || 'Server rejected uplink request.');
            }

            const { transaction: base64Tx, blockhash, lastValidBlockHeight } = await response.json();
            console.log('✅ [MINT DEBUG] Transaction received from backend', { txLength: base64Tx?.length, blockhash });

            // 2. Deserialize Transaction
            setStatus("Reviewing Corporate Protocols... [USER_SIGNATURE_REQUIRED]");
            console.log('🔓 [MINT DEBUG] Deserializing transaction');

            const umi = createUmi(connection);
            umi.use(walletAdapterIdentity(wallet.adapter));

            const txBuffer = Buffer.from(base64Tx, 'base64');
            const transaction = umi.transactions.deserialize(new Uint8Array(txBuffer));
            console.log('✅ [MINT DEBUG] Transaction deserialized successfully');

            // 3. User Sign
            console.log('✍️ [MINT DEBUG] Requesting user signature...');
            const signedTx = await umi.identity.signTransaction(transaction);
            console.log('✅ [MINT DEBUG] Transaction signed by user');

            // 4. Broadcast with Retry Logic (Exponential Backoff)
            setStatus("Broadcasting Signal... [INJECTING_PAYLOAD]");
            console.log('📤 [MINT DEBUG] Broadcasting transaction to Solana');

            const MAX_RETRIES = 3;
            let attempt = 0;
            let validSignature: Uint8Array | null = null;

            while (attempt < MAX_RETRIES && !validSignature) {
                try {
                    console.log(`🔄 [MINT DEBUG] Broadcast attempt ${attempt + 1}/${MAX_RETRIES}`);
                    validSignature = await umi.rpc.sendTransaction(signedTx, {
                        skipPreflight: true, // Standard for core minting to reduce latency
                        preflightCommitment: 'processed'
                    });
                    console.log('✅ [MINT DEBUG] Transaction broadcast successful');
                } catch (sendErr) {
                    attempt++;
                    console.warn(`⚠️ [MINT DEBUG] Broadcast attempt ${attempt} failed:`, sendErr);
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
            console.log('⏳ [MINT DEBUG] Waiting for transaction confirmation...');

            try {
                await umi.rpc.confirmTransaction(validSignature, {
                    strategy: {
                        type: 'blockhash',
                        blockhash: blockhash,
                        lastValidBlockHeight: lastValidBlockHeight
                    },
                    commitment: 'confirmed'
                });
                console.log('✅ [MINT DEBUG] Transaction confirmed on-chain');
            } catch (confirmErr) {
                console.warn('⚠️ [MINT DEBUG] Confirmation timeout, checking status manually...', confirmErr);
                // Wait before checking — RPC node may not have seen the signature yet
                await new Promise(resolve => setTimeout(resolve, 3000));
                // Retry status check up to 3 times with delay
                let confirmed = false;
                for (let check = 0; check < 3; check++) {
                    const statuses = await umi.rpc.getSignatureStatuses([validSignature]);
                    const sigStatus = statuses[0] as any;
                    console.log(`📊 [MINT DEBUG] Transaction status (attempt ${check + 1}):`, sigStatus);
                    if (sigStatus && !sigStatus.err && sigStatus.confirmationStatus !== 'failed') {
                        confirmed = true;
                        break;
                    }
                    if (check < 2) await new Promise(resolve => setTimeout(resolve, 2000));
                }
                if (!confirmed) {
                    throw new Error("CENTRAL_NODE_REJECTION: Transaction failed or not found on-chain.");
                }
                console.log('✅ [MINT DEBUG] Transaction found on-chain despite timeout');
            }

            // 6. Success
            console.log('🎉 [MINT DEBUG] Mint successful! Asset secured.');
            setStatus("Asset Secured. NFT Verified on Blockchain. Corporate Control Severed.");
            secureAsset(streamerId);
            idempotencyKeyRef.current = null; // Reset for next mint
            setLoading(false);

        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            const errCode = err instanceof Error ? (err as Error & { code?: string }).code : undefined;
            console.error('💥 [MINT DEBUG] Critical error in mint flow:', err);
            console.error('💥 [MINT DEBUG] Error details:', { message: errMsg, code: errCode, stack: err instanceof Error ? err.stack : 'N/A' });

            // Determine user-facing error message
            if (errMsg.includes("User rejected")) {
                idempotencyKeyRef.current = null; // User cancelled — reset for next attempt
                setError({
                    code: "SIGNAL_JAMMED",
                    message: "Uplink Request Rejected by Agent. Security Protocol Intact."
                });
            } else if (errMsg.includes("already minted") || errMsg.includes("ALREADY_COMPLETED")) {
                idempotencyKeyRef.current = null; // Already done — clear key
                setError({
                    code: "DUPLICATE_SIGNAL",
                    message: "This asset has already been secured. No duplicate minting needed."
                });
            } else if (errMsg.includes("Server") || errMsg.includes("Network")) {
                setError({
                    code: "UPLINK_FAILURE",
                    message: "Server connection lost. Please try again in a moment."
                });
            } else {
                setError({
                    code: "SIGNAL_JAMMED",
                    message: `Network Error: ${errMsg}`
                });
            }
            setStatus(null);
            setLoading(false);
        }
    };

    return { mint, loading, status, error, signature };
};

// Helper for display
function userFriendlySignature(sig: Uint8Array): string {
    return bs58.encode(sig);
}

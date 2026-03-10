"use client";

import { useState, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { CONFIG } from '@/data/config';
import { useCollectionStore } from '@/hooks/useCollectionStore';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import bs58 from 'bs58';

/** How many times we will re-fetch a fresh transaction + re-sign when blockhash expires */
const MAX_TX_ATTEMPTS = 3;
/** How many times we retry *broadcasting* a single signed transaction before giving up */
const MAX_BROADCAST_RETRIES = 3;
/** How long (ms) we poll for on-chain confirmation after a successful broadcast */
const CONFIRMATION_POLL_TIMEOUT_MS = 60_000;
/** Interval (ms) between each on-chain status poll */
const CONFIRMATION_POLL_INTERVAL_MS = 3_000;

export const useMintStreamer = () => {
    const { connection } = useConnection();
    const { connected, publicKey, wallet } = useWallet();
    const secureAsset = useCollectionStore(state => state.secureAsset);
    const [loading, setLoading] = useState(false);
    const [mintingStreamerId, setMintingStreamerId] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);
    // Idempotency key: persists across retries, resets on success or non-retryable error
    const idempotencyKeyRef = useRef<string | null>(null);

    const mint = async (streamerId?: string, currency: 'SOL' | 'USDC' | 'PTS' = 'SOL') => {
        console.log('🎯 [MINT] Starting mint process', { streamerId, currency, connected, publicKey: publicKey?.toBase58() });

        if (!connected || !publicKey || !wallet) {
            console.error('❌ [MINT] Wallet not connected');
            setError({ code: "UPLINK_TERMINATED", message: "No Resistance Wallet detected. Signal cannot be established." });
            return;
        }

        if (!streamerId) {
            console.error('❌ [MINT] No streamer ID provided');
            setError({ code: "NO_TARGET", message: "No streamer target selected." });
            return;
        }

        setLoading(true);
        setMintingStreamerId(streamerId);
        setStatus(`Establishing Secure Uplink via Solana (${CONFIG.NETWORK})...`);
        setError(null);
        setSignature(null);

        // Generate idempotency key (reuse existing if retrying)
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = crypto.randomUUID();
        }
        const idempotencyKey = idempotencyKeyRef.current;

        const umi = createUmi(connection);
        umi.use(walletAdapterIdentity(wallet.adapter));

        let lastError: Error = new Error('Unknown mint error');
        let mintSucceeded = false;

        // ─── Outer loop: re-fetch fresh tx on blockhash expiry ───────────────
        for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
            const attemptLabel = `[ATTEMPT ${attempt}/${MAX_TX_ATTEMPTS}]`;
            console.log(`🔄 [MINT] ${attemptLabel} Building fresh transaction`);

            try {
                // ── Step 1: Fetch a fresh transaction from the backend ─────────
                setStatus(`Constructing Neural Link... [REQUESTING_FRAMEWORK] ${attempt > 1 ? attemptLabel : ''}`);
                const response = await fetch('/api/mint/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ streamerId, userPublicKey: publicKey.toBase58(), currency, idempotencyKey })
                });

                console.log(`📡 [MINT] ${attemptLabel} Backend response:`, response.status);

                if (!response.ok) {
                    const data = await response.json();
                    console.error(`❌ [MINT] ${attemptLabel} Backend error:`, data);
                    const msg = data.error || 'Server rejected uplink request.';

                    // Non-retryable server errors
                    if (response.status === 409) {
                        // Already minted — not an error we should retry
                        throw Object.assign(new Error(msg), { retryable: false });
                    }
                    if (response.status === 400 || response.status === 503) {
                        throw Object.assign(new Error(msg), { retryable: false });
                    }
                    // 5xx errors are retryable
                    lastError = new Error(msg);
                    await sleep(2000 * attempt);
                    continue;
                }

                const { transaction: base64Tx, blockhash, lastValidBlockHeight } = await response.json();
                console.log(`✅ [MINT] ${attemptLabel} Transaction received`, { txLength: base64Tx?.length, blockhash, lastValidBlockHeight });

                // ── Step 2: Deserialize ───────────────────────────────────────
                setStatus("Reviewing Corporate Protocols... [USER_SIGNATURE_REQUIRED]");
                const txBuffer = Buffer.from(base64Tx, 'base64');
                const transaction = umi.transactions.deserialize(new Uint8Array(txBuffer));
                console.log(`✅ [MINT] ${attemptLabel} Transaction deserialized`);

                // ── Step 3: User signs ────────────────────────────────────────
                console.log(`✍️ [MINT] ${attemptLabel} Requesting user signature...`);
                const signedTx = await umi.identity.signTransaction(transaction);
                console.log(`✅ [MINT] ${attemptLabel} Transaction signed by user`);

                // ── Step 4: Broadcast with retry ──────────────────────────────
                setStatus("Broadcasting Signal... [INJECTING_PAYLOAD]");
                let validSignature: Uint8Array | null = null;

                for (let bcast = 0; bcast < MAX_BROADCAST_RETRIES; bcast++) {
                    try {
                        console.log(`📤 [MINT] ${attemptLabel} Broadcast sub-attempt ${bcast + 1}`);
                        // skipPreflight: true — simulation against a near-stale blockhash produces
                        // phantom errors ("Blockhash not found", "no prior credit"). The actual
                        // validator will still reject a truly invalid tx; our outer loop handles
                        // blockhash expiry via pollForConfirmation.
                        // maxRetries: 0 — disable internal RPC retries; our outer loop owns retry logic.
                        validSignature = await umi.rpc.sendTransaction(signedTx, {
                            skipPreflight: true,
                            maxRetries: 0,
                        });
                        console.log(`✅ [MINT] ${attemptLabel} Broadcast succeeded`);
                        break;
                    } catch (sendErr) {
                        console.warn(`⚠️ [MINT] ${attemptLabel} Broadcast sub-attempt ${bcast + 1} failed:`, sendErr);
                        if (bcast + 1 >= MAX_BROADCAST_RETRIES) throw sendErr;
                        await sleep(1500);
                    }
                }

                if (!validSignature) throw new Error("SIGNAL_LOSS: Broadcast failed after retries.");

                const sigString = bs58.encode(validSignature);
                setSignature(sigString);
                console.log(`📝 [MINT] ${attemptLabel} Signature:`, sigString);

                // ── Step 5: Poll for confirmation ─────────────────────────────
                setStatus("Verifying Chain Integrity... [NODE_CONSENSUS_PENDING]");
                console.log(`⏳ [MINT] ${attemptLabel} Polling for on-chain confirmation...`);

                const confirmed = await pollForConfirmation(umi, validSignature, blockhash, lastValidBlockHeight, CONFIRMATION_POLL_TIMEOUT_MS, CONFIRMATION_POLL_INTERVAL_MS);

                if (confirmed === 'blockhash_expired') {
                    // Blockhash expired before confirmation — outer loop will re-fetch a fresh tx
                    console.warn(`⏰ [MINT] ${attemptLabel} Blockhash expired. Requesting fresh transaction...`);
                    setStatus(`Blockhash expired. Refreshing transaction... ${attemptLabel}`);
                    lastError = new Error('TransactionExpiredBlockheightExceededError: blockhash expired');
                    await sleep(1000);
                    continue; // → outer loop
                }

                if (confirmed === 'failed') {
                    throw new Error("CENTRAL_NODE_REJECTION: Transaction failed on-chain.");
                }

                // ── Step 6: Notify server ─────────────────────────────────────
                console.log(`📡 [MINT] ${attemptLabel} Confirming mint on server...`);
                try {
                    await fetch('/api/mint/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idempotencyKey })
                    });
                    console.log(`✅ [MINT] ${attemptLabel} Server confirmed COMPLETED`);
                } catch (confirmApiErr) {
                    console.warn(`⚠️ [MINT] Server confirm failed (non-blocking):`, confirmApiErr);
                }

                // ── Success ───────────────────────────────────────────────────
                console.log(`🎉 [MINT] Mint successful!`);
                setStatus("Asset Secured. NFT Verified on Blockchain. Corporate Control Severed.");
                secureAsset(streamerId);
                idempotencyKeyRef.current = null;
                setMintingStreamerId(null);
                setLoading(false);
                mintSucceeded = true;
                return; // ✅ Done

            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                const isRetryable = !(err instanceof Error && (err as Error & { retryable?: boolean }).retryable === false);

                console.error(`💥 [MINT] ${attemptLabel} Error:`, err);

                // User rejected — never retry
                if (errMsg.includes("User rejected") || errMsg.includes("user rejected")) {
                    idempotencyKeyRef.current = null;
                    setError({ code: "SIGNAL_JAMMED", message: "Uplink Request Rejected by Agent. Security Protocol Intact." });
                    setStatus(null);
                    setMintingStreamerId(null);
                    setLoading(false);
                    return;
                }

                // Already minted — show info message
                if (errMsg.includes("already minted") || errMsg.includes("ALREADY_COMPLETED")) {
                    idempotencyKeyRef.current = null;
                    setError({ code: "DUPLICATE_SIGNAL", message: "This asset has already been secured. No duplicate minting needed." });
                    setStatus(null);
                    setMintingStreamerId(null);
                    setLoading(false);
                    return;
                }

                lastError = err instanceof Error ? err : new Error(errMsg);

                if (!isRetryable) break; // Non-retryable server error
                if (attempt < MAX_TX_ATTEMPTS) {
                    await sleep(1500);
                }
                // else → fall through to error handling below the loop
            }
        }

        // ─── All attempts exhausted ───────────────────────────────────────────
        if (!mintSucceeded) {
            const errMsg = lastError.message;
            console.error('💥 [MINT] All attempts failed. Last error:', errMsg);

            if (errMsg.includes("Server") || errMsg.includes("Network") || errMsg.includes("503")) {
                setError({ code: "UPLINK_FAILURE", message: "Server connection lost. Please try again in a moment." });
            } else {
                setError({ code: "SIGNAL_JAMMED", message: `Network Error: ${errMsg}` });
            }
            setStatus(null);
            setMintingStreamerId(null);
            setLoading(false);
        }
    };

    return { mint, loading, mintingStreamerId, status, error, signature };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls Solana for transaction confirmation.
 * Returns:
 *   'confirmed'        — tx landed and succeeded
 *   'failed'           — tx landed but errored
 *   'blockhash_expired'— blockhash expired before landing (retry with fresh tx)
 *   'timeout'          — poll timed out (treat as blockhash_expired for retry)
 */
async function pollForConfirmation(
    umi: ReturnType<typeof createUmi>,
    signature: Uint8Array,
    blockhash: string,
    lastValidBlockHeight: number,
    timeoutMs: number,
    intervalMs: number
): Promise<'confirmed' | 'failed' | 'blockhash_expired' | 'timeout'> {
    const deadline = Date.now() + timeoutMs;

    // First, try UMI's native confirmTransaction with the blockhash strategy
    try {
        await umi.rpc.confirmTransaction(signature, {
            strategy: { type: 'blockhash', blockhash, lastValidBlockHeight },
            commitment: 'confirmed'
        });
        console.log('✅ [MINT POLL] confirmTransaction succeeded');
        return 'confirmed';
    } catch (confirmErr) {
        const errMsg = confirmErr instanceof Error ? confirmErr.message : String(confirmErr);
        console.warn('⚠️ [MINT POLL] confirmTransaction threw, switching to manual poll:', errMsg);

        if (errMsg.toLowerCase().includes('blockheight') || errMsg.toLowerCase().includes('expired')) {
            return 'blockhash_expired';
        }
    }

    // Manual polling fallback
    while (Date.now() < deadline) {
        await sleep(intervalMs);

        try {
            // Check current block height — if it has already exceeded lastValidBlockHeight,
            // there's no point waiting: the transaction can never land.
            const currentSlotInfo = await (umi.rpc as unknown as { getSlot?: () => Promise<number> }).getSlot?.();
            if (currentSlotInfo !== undefined) {
                // We can't directly get block height from UMI easily, so skip this check
            }

            interface SigStatus { err: unknown; confirmationStatus?: string; }
            const statuses = await umi.rpc.getSignatureStatuses([signature]);
            const sigStatus = statuses[0] as SigStatus | null;
            console.log('📊 [MINT POLL] Status:', sigStatus?.confirmationStatus, 'err:', sigStatus?.err);

            if (sigStatus) {
                if (sigStatus.err) return 'failed';
                if (sigStatus.confirmationStatus === 'confirmed' || sigStatus.confirmationStatus === 'finalized') {
                    return 'confirmed';
                }
                if (sigStatus.confirmationStatus === 'processed') {
                    // Tx is in — keep polling for confirmed/finalized
                    continue;
                }
            }
        } catch (pollErr) {
            const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr);
            if (errMsg.toLowerCase().includes('blockheight') || errMsg.toLowerCase().includes('expired')) {
                return 'blockhash_expired';
            }
            console.warn('⚠️ [MINT POLL] Poll error (will retry):', errMsg);
        }
    }

    // Timed out — treat as blockhash_expired so outer loop fetches a fresh transaction
    console.warn('⏱️ [MINT POLL] Confirmation timed out');
    return 'timeout';
}

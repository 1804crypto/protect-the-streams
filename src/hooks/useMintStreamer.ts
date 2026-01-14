"use client";

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    Transaction,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';

import { CONFIG } from '@/data/config';
import { useCollectionStore } from '@/hooks/useCollectionStore';

export const useMintStreamer = () => {
    const { connection } = useConnection();
    const { connected, publicKey, sendTransaction } = useWallet();
    const secureAsset = useCollectionStore(state => state.secureAsset);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);

    const mint = async (streamerId?: string) => {
        if (!connected || !publicKey) {
            setError({
                code: "UPLINK_TERMINATED",
                message: "No Resistance Wallet detected. Signal cannot be established."
            });
            return;
        }

        setLoading(true);
        setStatus(`Establishing Secure Uplink via Solana (${CONFIG.NETWORK})...`);
        setError(null);
        setSignature(null);

        try {
            let treasuryPubkey: PublicKey;
            try {
                treasuryPubkey = new PublicKey(CONFIG.TREASURY_WALLET);
            } catch {
                throw new Error("Resistance HQ address corrupted.");
            }

            // Actual On-Chain Verification: Adding a Memo instruction
            // This stores the streamer detection ID permanently on the blockchain
            const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqAB2Cc9BnY64Y9CYfR3M9CByfAnp3sBsc8g");

            const transaction = new Transaction();

            // 1. SOL Transfer (Mint Price)
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: treasuryPubkey,
                    lamports: CONFIG.MINT_PRICE * LAMPORTS_PER_SOL,
                })
            );

            // 2. On-Chain Metadata (MEMO)
            if (streamerId) {
                transaction.add({
                    keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
                    programId: MEMO_PROGRAM_ID,
                    data: Buffer.from(`PTS_MINT:${streamerId}`),
                });
            }

            // Step 1: Initialize
            setStatus("Uplink Protocol Active... [WAITING_FOR_SIGNATURE]");
            const txId = await sendTransaction(transaction, connection);
            setSignature(txId);

            // Step 2: Broadcasting & Verifying (Actual Blockchain Work)
            setStatus("Signal Injected. Broadcasting across Solana Grid... [VALIDATING_HASH]");
            const latestBlockhash = await connection.getLatestBlockhash();

            setStatus("Verifying Chain Integrity... [NODE_CONSENSUS_PENDING]");

            // Step 3: Finalizing (Actual Blockchain Work)
            setStatus("Bypassing Corporate Firewall... [FINALIZING_ASSET_MINT]");
            const confirmation = await connection.confirmTransaction({
                signature: txId,
                ...latestBlockhash
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error("Transaction verification failed on-chain.");
            }

            // Step 4: Asset Sync
            setStatus("Asset Secured. Synchronizing Neural Link... [ESTABLISHING_HEARTBEAT]");
            if (streamerId) {
                secureAsset(streamerId);
            }

            setStatus("Successful Uplink! Asset NFT Verified on Blockchain. Corporate Control Severed.");
            setLoading(false);
        } catch (err: any) {
            console.error("Mint Error:", err);
            setError({
                code: "SIGNAL_JAMMED",
                message: err.message.includes("User rejected")
                    ? "Uplink Request Rejected by Agent. Security Protocol Intact."
                    : `Corporate Jamming: ${err.message}`
            });
            setStatus(null);
            setLoading(false);
        }
    };

    return { mint, loading, status, error, signature };
};

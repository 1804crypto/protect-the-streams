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
    const { secureAsset } = useCollectionStore();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
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

        try {
            let treasuryPubkey: PublicKey;
            try {
                treasuryPubkey = new PublicKey(CONFIG.TREASURY_WALLET);
            } catch {
                setError({
                    code: "CONFIG_ERROR",
                    message: "Resistance HQ address corrupted. Connect to new sector."
                });
                setLoading(false);
                return;
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: treasuryPubkey,
                    lamports: CONFIG.MINT_PRICE * LAMPORTS_PER_SOL,
                })
            );

            // Step 1: Initialize
            setStatus("Uplink Protocol Active... [WAITING_FOR_SIGNATURE]");
            const signature = await sendTransaction(transaction, connection);

            // Step 1.5: Encrypting
            setStatus("Encrypting Neural Metadata... [99%_ASYMMETRIC_LOCK]");
            await new Promise(r => setTimeout(r, 800));

            // Step 2: Broadcasting
            setStatus("Signal Injected. Broadcasting across Solana Grid... [VALIDATING_HASH]");
            const latestBlockhash = await connection.getLatestBlockhash();

            // Step 2.5: Verifying
            setStatus("Verifying Chain Integrity... [NODE_CONSENSUS_PENDING]");
            await new Promise(r => setTimeout(r, 800));

            // Step 3: Finalizing
            setStatus("Bypassing Corporate Firewall... [FINALIZING_ASSET_MINT]");
            await connection.confirmTransaction({
                signature,
                ...latestBlockhash
            });

            // Step 4: Asset Sync
            setStatus("Asset Secured. Synchronizing Neural Link... [ESTABLISHING_HEARTBEAT]");
            if (streamerId) {
                await new Promise(r => setTimeout(r, 1500));
                secureAsset(streamerId);
            }

            setStatus("Asset Verified on Blockchain. Corporate Control Severed. Welcome to the Resistance.");
            setLoading(false);
        } catch (err: any) {
            console.error("Mint Error:", err);
            setError({
                code: "SIGNAL_JAMMED",
                message: err.message.includes("User rejected")
                    ? "Uplink Request Rejected by Agent. Security Protocol Intact."
                    : "Corporate Jamming detected. Transaction Uplink Blocked—Retry Connection."
            });
            setStatus(null);
            setLoading(false);
        }
    };

    return { mint, loading, status, error };
};

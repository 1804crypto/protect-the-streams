"use client";

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { useState } from 'react';

// For this implementation, we will use a SOL transfer as a proxy for $PTS
// to ensure it works without complex SPL-token-setup on Devnet immediately.
// We can easily upgrade to SPL-Tokens later.
export const TREASURY_ADDRESS = new PublicKey("Gv1p8uV1mY9T5V6c89p6X3o9wB1V6c89p6X3o9wB1V6c"); // Placeholder

export const usePtsTransaction = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [txStatus, setTxStatus] = useState<'IDLE' | 'PROCESSING' | 'CONFIRMED' | 'ERROR'>('IDLE');

    const purchaseItem = async (itemId: string, pricePts: number) => {
        if (!publicKey) {
            alert("Uplink terminal not connected. Please connect your Solana wallet.");
            return false;
        }

        setIsProcessing(true);
        setTxStatus('PROCESSING');

        try {
            // Convert PTS price to a small SOL amount for demonstration (e.g., 100 PTS = 0.0001 SOL)
            const solAmount = pricePts / 10000;

            // Ensure lamports is an integer (VERY IMPORTANT for Solana)
            const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY_ADDRESS,
                    lamports: lamports,
                })
            );

            // Fetch and set the latest blockhash manually to be safe
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            // --- Persist for Recovery ---
            const pendingTx = {
                signature,
                itemId,
                pricePts,
                timestamp: Date.now()
            };
            const currentPending = JSON.parse(localStorage.getItem('pts_pending_txs') || '[]');
            localStorage.setItem('pts_pending_txs', JSON.stringify([...currentPending, pendingTx]));
            // ----------------------------

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            // --- Clear from Recovery after success ---
            const updatedPending = JSON.parse(localStorage.getItem('pts_pending_txs') || '[]')
                .filter((tx: any) => tx.signature !== signature);
            localStorage.setItem('pts_pending_txs', JSON.stringify(updatedPending));
            // ------------------------------------------

            console.log("Transaction confirmed:", signature);
            setTxStatus('CONFIRMED');
            setIsProcessing(false);
            return true;
        } catch (error: any) {
            console.error("Uplink failure:", error);

            // Specific check for user rejection
            if (error.name === 'WalletSendTransactionError' && error.message.includes('User rejected')) {
                console.warn("Transaction rejected by user.");
            }

            setTxStatus('ERROR');
            setIsProcessing(false);
            return false;
        }
    };

    return {
        purchaseItem,
        isProcessing,
        txStatus,
        setTxStatus
    };
};

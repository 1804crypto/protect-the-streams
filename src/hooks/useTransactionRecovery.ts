"use client";

import { useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useCollectionStore } from './useCollectionStore';

export const useTransactionRecovery = () => {
    const { connection } = useConnection();
    const { addItem, updateResistanceScore } = useCollectionStore();

    const recoverTransactions = useCallback(async () => {
        const pendingTxsString = localStorage.getItem('pts_pending_txs');
        if (!pendingTxsString) return;

        let pendingTxs = JSON.parse(pendingTxsString);
        if (pendingTxs.length === 0) return;

        console.log(`[Heartbeat] Checking ${pendingTxs.length} pending transactions...`);

        const updatedPending = [...pendingTxs];
        let hasChanges = false;

        for (const tx of pendingTxs) {
            try {
                const status = await connection.getSignatureStatus(tx.signature);

                if (status && status.value) {
                    const confirmationStatus = status.value.confirmationStatus;
                    const err = status.value.err;

                    if (err) {
                        console.error(`[Recovery] Transaction ${tx.signature} failed:`, err);
                        const index = updatedPending.findIndex(p => p.signature === tx.signature);
                        if (index > -1) updatedPending.splice(index, 1);
                        hasChanges = true;
                    } else if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
                        console.log(`[Recovery] Transaction confirmed! Granting item: ${tx.itemId}`);

                        // Grant the item
                        addItem(tx.itemId, 1);

                        // Update resistance score (1:1 with PTS price)
                        updateResistanceScore(tx.pricePts);

                        // Remove from pending
                        const index = updatedPending.findIndex(p => p.signature === tx.signature);
                        if (index > -1) updatedPending.splice(index, 1);
                        hasChanges = true;
                    }
                } else {
                    // If tx is very old (e.g., > 30 mins) and still not found, remove it
                    const age = Date.now() - tx.timestamp;
                    if (age > 1800000) { // 30 mins
                        console.warn(`[Recovery] Transaction ${tx.signature} timed out.`);
                        const index = updatedPending.findIndex(p => p.signature === tx.signature);
                        if (index > -1) updatedPending.splice(index, 1);
                        hasChanges = true;
                    }
                }
            } catch (error) {
                console.error(`[Recovery] Error checking status for ${tx.signature}:`, error);
            }
        }

        if (hasChanges) {
            localStorage.setItem('pts_pending_txs', JSON.stringify(updatedPending));
        }
    }, [connection, addItem, updateResistanceScore]);

    useEffect(() => {
        // Run once on mount
        recoverTransactions();

        // Then run every 60 seconds
        const interval = setInterval(recoverTransactions, 60000);
        return () => clearInterval(interval);
    }, [recoverTransactions]);

    return { recoverTransactions };
};

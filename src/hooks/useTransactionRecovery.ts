"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useCollectionStore } from './useCollectionStore';
import { toast } from '@/hooks/useToastStore';

export const useTransactionRecovery = () => {
    const { connection } = useConnection();
    const addItem = useCollectionStore(state => state.addItem);
    const updateResistanceScore = useCollectionStore(state => state.updateResistanceScore);

    const recoverTransactions = useCallback(async () => {
        const pendingTxsString = localStorage.getItem('pts_pending_txs');
        if (!pendingTxsString) return;

        let pendingTxs = JSON.parse(pendingTxsString);
        if (pendingTxs.length === 0) return;

        const updatedPending = [...pendingTxs];
        let hasChanges = false;

        for (const tx of pendingTxs) {
            try {
                const status = await connection.getSignatureStatus(tx.signature);

                if (status && status.value) {
                    const confirmationStatus = status.value.confirmationStatus;
                    const err = status.value.err;

                    if (err) {
                        toast.error('Transaction Failed', `Signature: ${tx.signature.slice(0, 8)}...`);
                        console.error(`[Recovery] Transaction ${tx.signature} failed:`, err);
                        const index = updatedPending.findIndex(p => p.signature === tx.signature);
                        if (index > -1) updatedPending.splice(index, 1);
                        hasChanges = true;
                    } else if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
                        toast.success('Purchase Verified!', `Received item: ${tx.itemId}`);

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

    // Use a ref to always call the latest version of recoverTransactions
    // without restarting the interval
    const recoverRef = useRef(recoverTransactions);
    useEffect(() => { recoverRef.current = recoverTransactions; }, [recoverTransactions]);

    useEffect(() => {
        // Run once on mount
        recoverRef.current();

        // Single stable interval — never piles up
        const interval = setInterval(() => recoverRef.current(), 60000);
        return () => clearInterval(interval);
    }, []); // Empty deps: interval starts once, never restarts

    return { recoverTransactions };
};

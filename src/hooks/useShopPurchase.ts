"use client";

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCollectionStore } from './useCollectionStore';
import { toast } from './useToastStore';
import { CONFIG } from '@/data/config';
import type { ShopPurchaseRequest, ShopPurchaseResponse } from '@/types/sync';

const TREASURY = new PublicKey(CONFIG.TREASURY_WALLET);

function generatePurchaseId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type ShopTxStatus = 'IDLE' | 'PROCESSING' | 'CONFIRMED' | 'ERROR';

export const useShopPurchase = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [txStatus, setTxStatus] = useState<ShopTxStatus>('IDLE');

    const purchaseWithPts = useCallback(async (
        itemId: string,
        quantity: number
    ): Promise<boolean> => {
        setIsProcessing(true);
        setTxStatus('PROCESSING');
        const purchaseId = generatePurchaseId();

        try {
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId,
                    quantity,
                    currency: 'PTS',
                    purchaseId,
                } satisfies ShopPurchaseRequest),
            });

            const data: ShopPurchaseResponse = await res.json();

            if (data.success) {
                useCollectionStore.setState({
                    inventory: data.newInventory,
                    ptsBalance: data.newPtsBalance,
                });
                setTxStatus('CONFIRMED');
                toast.success('Item Acquired', `Purchase complete.`);
                return true;
            } else {
                setTxStatus('ERROR');
                toast.error('Purchase Failed', data.error || 'Unknown error');
                return false;
            }
        } catch {
            setTxStatus('ERROR');
            toast.error('Network Error', 'Could not reach server.');
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const purchaseWithSol = useCallback(async (
        itemId: string,
        quantity: number,
        priceSolPerUnit: number
    ): Promise<boolean> => {
        if (!publicKey) {
            toast.warning('Wallet Not Connected', 'Connect your wallet to pay with SOL.');
            return false;
        }

        setIsProcessing(true);
        setTxStatus('PROCESSING');
        const purchaseId = generatePurchaseId();

        try {
            // 1. Build and send SOL transfer to treasury
            const totalSol = priceSolPerUnit * quantity;
            const lamports = Math.round(totalSol * LAMPORTS_PER_SOL);

            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TREASURY,
                    lamports,
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            // 2. Submit to server for verification + inventory update
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId,
                    quantity,
                    currency: 'SOL',
                    purchaseId,
                    txSignature: signature,
                } satisfies ShopPurchaseRequest),
            });

            const data: ShopPurchaseResponse = await res.json();

            if (data.success) {
                useCollectionStore.setState({
                    inventory: data.newInventory,
                    ptsBalance: data.newPtsBalance,
                });
                setTxStatus('CONFIRMED');
                toast.success('SOL Purchase Complete', 'Item secured.');
                return true;
            } else {
                setTxStatus('ERROR');
                toast.error('Verification Failed', data.error || 'Server rejected purchase.');
                return false;
            }
        } catch (err) {
            setTxStatus('ERROR');
            const msg = err instanceof Error ? err.message : 'Transaction failed';

            // Check for user rejection
            if (err instanceof Error && err.message.includes('User rejected')) {
                toast.warning('Transaction Cancelled', 'You rejected the transaction.');
            } else {
                toast.error('SOL Purchase Failed', msg);
            }
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [publicKey, connection, sendTransaction]);

    return {
        purchaseWithPts,
        purchaseWithSol,
        isProcessing,
        txStatus,
        setTxStatus,
    };
};

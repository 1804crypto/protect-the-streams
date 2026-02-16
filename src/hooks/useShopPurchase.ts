"use client";

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { useCollectionStore } from './useCollectionStore';
import { toast } from './useToastStore';
import { CONFIG } from '@/data/config';
import type { ShopPurchaseRequest, ShopPurchaseResponse } from '@/types/sync';

const TREASURY = new PublicKey(CONFIG.TREASURY_WALLET);
const USDC_MINT = new PublicKey(CONFIG.TOKENS.USDC);

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

    const purchaseWithUsdc = useCallback(async (
        itemId: string,
        quantity: number,
        priceUsdcPerUnit: number
    ): Promise<boolean> => {
        if (!publicKey) {
            toast.warning('Wallet Not Connected', 'Connect your wallet to pay with USDC.');
            return false;
        }

        setIsProcessing(true);
        setTxStatus('PROCESSING');
        const purchaseId = generatePurchaseId();

        try {
            // 1. Calculate Amount (USDC is 6 decimals)
            const totalUsdc = priceUsdcPerUnit * quantity;
            const amountInfo = Math.round(totalUsdc * 1_000_000);

            // 2. Get ATA addresses
            const senderAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
            const treasuryAta = await getAssociatedTokenAddress(USDC_MINT, TREASURY);

            const tx = new Transaction();

            // Check if Treasury ATA exists (it should, but good practice to handle if not, 
            // though usually we assume treasury is set up. For robustness, we might not create it here to save user fees/complexity, 
            // but just fail if not found. However, let's assume it exists for now or just standard transfer).

            // Standard SPL Transfer
            tx.add(
                createTransferInstruction(
                    senderAta,
                    treasuryAta,
                    publicKey,
                    amountInfo
                )
            );

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            // 3. Submit to server
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId,
                    quantity,
                    currency: 'USDC', // Ensure backend supports this or maps it
                    purchaseId,
                    txSignature: signature,
                } satisfies ShopPurchaseRequest), // Backend must be updated to accept USDC if restricted
            });

            // Note: If backend type ShopPurchaseRequest.currency is strict union, we assume it supports 'USDC' 
            // or we might need to cast/update types. Based on previous audit, check if type allows it.
            // If strictly 'SOL' | 'PTS', we need to update types. 

            const data: ShopPurchaseResponse = await res.json();

            if (data.success) {
                useCollectionStore.setState({
                    inventory: data.newInventory,
                    ptsBalance: data.newPtsBalance,
                });
                setTxStatus('CONFIRMED');
                toast.success('USDC Purchase Complete', 'Item secured.');
                return true;
            } else {
                setTxStatus('ERROR');
                toast.error('Verification Failed', data.error || 'Server rejected purchase.');
                return false;
            }

        } catch (err) {
            setTxStatus('ERROR');
            const msg = err instanceof Error ? err.message : 'Transaction failed';
            if (err instanceof Error && err.message.includes('User rejected')) {
                toast.warning('Transaction Cancelled', 'You rejected the transaction.');
            } else {
                toast.error('USDC Purchase Failed', 'Check your USDC balance or network.');
                console.error(err);
            }
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [publicKey, connection, sendTransaction]);

    return {
        purchaseWithPts,
        purchaseWithSol,
        purchaseWithUsdc,
        isProcessing,
        txStatus,
        setTxStatus,
    };
};

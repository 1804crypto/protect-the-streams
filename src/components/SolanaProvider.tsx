"use client";

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { CONFIG } from '@/data/config';
import { getRpcUrl } from '@/lib/rpc';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { toast } from '@/hooks/useToastStore';

export const SolanaProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    // BUG 24 FIX: Use CONFIG.NETWORK as single source of truth to prevent divergence
    const network = (CONFIG.NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Devnet;

    // Use centralized RPC resolver to ensure consistent behavior with backend
    const endpoint = useMemo(() => getRpcUrl(), [network]);

    const wallets = useMemo(() => [
        new PhantomWalletAdapter()
    ], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect
                onError={(error) => {
                    // Suppress WalletNotReadyError - this is normal when no wallet is installed
                    if (error.name === 'WalletNotReadyError') {
                        toast.warning('Wallet Not Ready', 'Please install or unlock a Solana wallet.');
                        return;
                    }
                    toast.error('Wallet Error', error.message || 'Connection failed.');
                    console.error('Wallet error:', error);
                }}
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

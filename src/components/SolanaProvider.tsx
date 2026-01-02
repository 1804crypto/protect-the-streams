"use client";

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // most modern wallets now implement the Wallet Standard and are automatically detected
    const wallets = useMemo(() => [], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider
                wallets={wallets}
                autoConnect
                onError={(error) => {
                    // Suppress WalletNotReadyError - this is normal when no wallet is installed
                    if (error.name === 'WalletNotReadyError') {
                        console.log('Wallet not ready. Please connect a Solana wallet.');
                        return;
                    }
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

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { toast } from '@/hooks/useToastStore';
import { useCollectionStore } from '@/hooks/useCollectionStore';

export const useUserAuth = () => {
    const { publicKey, signMessage } = useWallet();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const { syncFromCloud } = useCollectionStore();

    const login = useCallback(async () => {
        if (!publicKey) {
            toast.error("Wallet not connected", "Please connect your wallet first.");
            return;
        }

        if (!signMessage) {
            toast.error("Wallet does not support signing", "Your wallet doesn't support message signing.");
            return;
        }

        setIsAuthenticating(true);

        try {
            const timestamp = Date.now();
            const message = `Sign in to Protect The Streams. Nonce: ${timestamp}`;
            const messageEncoded = new TextEncoder().encode(message);

            // Request signature
            const signature = await signMessage(messageEncoded);

            // Encode signature to Base58 to send to API
            const signatureBase58 = bs58.encode(signature);

            // Call Backend
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicKey: publicKey.toBase58(),
                    signature: signatureBase58,
                    message,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (data.success && data.user) {
                syncFromCloud(data.user);
                setIsAuthenticated(true);
                toast.success("Identity Verified", "Using Cloud Save data.");
            }

        } catch (error: any) {
            console.error("Auth Error:", error);
            if (error?.message?.includes('User rejected') || error?.name === 'WalletSignTransactionError') {
                toast.warning("Auth Cancelled", "Signature request was rejected.");
            } else {
                toast.error("Authentication Failed", error.message || "Connection interrupted.");
            }
        } finally {
            setIsAuthenticating(false);
        }
    }, [publicKey, signMessage, syncFromCloud]);

    return {
        isAuthenticated,
        isAuthenticating,
        login,
        publicKey
    };
};

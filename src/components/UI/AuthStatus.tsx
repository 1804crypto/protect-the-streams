"use client";

import React, { useState } from 'react';
import { useUserAuth } from '@/hooks/useUserAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCollectionStore } from '@/hooks/useCollectionStore';

export const AuthStatus = () => {
    const { connected } = useWallet();
    const { isAuthenticated, isAuthenticating, login } = useUserAuth();
    const setAuthenticated = useCollectionStore(state => state.setAuthenticated);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // Best-effort; client state still clears
        } finally {
            setAuthenticated(false);
            setIsLoggingOut(false);
        }
    };

    if (!connected) return null;

    if (isAuthenticated) {
        return (
            <div className="flex items-center gap-1">
                <div className="flex items-center gap-2 px-3 py-2 border border-neon-green/30 bg-neon-green/5 text-[10px] font-mono text-neon-green">
                    <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse shadow-[0_0_5px_rgba(0,255,100,0.8)]" />
                    COMMANDER_ONLINE
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-2 py-2 text-[9px] font-mono text-white/30 hover:text-red-400 transition-colors uppercase tracking-widest"
                    title="Sign out"
                    aria-label="Sign out"
                >
                    {isLoggingOut ? '...' : 'OUT'}
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={login}
            disabled={isAuthenticating}
            className="px-4 py-2 bg-resistance-accent/10 border border-resistance-accent text-resistance-accent hover:bg-resistance-accent hover:text-white transition-all text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"
        >
            {isAuthenticating ? (
                <>
                    <span className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    VERIFYING...
                </>
            ) : (
                <>
                    <span>📡</span>
                    ESTABLISH_UPLINK
                </>
            )}
        </button>
    );
};

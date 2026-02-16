/**
 * Centralized Solana RPC URL resolver.
 * 
 * Priority chain:
 * 1. SOLANA_RPC_URL env var (user-configured dedicated RPC)
 * 2. HELIUS_API_KEY env var → Helius endpoint
 * 3. Public RPC fallback (rate-limited, not for production traffic)
 * 
 * Usage:
 *   import { getRpcUrl } from '@/lib/rpc';
 *   const umi = createUmi(getRpcUrl());
 */

import { CONFIG } from '@/data/config';

const NETWORK = CONFIG.NETWORK || 'devnet';

// Helius free tier endpoints
const HELIUS_ENDPOINTS: Record<string, string> = {
    'devnet': 'https://devnet.helius-rpc.com',
    'mainnet-beta': 'https://mainnet.helius-rpc.com',
};

// Public fallbacks (rate-limited — last resort only)
const PUBLIC_ENDPOINTS: Record<string, string> = {
    'devnet': 'https://api.devnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

let _cachedUrl: string | null = null;

/**
 * Get the best available Solana RPC URL.
 * Result is cached for the lifetime of the process.
 */
export function getRpcUrl(): string {
    if (_cachedUrl) return _cachedUrl;

    // 1. Explicit env var — highest priority
    if (process.env.SOLANA_RPC_URL) {
        _cachedUrl = process.env.SOLANA_RPC_URL;
        console.log(`[RPC] Using configured SOLANA_RPC_URL`);
        return _cachedUrl;
    }

    // 2. Helius API key → construct endpoint
    if (process.env.HELIUS_API_KEY) {
        const base = HELIUS_ENDPOINTS[NETWORK] || HELIUS_ENDPOINTS['devnet'];
        _cachedUrl = `${base}/?api-key=${process.env.HELIUS_API_KEY}`;
        console.log(`[RPC] Using Helius ${NETWORK} RPC`);
        return _cachedUrl;
    }

    // 3. Public fallback (⚠️ rate-limited)
    _cachedUrl = PUBLIC_ENDPOINTS[NETWORK] || PUBLIC_ENDPOINTS['devnet'];
    if (process.env.NODE_ENV === 'production') {
        console.warn(`[RPC] ⚠️ Using public ${NETWORK} RPC — set SOLANA_RPC_URL or HELIUS_API_KEY for production traffic`);
    }
    return _cachedUrl;
}

/**
 * Get RPC network name for display.
 */
export function getNetworkName(): string {
    return NETWORK;
}

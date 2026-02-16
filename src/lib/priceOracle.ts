/**
 * Price Oracle — Fetches live SOL/USD rates from CoinGecko (free, no API key).
 * Uses a 60-second in-memory cache to avoid rate limits.
 * Falls back to hardcoded rates if the API is unreachable.
 */

interface PriceCache {
    solUsd: number;
    updatedAt: number;
}

let cache: PriceCache | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

// Hardcoded fallbacks — used when CoinGecko is unreachable
const FALLBACK_SOL_USD = 150; // ~$150 SOL as a conservative fallback
const FALLBACK_RATES = {
    SOL: 0.01,     // 0.01 SOL per mint (from CONFIG.MINT_PRICE)
    USDC: 0.005,   // Was hardcoded as ~0.005 SOL
    PTS: 0.0001,   // Was hardcoded as ~0.0001 SOL
};

// PTS token has a fixed internal valuation (not market-traded)
const PTS_USD_VALUE = 0.01; // 1 PTS = $0.01 USD

/**
 * Fetch SOL/USD price from CoinGecko.
 * Returns cached value if within TTL.
 */
async function fetchSolPrice(): Promise<number> {
    const now = Date.now();
    if (cache && now - cache.updatedAt < CACHE_TTL_MS) {
        return cache.solUsd;
    }

    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { signal: AbortSignal.timeout(5000) } // 5s timeout
        );

        if (!res.ok) {
            console.warn(`[PriceOracle] CoinGecko returned ${res.status}, using fallback`);
            return cache?.solUsd ?? FALLBACK_SOL_USD;
        }

        const data = await res.json();
        const solUsd = data?.solana?.usd;

        if (typeof solUsd !== 'number' || solUsd <= 0) {
            console.warn('[PriceOracle] Invalid price data from CoinGecko, using fallback');
            return cache?.solUsd ?? FALLBACK_SOL_USD;
        }

        cache = { solUsd, updatedAt: now };
        return solUsd;
    } catch (err) {
        console.warn('[PriceOracle] Failed to fetch SOL price, using fallback:', err);
        return cache?.solUsd ?? FALLBACK_SOL_USD;
    }
}

/**
 * Get the mint price in SOL for a given currency.
 * @param currency - 'SOL' | 'USDC' | 'PTS'
 * @param mintPriceSol - Base mint price in SOL (default: 0.01)
 * @returns Price in SOL
 */
export async function getMintPrice(
    currency: 'SOL' | 'USDC' | 'PTS',
    mintPriceSol: number = 0.01
): Promise<{ priceSol: number; solUsd: number; source: 'live' | 'cached' | 'fallback' }> {
    if (currency === 'SOL') {
        return { priceSol: mintPriceSol, solUsd: 0, source: 'live' };
    }

    try {
        const solUsd = await fetchSolPrice();
        const source: 'live' | 'cached' | 'fallback' = cache && Date.now() - cache.updatedAt < 1000
            ? 'live'
            : cache ? 'cached' : 'fallback';

        if (currency === 'USDC') {
            // 1 USDC ≈ $1 USD → convert mint price from SOL to USDC equivalent in SOL
            // If mint = 0.01 SOL and SOL = $150, that's $1.50. In USDC that's 1.50 USDC = 1.50/150 = 0.01 SOL
            // Effectively the same in SOL terms, but we want the USD-equivalent price
            const usdPrice = mintPriceSol * solUsd; // USD value of the mint
            const usdcInSol = usdPrice / solUsd; // Convert back — for USDC it's the same SOL amount
            return { priceSol: usdcInSol, solUsd, source };
        }

        if (currency === 'PTS') {
            // PTS has a fixed USD value. Calculate how many SOL that equals.
            const ptsInSol = PTS_USD_VALUE / solUsd;
            return { priceSol: ptsInSol, solUsd, source };
        }

        return { priceSol: mintPriceSol, solUsd, source: 'fallback' };
    } catch {
        // Total fallback
        return {
            priceSol: FALLBACK_RATES[currency] ?? mintPriceSol,
            solUsd: FALLBACK_SOL_USD,
            source: 'fallback'
        };
    }
}

/**
 * Get all current price rates for display / API.
 */
export async function getAllPrices(): Promise<{
    solUsd: number;
    mintPriceSol: number;
    mintPriceUsd: number;
    ptsValueUsd: number;
    ptsValueSol: number;
    source: 'live' | 'cached' | 'fallback';
}> {
    const mintPriceSol = 0.01;
    let solUsd: number;
    let source: 'live' | 'cached' | 'fallback';

    try {
        solUsd = await fetchSolPrice();
        source = cache && Date.now() - cache.updatedAt < 1000 ? 'live' : 'cached';
    } catch {
        solUsd = FALLBACK_SOL_USD;
        source = 'fallback';
    }

    return {
        solUsd,
        mintPriceSol,
        mintPriceUsd: mintPriceSol * solUsd,
        ptsValueUsd: PTS_USD_VALUE,
        ptsValueSol: PTS_USD_VALUE / solUsd,
        source,
    };
}

// For testing: reset the cache
export function _resetCache(): void {
    cache = null;
}

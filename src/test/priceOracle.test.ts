import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMintPrice, getAllPrices, _resetCache } from '@/lib/priceOracle';

/**
 * Tests for the Price Oracle module.
 * Mocks fetch to simulate CoinGecko responses and failures.
 */

describe('priceOracle', () => {
    beforeEach(() => {
        _resetCache();
        vi.restoreAllMocks();
    });

    describe('getMintPrice', () => {
        it('returns mintPriceSol directly for SOL currency', async () => {
            const result = await getMintPrice('SOL', 0.01);
            expect(result.priceSol).toBe(0.01);
            expect(result.source).toBe('live');
        });

        it('returns mintPriceSol with custom amount for SOL', async () => {
            const result = await getMintPrice('SOL', 0.05);
            expect(result.priceSol).toBe(0.05);
        });

        it('fetches live price for USDC currency', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: 150 } }),
            } as Response);

            const result = await getMintPrice('USDC', 0.01);
            expect(result.priceSol).toBeCloseTo(0.01, 4);
            expect(result.solUsd).toBe(150);
        });

        it('fetches live price for PTS currency', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: 200 } }),
            } as Response);

            const result = await getMintPrice('PTS', 0.01);
            // PTS = $0.01 USD, SOL = $200 → 0.01 / 200 = 0.00005 SOL
            expect(result.priceSol).toBeCloseTo(0.00005, 6);
            expect(result.solUsd).toBe(200);
        });

        it('falls back gracefully when fetch fails', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

            const result = await getMintPrice('USDC', 0.01);
            // Should use fallback value
            expect(result.priceSol).toBeGreaterThan(0);
            expect(result.source).toBe('fallback');
        });

        it('falls back when CoinGecko returns non-200', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: false,
                status: 429,
            } as Response);

            const result = await getMintPrice('PTS', 0.01);
            expect(result.source).toBe('fallback');
        });
    });

    describe('cache behavior', () => {
        it('caches price for subsequent calls', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: 150 } }),
            } as Response);

            await getMintPrice('USDC', 0.01);
            await getMintPrice('PTS', 0.01);

            // Should only fetch once (second call uses cache)
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('re-fetches after cache reset', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: 150 } }),
            } as Response);

            await getMintPrice('USDC', 0.01);
            _resetCache();
            await getMintPrice('USDC', 0.01);

            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('getAllPrices', () => {
        it('returns complete price data', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: 150 } }),
            } as Response);

            const prices = await getAllPrices();
            expect(prices.solUsd).toBe(150);
            expect(prices.mintPriceSol).toBe(0.01);
            expect(prices.mintPriceUsd).toBeCloseTo(1.5, 1); // 0.01 * 150
            expect(prices.ptsValueUsd).toBe(0.01);
            expect(prices.ptsValueSol).toBeCloseTo(0.01 / 150, 6);
        });

        it('handles API failure gracefully', async () => {
            _resetCache(); // Ensure no stale cache from previous tests
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Timeout'));

            const prices = await getAllPrices();
            // Should still return values (fallbacks)
            expect(prices.solUsd).toBeGreaterThan(0);
            expect(prices.mintPriceSol).toBe(0.01);
        });
    });

    describe('price validation', () => {
        it('handles invalid price data from API', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ solana: { usd: -5 } }),
            } as Response);

            const result = await getMintPrice('USDC', 0.01);
            // Should fallback due to negative price
            expect(result.priceSol).toBeGreaterThan(0);
        });

        it('handles null response body', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({}),
            } as Response);

            const result = await getMintPrice('PTS', 0.01);
            // Missing solana.usd should trigger fallback
            expect(result.priceSol).toBeGreaterThan(0);
        });
    });
});

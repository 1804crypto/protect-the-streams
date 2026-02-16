"use client";

import { useState, useEffect } from 'react';

interface PriceData {
    solUsd: number;
    mintPriceSol: number;
    mintPriceUsd: number;
    ptsValueUsd: number;
    ptsValueSol: number;
    source: 'live' | 'cached' | 'fallback';
}

export const usePriceData = () => {
    const [prices, setPrices] = useState<PriceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const res = await fetch('/api/prices');
                if (!res.ok) throw new Error('Failed to fetch prices');
                const data = await res.json();
                setPrices(data);
            } catch (err) {
                console.error('[PriceData] Error:', err);
                setError('Failed to load price data');
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
        // Poll every 60s (matches API cache TTL)
        const interval = setInterval(fetchPrices, 60000);
        return () => clearInterval(interval);
    }, []);

    return { prices, loading, error };
};

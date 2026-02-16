import { NextResponse } from 'next/server';
import { getAllPrices } from '@/lib/priceOracle';

/**
 * GET /api/prices
 * Returns current SOL/USDC/PTS pricing data.
 * Cached for 30 seconds via Cache-Control header.
 */
export async function GET() {
    try {
        const prices = await getAllPrices();

        return NextResponse.json({
            ...prices,
            timestamp: new Date().toISOString(),
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Prices API] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

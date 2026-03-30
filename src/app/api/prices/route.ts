import { NextRequest, NextResponse } from 'next/server';
import { getAllPrices } from '@/lib/priceOracle';
import { checkRateLimit } from '@/lib/rateLimit';

const RATE_LIMIT = { name: 'prices', maxRequests: 60, windowMs: 60_000 };

/**
 * GET /api/prices
 * Returns current SOL/USDC/PTS pricing data.
 * Cached for 30 seconds via Cache-Control header.
 * Rate limited: 60 requests per IP per minute.
 */
export async function GET(req: NextRequest) {
    try {
        const limited = checkRateLimit(req, RATE_LIMIT);
        if (limited) return limited;
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

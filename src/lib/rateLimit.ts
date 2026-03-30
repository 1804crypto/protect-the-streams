import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory sliding window rate limiter for serverless API routes.
 *
 * Tracks request counts per IP within a configurable window.
 * Uses a Map with periodic cleanup to avoid memory leaks.
 *
 * Note: In a multi-instance deployment (e.g., Netlify Functions),
 * each instance has its own window. This provides per-instance
 * protection — for global rate limiting, use Redis/Upstash.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup: purge expired entries every 60s
let cleanupScheduled = false;
function scheduleCleanup() {
    if (cleanupScheduled) return;
    cleanupScheduled = true;
    setInterval(() => {
        const now = Date.now();
        for (const [, store] of stores) {
            for (const [key, entry] of store) {
                if (now > entry.resetAt) store.delete(key);
            }
        }
    }, 60_000).unref?.();
}

export interface RateLimitConfig {
    /** Unique name for this limiter (e.g., 'prices', 'metadata') */
    name: string;
    /** Max requests per window */
    maxRequests: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 Response if blocked.
 */
export function checkRateLimit(req: NextRequest, config: RateLimitConfig): NextResponse | null {
    scheduleCleanup();

    if (!stores.has(config.name)) {
        stores.set(config.name, new Map());
    }
    const store = stores.get(config.name)!;

    const ip = getClientIp(req);
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
        // New window
        store.set(ip, { count: 1, resetAt: now + config.windowMs });
        return null;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
            { error: 'Rate limit exceeded. Try again shortly.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(config.maxRequests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
                },
            }
        );
    }

    return null;
}

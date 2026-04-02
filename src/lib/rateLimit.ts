import { NextRequest, NextResponse } from 'next/server';

/**
 * Hybrid rate limiter for serverless API routes.
 *
 * Layer 1 (this file): In-memory sliding window per-instance.
 * - Fast, zero-latency check. Catches obvious abuse on a single instance.
 * - Resets when the serverless instance cold-starts.
 *
 * Layer 2 (DB-backed): Critical endpoints (/api/player/sync, /api/mission/complete)
 * additionally check `updated_at` timestamps in Supabase for cross-instance
 * enforcement. See those route handlers for the DB-level rate checks.
 *
 * For global distributed rate limiting, migrate to Redis/Upstash.
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
    // Use the first IP in X-Forwarded-For (set by reverse proxy/CDN).
    // On Netlify/Vercel, this header is set by the platform and cannot be spoofed
    // by the client since the platform always prepends the real client IP.
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
        const ip = xff.split(',')[0]?.trim();
        // Basic validation: must look like an IP (v4 or v6)
        if (ip && (ip.includes('.') || ip.includes(':'))) return ip;
    }
    return req.headers.get('x-real-ip') || 'unknown';
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

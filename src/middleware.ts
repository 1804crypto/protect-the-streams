import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF protection for all mutating API endpoints.
 * Validates that POST/PUT/PATCH/DELETE requests originate from our own domain
 * by checking the Origin or Referer header against allowed hosts.
 *
 * This prevents cross-origin form submissions and fetch requests from
 * malicious sites that could exploit the HTTP-only session cookie.
 */

const ALLOWED_ORIGINS = new Set([
    'https://protectthestreamers.xyz',
    'https://www.protectthestreamers.xyz',
    // Add staging/preview domains as needed
]);

// Always allow localhost in development
function isAllowedOrigin(origin: string | null, host: string | null): boolean {
    if (!origin) return false;

    // Allow exact match
    if (ALLOWED_ORIGINS.has(origin)) return true;

    // Allow same-origin (origin matches the host header)
    try {
        const originUrl = new URL(origin);
        if (host && originUrl.host === host) return true;
    } catch {
        return false;
    }

    // Allow localhost/dev
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return true;
    }

    // Allow Netlify deploy previews — restricted to our team's subdomain only
    if (origin.endsWith('endearing-syrniki-7788ed.netlify.app')) return true;

    return false;
}

export function middleware(request: NextRequest) {
    // Only check mutating methods on API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return NextResponse.next();
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Check origin first, fall back to referer
    if (isAllowedOrigin(origin, host)) {
        return NextResponse.next();
    }

    // If no origin, check referer (some browsers send referer but not origin)
    if (!origin && referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (isAllowedOrigin(refererOrigin, host)) {
                return NextResponse.next();
            }
        } catch {
            // Invalid referer URL
        }
    }

    // Block: no valid origin/referer
    console.warn(`[CSRF] Blocked ${method} ${request.nextUrl.pathname} — origin: ${origin}, referer: ${referer}`);
    return NextResponse.json(
        { error: 'Cross-origin request blocked' },
        { status: 403 }
    );
}

export const config = {
    matcher: '/api/:path*',
};

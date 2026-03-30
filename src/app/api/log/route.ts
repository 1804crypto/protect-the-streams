import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseClient';

const supabase = getServiceSupabase();

// Simple in-memory rate limiter: max 20 logs per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT;
}

/**
 * POST /api/log
 * Client-side error sink — writes to error_logs table in Supabase.
 */
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { level, component, message, metadata } = body;

        if (!level || !component || !message) {
            return NextResponse.json({ error: 'Missing required fields: level, component, message' }, { status: 400 });
        }

        if (!['ERROR', 'WARN', 'INFO'].includes(level)) {
            return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
        }

        // Truncate message to prevent abuse
        const safeMessage = String(message).slice(0, 2000);
        const safeComponent = String(component).slice(0, 200);

        // Validate and size-limit metadata to prevent DB bloat / injection
        let safeMetadata: Record<string, unknown> | null = null;
        if (metadata && typeof metadata === 'object') {
            const serialized = JSON.stringify(metadata);
            if (serialized.length <= 5000) {
                safeMetadata = JSON.parse(serialized);
            }
            // Silently drop oversized metadata
        }

        // Fire-and-forget insert — don't block response on DB write
        supabase
            .from('error_logs')
            .insert({
                level,
                component: safeComponent,
                message: safeMessage,
                metadata: safeMetadata,
                environment: process.env.NODE_ENV || 'production',
            })
            .then(({ error }) => {
                if (error) console.error('[LOG API] Failed to write error_log:', error.message);
            });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

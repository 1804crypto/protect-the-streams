import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

        const body = await req.json();
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

        // Fire-and-forget insert — don't block response on DB write
        supabase
            .from('error_logs')
            .insert({
                level,
                component: safeComponent,
                message: safeMessage,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
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

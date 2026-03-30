import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// BUG 21 FIX: Warn when using placeholder values so failures aren't silent
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[SUPABASE] Missing env vars NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Using placeholder values — all Supabase operations will fail.');
}

/** Client-side Supabase client (anon key) — for browser/component usage */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client (service role key) — for API routes only.
 * Throws in production if SUPABASE_SERVICE_ROLE_KEY is not set,
 * preventing silent fallback to the less-privileged anon key.
 */
export function getServiceSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is not set. API routes require the service role key.');
        }
        console.warn('[SUPABASE] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (dev only).');
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    return createClient(supabaseUrl, serviceKey);
}

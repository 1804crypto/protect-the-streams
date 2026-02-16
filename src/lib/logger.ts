type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SYSTEM';

const LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    SYSTEM: 2,
    WARN: 3,
    ERROR: 4
};

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const isServer = typeof window === 'undefined';

/**
 * Non-blocking error reporter — writes to Supabase error_logs table.
 * Server-side: direct DB insert. Client-side: POST to /api/log.
 * Never throws, never blocks the caller.
 */
function reportToSupabase(level: 'ERROR' | 'WARN', component: string, message: string, metadata?: unknown): void {
    if (!IS_PRODUCTION) return;

    const payload = {
        level,
        component,
        message: String(message).slice(0, 2000),
        metadata: metadata ? JSON.parse(JSON.stringify(metadata, (_k, v) => {
            // Safely serialize — strip circular refs, Error objects, etc.
            if (v instanceof Error) return { message: v.message, stack: v.stack };
            return v;
        })) : null,
    };

    if (isServer) {
        // Server-side: lazy-import Supabase to avoid bundling in client
        try {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!url || !key) return;

            // Dynamic import to keep client bundle clean
            import('@supabase/supabase-js').then(({ createClient }) => {
                const supabase = createClient(url, key);
                supabase
                    .from('error_logs')
                    .insert({ ...payload, environment: process.env.NODE_ENV || 'production' })
                    .then(({ error }) => {
                        if (error) console.error('[Logger] Failed to persist error_log:', error.message);
                    });
            }).catch(() => { /* silently fail */ });
        } catch {
            // Never throw from logger
        }
    } else {
        // Client-side: POST to /api/log
        try {
            fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(() => { /* silently fail */ });
        } catch {
            // Never throw from logger
        }
    }
}

export const Logger = {
    debug: (component: string, message: string, data?: unknown) => {
        if (LOG_LEVELS.DEBUG >= CURRENT_LEVEL) {
            if (isServer) {
                console.debug(`[DEBUG] ${component}: ${message}`, data || '');
            } else {
                console.debug(`%c[DEBUG] ${component}:`, 'color: #888', message, data || '');
            }
        }
    },

    info: (component: string, message: string, data?: unknown) => {
        if (LOG_LEVELS.INFO >= CURRENT_LEVEL) {
            if (isServer) {
                console.info(`[INFO] ${component}: ${message}`, data || '');
            } else {
                console.info(`%c[INFO] ${component}:`, 'color: #00f3ff; font-weight: bold', message, data || '');
            }
        }
    },

    system: (component: string, message: string, data?: unknown) => {
        if (LOG_LEVELS.SYSTEM >= CURRENT_LEVEL) {
            if (isServer) {
                console.log(`[SYSTEM] ${component}: ${message}`, data || '');
            } else {
                console.log(`%c[SYSTEM] ${component}:`, 'color: #bc13fe; font-weight: bold', message, data || '');
            }
        }
    },

    warn: (component: string, message: string, data?: unknown) => {
        if (LOG_LEVELS.WARN >= CURRENT_LEVEL) {
            if (isServer) {
                console.warn(`[WARN] ${component}: ${message}`, data || '');
            } else {
                console.warn(`%c[WARN] ${component}:`, 'color: #ffd700; font-weight: bold', message, data || '');
            }
            // 🆕 Persist WARN to Supabase in production
            reportToSupabase('WARN', component, message, data);
        }
    },

    error: (component: string, message: string, error?: unknown) => {
        if (LOG_LEVELS.ERROR >= CURRENT_LEVEL) {
            if (isServer) {
                console.error(`[ERROR] ${component}: ${message}`, error || '');
            } else {
                console.error(`%c[ERROR] ${component}:`, 'color: #ff003c; font-weight: bold', message, error || '');
            }
            // 🆕 Persist ERROR to Supabase in production
            reportToSupabase('ERROR', component, message, error);
        }
    }
};

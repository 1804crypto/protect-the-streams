type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SYSTEM';

const LOG_LEVELS: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    SYSTEM: 2,
    WARN: 3,
    ERROR: 4
};

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

const isServer = typeof window === 'undefined';

export const Logger = {
    debug: (component: string, message: string, data?: any) => {
        if (LOG_LEVELS.DEBUG >= CURRENT_LEVEL) {
            if (isServer) {
                console.debug(`[DEBUG] ${component}: ${message}`, data || '');
            } else {
                console.debug(`%c[DEBUG] ${component}:`, 'color: #888', message, data || '');
            }
        }
    },

    info: (component: string, message: string, data?: any) => {
        if (LOG_LEVELS.INFO >= CURRENT_LEVEL) {
            if (isServer) {
                console.info(`[INFO] ${component}: ${message}`, data || '');
            } else {
                console.info(`%c[INFO] ${component}:`, 'color: #00f3ff; font-weight: bold', message, data || '');
            }
        }
    },

    system: (component: string, message: string, data?: any) => {
        if (LOG_LEVELS.SYSTEM >= CURRENT_LEVEL) {
            if (isServer) {
                console.log(`[SYSTEM] ${component}: ${message}`, data || '');
            } else {
                console.log(`%c[SYSTEM] ${component}:`, 'color: #bc13fe; font-weight: bold', message, data || '');
            }
        }
    },

    warn: (component: string, message: string, data?: any) => {
        if (LOG_LEVELS.WARN >= CURRENT_LEVEL) {
            if (isServer) {
                console.warn(`[WARN] ${component}: ${message}`, data || '');
            } else {
                console.warn(`%c[WARN] ${component}:`, 'color: #ffd700; font-weight: bold', message, data || '');
            }
        }
    },

    error: (component: string, message: string, error?: any) => {
        if (LOG_LEVELS.ERROR >= CURRENT_LEVEL) {
            if (isServer) {
                console.error(`[ERROR] ${component}: ${message}`, error || '');
            } else {
                console.error(`%c[ERROR] ${component}:`, 'color: #ff003c; font-weight: bold', message, error || '');
            }
        }
    }
};

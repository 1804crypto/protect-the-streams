import { SignJWT, jwtVerify } from 'jose';
import type { SessionPayload } from '@/types/auth';

// BUG 11 FIX: Lazy initialization to avoid crashing during next build
let _secretKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
    if (!_secretKey) {
        const secret = process.env.JWT_SECRET;
        if (!secret && process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: JWT_SECRET environment variable is not set in production. Refusing to start with insecure default.');
        }
        if (secret && secret.length < 32) {
            throw new Error('FATAL: JWT_SECRET must be at least 32 characters.');
        }
        _secretKey = new TextEncoder().encode(secret || 'pts-dev-only-secret-key');
    }
    return _secretKey;
}

export async function signSession(payload: SessionPayload) {
    const alg = 'HS256';
    return new SignJWT(payload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getSecretKey());
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return payload;
    } catch {
        return null;
    }
}

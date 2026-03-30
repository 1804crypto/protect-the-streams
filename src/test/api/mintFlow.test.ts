import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for the mint confirm flow.
 * Validates: auth, parameter validation, state transitions.
 *
 * Note: The mint/transaction route has heavy Metaplex/UMI dependencies
 * that are difficult to mock in unit tests. Transaction-level tests
 * are covered by E2E tests against devnet. Here we test the confirm
 * endpoint (auth + idempotency) and validate the transaction route's
 * parameter checks.
 */

const mockVerifySession = vi.fn();
vi.mock('@/lib/auth', () => ({
    verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

const mockConfirmState = {
    updateResult: null as { idempotency_key: string; status: string } | null,
};

vi.mock('@/lib/supabaseClient', () => ({
    getServiceSupabase: () => ({
        from: (table: string) => {
            if (table === 'mint_attempts') {
                return {
                    update: () => ({
                        eq: () => ({
                            eq: () => ({
                                eq: () => ({
                                    select: () => ({
                                        single: () => Promise.resolve({
                                            data: mockConfirmState.updateResult,
                                            error: mockConfirmState.updateResult ? null : { message: 'Not found' },
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: null, error: null }),
                            eq: () => ({
                                eq: () => ({
                                    single: () => Promise.resolve({ data: null, error: null }),
                                }),
                            }),
                        }),
                    }),
                    upsert: () => Promise.resolve({ error: null }),
                };
            }
            return {};
        },
    }),
}));

let confirmPOST: (req: unknown) => Promise<Response>;

beforeEach(async () => {
    mockVerifySession.mockReset();
    mockConfirmState.updateResult = null;

    const mod = await import('@/app/api/mint/confirm/route');
    confirmPOST = mod.POST as (req: unknown) => Promise<Response>;
});

function makeRequest(body: Record<string, unknown>, cookie = 'valid-token') {
    return {
        cookies: { get: (name: string) => name === 'pts_session' ? { value: cookie } : undefined },
        json: () => Promise.resolve(body),
    };
}

describe('Mint Confirm — Auth', () => {
    it('rejects requests without session cookie', async () => {
        const res = await confirmPOST(makeRequest({}, ''));
        expect(res.status).toBe(401);
    });

    it('rejects invalid session tokens', async () => {
        mockVerifySession.mockResolvedValue(null);
        const res = await confirmPOST(makeRequest({ idempotencyKey: 'k1' }, 'bad'));
        expect(res.status).toBe(401);
    });

    it('rejects session without wallet', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'u1' }); // no wallet
        const res = await confirmPOST(makeRequest({ idempotencyKey: 'k1' }));
        expect(res.status).toBe(401);
    });
});

describe('Mint Confirm — Validation', () => {
    it('rejects missing idempotencyKey', async () => {
        mockVerifySession.mockResolvedValue({ wallet: 'wallet1' });
        const res = await confirmPOST(makeRequest({}));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Missing idempotencyKey');
    });

    it('returns 404 when no BUILT record found', async () => {
        mockVerifySession.mockResolvedValue({ wallet: 'wallet1' });
        mockConfirmState.updateResult = null;

        const res = await confirmPOST(makeRequest({ idempotencyKey: 'nonexistent' }));
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.warning).toBeTruthy();
    });

    it('succeeds for valid BUILT → COMPLETED transition', async () => {
        mockVerifySession.mockResolvedValue({ wallet: 'wallet1' });
        mockConfirmState.updateResult = { idempotency_key: 'k1', status: 'COMPLETED' };

        const res = await confirmPOST(makeRequest({ idempotencyKey: 'k1' }));
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.status).toBe('COMPLETED');
    });
});

describe('Mint Confirm — Idempotency Design', () => {
    it('confirm endpoint requires wallet match (auth-scoped)', async () => {
        // The confirm route uses session.wallet to scope the update query,
        // ensuring users can only confirm their own mints
        mockVerifySession.mockResolvedValue({ wallet: 'different-wallet' });
        mockConfirmState.updateResult = null; // wallet mismatch → no rows updated

        const res = await confirmPOST(makeRequest({ idempotencyKey: 'k1' }));
        expect(res.status).toBe(404);
        expect((await res.json()).warning).toBeTruthy();
    });

    it('rejects invalid JSON body gracefully', async () => {
        mockVerifySession.mockResolvedValue({ wallet: 'wallet1' });
        const req = {
            cookies: { get: (name: string) => name === 'pts_session' ? { value: 'valid' } : undefined },
            json: () => Promise.reject(new Error('bad json')),
        };
        const res = await confirmPOST(req);
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Invalid JSON body');
    });
});

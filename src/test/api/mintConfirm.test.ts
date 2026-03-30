import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

/**
 * Tests for POST /api/mint/confirm
 * Validates idempotency key handling, BUILT→COMPLETED transitions,
 * and session authentication.
 *
 * We test the route logic by mocking Supabase and auth — no real DB calls.
 */

// Mock auth — verifySession returns a valid session by default
const mockVerifySession = vi.fn();
vi.mock('@/lib/auth', () => ({
    verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

// Mock Supabase client
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({
            update: (...args: unknown[]) => {
                mockUpdate(...args);
                return {
                    eq: (...eqArgs: unknown[]) => {
                        mockEq(...eqArgs);
                        return {
                            eq: (...eqArgs2: unknown[]) => {
                                mockEq(...eqArgs2);
                                return {
                                    eq: (...eqArgs3: unknown[]) => {
                                        mockEq(...eqArgs3);
                                        return {
                                            select: (...selArgs: unknown[]) => {
                                                mockSelect(...selArgs);
                                                return {
                                                    single: () => mockSingle()
                                                };
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
        })
    })
}));

function makeRequest(body: Record<string, unknown>, hasSession = true) {
    return {
        json: async () => body,
        cookies: {
            get: (name: string) => {
                if (name === 'pts_session' && hasSession) {
                    return { value: 'mock-session-token' };
                }
                return undefined;
            }
        }
    } as unknown as Request;
}

describe('POST /api/mint/confirm', () => {
    let POST: (_req: any) => Promise<Response>;

    beforeAll(async () => {
        const mod = await import('@/app/api/mint/confirm/route');
        POST = mod.POST;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Default: valid session with wallet
        mockVerifySession.mockResolvedValue({ userId: 'user-1', wallet: 'TestWallet123' });
    });

    it('returns 401 when no session cookie is present', async () => {
        const req = makeRequest({ idempotencyKey: 'key-1' }, false);
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when session is invalid', async () => {
        mockVerifySession.mockResolvedValue(null);

        const req = makeRequest({ idempotencyKey: 'key-1' });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe('Invalid session');
    });

    it('returns 400 when idempotencyKey is missing', async () => {
        const req = makeRequest({});
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Missing idempotencyKey');
    });

    it('returns 200 with success when BUILT record is found', async () => {
        mockSingle.mockResolvedValue({
            data: { idempotency_key: 'test-key-123', status: 'COMPLETED' },
            error: null
        });

        const req = makeRequest({ idempotencyKey: 'test-key-123' });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.status).toBe('COMPLETED');
    });

    it('returns 404 with warning when no BUILT record found', async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'No rows found' }
        });

        const req = makeRequest({ idempotencyKey: 'nonexistent-key' });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.warning).toBeDefined();
    });

    it('calls update with COMPLETED status and wallet filter', async () => {
        mockSingle.mockResolvedValue({
            data: { idempotency_key: 'key-1', status: 'COMPLETED' },
            error: null
        });

        const req = makeRequest({ idempotencyKey: 'key-1' });
        await POST(req as any);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'COMPLETED' })
        );
        // Verify wallet filter is applied (3 .eq() calls: idempotency_key, user_wallet, status)
        expect(mockEq).toHaveBeenCalledWith('idempotency_key', 'key-1');
        expect(mockEq).toHaveBeenCalledWith('user_wallet', 'TestWallet123');
        expect(mockEq).toHaveBeenCalledWith('status', 'BUILT');
    });
});

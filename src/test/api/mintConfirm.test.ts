import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

/**
 * Tests for POST /api/mint/confirm
 * Validates idempotency key handling and BUILT→COMPLETED transitions.
 *
 * We test the route logic by mocking Supabase — no real DB calls.
 */

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
        })
    })
}));

function makeRequest(body: Record<string, unknown>) {
    return {
        json: async () => body,
    } as unknown as Request;
}

describe('POST /api/mint/confirm', () => {
    let POST: (req: any) => Promise<Response>;

    beforeAll(async () => {
        const mod = await import('@/app/api/mint/confirm/route');
        POST = mod.POST;
    });

    beforeEach(() => {
        vi.clearAllMocks();
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

    it('returns 200 with warning when no BUILT record found', async () => {
        mockSingle.mockResolvedValue({
            data: null,
            error: { message: 'No rows found' }
        });

        const req = makeRequest({ idempotencyKey: 'nonexistent-key' });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.warning).toBeDefined();
    });

    it('calls update with COMPLETED status', async () => {
        mockSingle.mockResolvedValue({
            data: { idempotency_key: 'key-1', status: 'COMPLETED' },
            error: null
        });

        const req = makeRequest({ idempotencyKey: 'key-1' });
        await POST(req as any);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'COMPLETED' })
        );
    });
});

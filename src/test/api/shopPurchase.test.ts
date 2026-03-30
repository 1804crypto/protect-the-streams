import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for POST /api/shop/purchase critical flow.
 * Validates: auth, item validation, PTS balance checks, optimistic locking,
 * idempotency, and quantity limits.
 */

const mockVerifySession = vi.fn();
vi.mock('@/lib/auth', () => ({
    verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

// Mock RPC URL
vi.mock('@/lib/rpc', () => ({
    getRpcUrl: () => 'https://api.devnet.solana.com',
}));

// Mock Solana web3 (so import doesn't fail)
vi.mock('@solana/web3.js', () => {
    class MockPublicKey {
        _key: string;
        constructor(key: string) { this._key = key; }
        toBase58() { return this._key; }
        equals() { return false; }
    }
    return {
        Connection: vi.fn(),
        PublicKey: MockPublicKey,
        LAMPORTS_PER_SOL: 1_000_000_000,
    };
});

const mockDbState = {
    purchase: null as unknown,
    user: null as unknown,
    updateResult: { id: 'user-1' } as unknown,
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (table: string) => {
            if (table === 'shop_purchases') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockDbState.purchase, error: null }),
                        }),
                    }),
                    upsert: () => Promise.resolve({ error: null }),
                };
            }
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockDbState.user, error: null }),
                        }),
                    }),
                    update: () => ({
                        eq: (_col: string, _val: unknown) => {
                            // Support optimistic locking chain
                            const lockChain = {
                                eq: () => lockChain,
                                select: () => ({
                                    maybeSingle: () => Promise.resolve({
                                        data: mockDbState.updateResult,
                                        error: null,
                                    }),
                                }),
                            };
                            return lockChain;
                        },
                    }),
                };
            }
            return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
    }),
}));

let POST: (req: unknown) => Promise<Response>;

beforeEach(async () => {
    mockVerifySession.mockReset();
    mockDbState.purchase = null;
    mockDbState.user = null;
    mockDbState.updateResult = { id: 'user-1' };

    const mod = await import('@/app/api/shop/purchase/route');
    POST = mod.POST as (req: unknown) => Promise<Response>;
});

function makeRequest(body: Record<string, unknown>, cookie = 'valid-token') {
    return {
        cookies: { get: (name: string) => name === 'pts_session' ? { value: cookie } : undefined },
        json: () => Promise.resolve(body),
    };
}

describe('Shop Purchase — Critical Flow Integration', () => {
    it('rejects unauthenticated requests', async () => {
        const res = await POST(makeRequest({}, ''));
        expect(res.status).toBe(401);
    });

    it('rejects missing itemId', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({ currency: 'PTS', purchaseId: 'p1' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Missing itemId');
    });

    it('rejects missing purchaseId', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({ itemId: 'RESTORE_CHIP_V2', currency: 'PTS' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Missing purchaseId');
    });

    it('rejects invalid currency', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({ itemId: 'RESTORE_CHIP_V2', purchaseId: 'p1', currency: 'BTC' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Invalid currency');
    });

    it('accepts USDC as valid currency', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = null;
        mockDbState.user = { pts_balance: 0, inventory: {}, updated_at: null };
        // USDC requires txSignature — should fail with missing signature, not invalid currency
        const res = await POST(makeRequest({ itemId: 'RESTORE_CHIP_V2', purchaseId: 'p-usdc', currency: 'USDC' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('Missing transaction signature');
    });

    it('rejects items not in shop', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            itemId: 'NONEXISTENT_ITEM', purchaseId: 'p1', currency: 'PTS'
        }));
        expect(res.status).toBe(400);
    });

    it('rejects quantity over 10', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'p1', currency: 'PTS', quantity: 11
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('Quantity');
    });

    it('rejects duplicate purchaseId (idempotency)', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = { id: 'existing', status: 'COMPLETED' };

        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'already-used', currency: 'PTS'
        }));
        expect(res.status).toBe(409);
    });

    it('rejects insufficient PTS balance', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = null;
        mockDbState.user = { pts_balance: 10, inventory: {}, updated_at: null };

        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'p1', currency: 'PTS'
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Insufficient PTS balance');
    });

    it('succeeds with valid PTS purchase', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = null;
        mockDbState.user = { pts_balance: 5000, inventory: {}, updated_at: null };
        mockDbState.updateResult = { id: 'user-1' };

        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'p-new', currency: 'PTS'
        }));
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.newInventory.RESTORE_CHIP_V2).toBe(1);
    });

    it('returns 409 on optimistic lock conflict', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = null;
        mockDbState.user = { pts_balance: 5000, inventory: {}, updated_at: '2024-01-01T00:00:00Z' };
        mockDbState.updateResult = null; // Simulates optimistic lock failure

        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'p-conflict', currency: 'PTS'
        }));
        expect(res.status).toBe(409);
    });

    it('rejects SOL purchase without txSignature', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        mockDbState.purchase = null;
        mockDbState.user = { pts_balance: 0, inventory: {}, updated_at: null };

        const res = await POST(makeRequest({
            itemId: 'RESTORE_CHIP_V2', purchaseId: 'p-sol', currency: 'SOL'
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('Missing transaction signature');
    });
});

describe('Shop — Item Quantity Caps', () => {
    it('caps inventory items at MAX_ITEM_QUANTITY (99)', async () => {
        const { MAX_ITEM_QUANTITY } = await import('@/lib/sanitizeInventory');
        expect(MAX_ITEM_QUANTITY).toBe(99);
    });

    it('validates all shop items are in VALID_ITEM_IDS', async () => {
        const { blackMarketItems } = await import('@/data/storeItems');
        const { VALID_ITEM_IDS } = await import('@/lib/sanitizeInventory');

        for (const itemId of Object.keys(blackMarketItems)) {
            expect(VALID_ITEM_IDS.has(itemId)).toBe(true);
        }
    });
});

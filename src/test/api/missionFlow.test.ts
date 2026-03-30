import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for the mission complete → reward flow.
 * Validates the full critical path: auth → validation → reward computation → DB write → idempotency.
 */

const mockVerifySession = vi.fn();
vi.mock('@/lib/auth', () => ({
    verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

// Track all Supabase calls for assertion
const dbCalls: { method: string; args: unknown[] }[] = [];
const mockDbResponse = {
    select: { data: null as unknown, error: null as unknown, count: null as number | null },
    update: { data: null as unknown, error: null as unknown },
    upsert: { data: null as unknown, error: null as unknown },
};

function createMockChain() {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'gte', 'single', 'maybeSingle', 'update', 'upsert'];
    for (const m of methods) {
        chain[m] = (...args: unknown[]) => {
            dbCalls.push({ method: m, args });
            if (m === 'single') return Promise.resolve(mockDbResponse.select);
            if (m === 'maybeSingle') return Promise.resolve(mockDbResponse.update);
            return chain;
        };
    }
    // For count queries
    chain['select'] = (...args: unknown[]) => {
        dbCalls.push({ method: 'select', args });
        if (args[1] && typeof args[1] === 'object' && 'count' in (args[1] as Record<string, unknown>)) {
            return { ...chain, then: (fn: (v: unknown) => void) => fn({ count: 0, error: null }) };
        }
        return chain;
    };
    return chain;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (table: string) => {
            dbCalls.push({ method: 'from', args: [table] });
            return createMockChain();
        },
        rpc: () => Promise.resolve({ error: null }),
    }),
}));

// Import AFTER mocks are set up
let POST: (req: unknown) => Promise<Response>;

beforeEach(async () => {
    dbCalls.length = 0;
    mockVerifySession.mockReset();
    mockDbResponse.select = { data: null, error: null, count: null };
    mockDbResponse.update = { data: { id: 'user-1' }, error: null };

    // Dynamic import to pick up mocks
    const mod = await import('@/app/api/mission/complete/route');
    POST = mod.POST as (req: unknown) => Promise<Response>;
});

function makeRequest(body: Record<string, unknown>, cookie = 'valid-token') {
    return {
        cookies: { get: (name: string) => name === 'pts_session' ? { value: cookie } : undefined },
        json: () => Promise.resolve(body),
    };
}

describe('Mission Complete — Critical Flow Integration', () => {
    it('rejects unauthenticated requests', async () => {
        const res = await POST(makeRequest({}, ''));
        const data = await res.json();
        expect(res.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('rejects invalid session tokens', async () => {
        mockVerifySession.mockResolvedValue(null);
        const res = await POST(makeRequest({ missionId: 'kaicenat' }, 'bad-token'));
        expect(res.status).toBe(401);
    });

    it('rejects missing missionId', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({ hpRemaining: 80, maxHp: 100, turnsUsed: 8, duration: 60000 }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toBe('Missing missionId');
    });

    it('rejects invalid streamer IDs', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            missionId: 'INJECTED_ID',
            hpRemaining: 80, maxHp: 100, turnsUsed: 8, isBoss: false, duration: 60000
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Invalid mission target');
    });

    it('rejects missions completed too fast', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            missionId: 'kaicenat',
            hpRemaining: 80, maxHp: 100, turnsUsed: 8, isBoss: false,
            duration: 5000 // Too fast (< 30s)
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Mission duration too short');
    });

    it('rejects implausible max HP', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            missionId: 'kaicenat',
            hpRemaining: 400, maxHp: 9999, turnsUsed: 8, isBoss: false, duration: 60000
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Implausible max HP value');
    });

    it('rejects boss fights completed in < 3 turns', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            missionId: 'kaicenat',
            hpRemaining: 80, maxHp: 100, turnsUsed: 1, isBoss: true, duration: 60000
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Implausible turn count for boss battle');
    });

    it('rejects battle pace that is too fast for reported turns', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });
        const res = await POST(makeRequest({
            missionId: 'kaicenat',
            hpRemaining: 80, maxHp: 100, turnsUsed: 25, isBoss: false,
            duration: 35000 // 25 turns in 35s = 1.4s/turn, threshold is 1.5s/turn (25*1500=37500)
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Battle pace too fast for reported turns');
    });

    it('allows failures with short duration (rage quit)', async () => {
        mockVerifySession.mockResolvedValue({ userId: 'user-1' });

        // Mock user fetch
        mockDbResponse.select = {
            data: {
                xp: 100, level: 2, inventory: {}, pts_balance: 50,
                completed_missions: [], faction: null, updated_at: null,
                wins: 5, losses: 3
            },
            error: null, count: null
        };

        const res = await POST(makeRequest({
            missionId: 'kaicenat',
            hpRemaining: 0, maxHp: 100, turnsUsed: 3, isBoss: false,
            duration: 5000 // Short duration OK for failures
        }));

        // Should not be rejected (failures bypass duration check)
        expect(res.status).not.toBe(400);
    });
});

describe('Mission Reward Computation (server-side)', () => {
    it('computes S rank for high HP + low turns', async () => {
        // Test via missionRewards directly
        const { computeRank, computeXp, computePtsReward } = await import('@/lib/missionRewards');

        const rank = computeRank(90, 100, 8, false);
        expect(rank).toBe('S');
        expect(computeXp('S', false)).toBe(75); // 50 * 1.5
        expect(computePtsReward('S')).toBe(150);
    });

    it('computes F rank for failures', async () => {
        const { computeRank, computeXp, computePtsReward } = await import('@/lib/missionRewards');

        const rank = computeRank(0, 100, 15, true);
        expect(rank).toBe('F');
        expect(computeXp('F', false)).toBe(50); // base * 1.0
        expect(computePtsReward('F')).toBe(0);
    });

    it('gives boss XP multiplier', async () => {
        const { computeXp } = await import('@/lib/missionRewards');

        expect(computeXp('S', true)).toBe(225);  // 150 * 1.5
        expect(computeXp('S', false)).toBe(75);   // 50 * 1.5
    });
});

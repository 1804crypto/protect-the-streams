import { describe, it, expect } from 'vitest';
import { calculateLevel, xpForLevel, getLevelProgress, LEVEL_CAP } from '@/lib/gameMechanics';

describe('calculateLevel', () => {
    it('returns level 1 for 0 XP', () => {
        expect(calculateLevel(0)).toBe(1);
    });

    it('returns level 2 for 100 XP', () => {
        expect(calculateLevel(100)).toBe(2);
    });

    it('returns level 3 for 400 XP', () => {
        expect(calculateLevel(400)).toBe(3);
    });

    it('returns level 4 for 900 XP', () => {
        expect(calculateLevel(900)).toBe(4);
    });

    it('returns level 6 for 2500 XP', () => {
        expect(calculateLevel(2500)).toBe(6);
    });

    it('caps at LEVEL_CAP for massive XP', () => {
        expect(calculateLevel(10_000_000)).toBe(LEVEL_CAP);
    });

    it('returns level 1 for negative XP', () => {
        expect(calculateLevel(-100)).toBe(1);
    });

    it('handles edge case XP just below level threshold', () => {
        expect(calculateLevel(99)).toBe(1);
        expect(calculateLevel(399)).toBe(2);
    });
});

describe('xpForLevel', () => {
    it('returns 0 for level 1', () => {
        expect(xpForLevel(1)).toBe(0);
    });

    it('returns 100 for level 2', () => {
        expect(xpForLevel(2)).toBe(100);
    });

    it('returns 400 for level 3', () => {
        expect(xpForLevel(3)).toBe(400);
    });

    it('returns 0 for level <= 0', () => {
        expect(xpForLevel(0)).toBe(0);
        expect(xpForLevel(-1)).toBe(0);
    });

    it('is consistent with calculateLevel', () => {
        for (let level = 1; level <= 20; level++) {
            const xp = xpForLevel(level);
            expect(calculateLevel(xp)).toBe(level);
        }
    });
});

describe('getLevelProgress', () => {
    it('returns 0 for level start', () => {
        expect(getLevelProgress(0)).toBe(0);
    });

    it('returns 0.5 for halfway through level 1→2', () => {
        expect(getLevelProgress(50)).toBeCloseTo(0.5, 1);
    });

    it('returns 1.0 at level cap', () => {
        const maxXp = xpForLevel(LEVEL_CAP);
        expect(getLevelProgress(maxXp)).toBe(1.0);
    });

    it('returns value between 0 and 1 for mid-level XP', () => {
        const progress = getLevelProgress(250);
        expect(progress).toBeGreaterThan(0);
        expect(progress).toBeLessThan(1);
    });
});

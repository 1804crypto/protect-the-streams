import { describe, it, expect } from 'vitest';
import { computeRank, computeXp, computePtsReward, computeRewardItems } from '@/lib/missionRewards';

describe('computeRank', () => {
    it('returns F for failure', () => {
        expect(computeRank(0, 100, 5, true)).toBe('F');
    });

    it('returns S for high HP and low turns', () => {
        expect(computeRank(90, 100, 8, false)).toBe('S');
    });

    it('returns A for high HP AND low turns', () => {
        expect(computeRank(60, 100, 12, false)).toBe('A');
    });

    it('returns B for high HP but high turns (AND logic)', () => {
        // >50% HP but >=15 turns → B (not A, because AND requires BOTH conditions)
        expect(computeRank(90, 100, 20, false)).toBe('B');
    });

    it('returns B for low HP and low turns (AND logic)', () => {
        // <50% HP but <15 turns → B (not A, because AND requires BOTH conditions)
        expect(computeRank(30, 100, 8, false)).toBe('B');
    });

    it('returns B for low HP and high turns', () => {
        expect(computeRank(30, 100, 20, false)).toBe('B');
    });

    it('S rank requires >80% HP and <10 turns', () => {
        // Exactly 80% should NOT be S
        expect(computeRank(80, 100, 9, false)).toBe('A');
        // Exactly 10 turns should NOT be S
        expect(computeRank(81, 100, 10, false)).toBe('A');
        // Both conditions met
        expect(computeRank(81, 100, 9, false)).toBe('S');
    });

    it('A rank requires BOTH >50% HP AND <15 turns', () => {
        // Both conditions met → A
        expect(computeRank(51, 100, 14, false)).toBe('A');
        // Only HP condition met → B
        expect(computeRank(51, 100, 50, false)).toBe('B');
        // Only turns condition met → B
        expect(computeRank(10, 100, 14, false)).toBe('B');
    });
});

describe('computeXp', () => {
    it('returns correct XP for normal missions', () => {
        expect(computeXp('S', false)).toBe(75);  // 50 * 1.5
        expect(computeXp('A', false)).toBe(60);  // 50 * 1.2
        expect(computeXp('B', false)).toBe(50);  // 50 * 1.0
        expect(computeXp('F', false)).toBe(50);  // 50 * 1.0 (floor)
    });

    it('returns correct XP for boss missions', () => {
        expect(computeXp('S', true)).toBe(225);  // 150 * 1.5
        expect(computeXp('A', true)).toBe(180);  // 150 * 1.2
        expect(computeXp('B', true)).toBe(150);  // 150 * 1.0
    });
});

describe('computePtsReward', () => {
    it('returns correct PTS for each rank', () => {
        expect(computePtsReward('S')).toBe(150);
        expect(computePtsReward('A')).toBe(75);
        expect(computePtsReward('B')).toBe(40);
        expect(computePtsReward('F')).toBe(0);
    });
});

describe('computeRewardItems', () => {
    it('returns 3 deterministic items for S rank', () => {
        const items = computeRewardItems('S');
        expect(items).toEqual(['HYPER_RESTORE', 'FULL_PP_RESTORE', 'ATTACK_MATRIX']);
    });

    it('returns 2 deterministic items for A rank', () => {
        const items = computeRewardItems('A');
        expect(items).toEqual(['RESTORE_CHIP', 'DEFENSE_MATRIX']);
    });

    it('returns 1 item for B rank', () => {
        const items = computeRewardItems('B');
        expect(items).toEqual(['RESTORE_CHIP']);
    });

    it('returns 1 item for F rank', () => {
        const items = computeRewardItems('F');
        expect(items).toEqual(['RESTORE_CHIP']);
    });
});

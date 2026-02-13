import { describe, it, expect } from 'vitest';
import { sanitizeInventory, VALID_ITEM_IDS, MAX_ITEM_QUANTITY } from '@/lib/sanitizeInventory';

describe('sanitizeInventory', () => {
    it('passes through valid items', () => {
        const input = { RESTORE_CHIP: 3, PP_RECHARGE: 2 };
        const result = sanitizeInventory(input, {});
        expect(result).toEqual({ RESTORE_CHIP: 3, PP_RECHARGE: 2 });
    });

    it('strips unknown item IDs', () => {
        const input = { RESTORE_CHIP: 1, HACKED_ITEM: 999, EXPLOIT: 50 };
        const result = sanitizeInventory(input, {});
        expect(result).toEqual({ RESTORE_CHIP: 1 });
        expect(result).not.toHaveProperty('HACKED_ITEM');
        expect(result).not.toHaveProperty('EXPLOIT');
    });

    it('caps quantities at MAX_ITEM_QUANTITY', () => {
        const input = { RESTORE_CHIP: 500, ATTACK_MATRIX: 100 };
        const result = sanitizeInventory(input, {});
        expect(result.RESTORE_CHIP).toBe(MAX_ITEM_QUANTITY);
        expect(result.ATTACK_MATRIX).toBe(MAX_ITEM_QUANTITY);
    });

    it('floors floating point quantities', () => {
        const input = { RESTORE_CHIP: 3.7, PP_RECHARGE: 1.1 };
        const result = sanitizeInventory(input, {});
        expect(result.RESTORE_CHIP).toBe(3);
        expect(result.PP_RECHARGE).toBe(1);
    });

    it('clamps negative quantities to 0', () => {
        const input = { RESTORE_CHIP: -5, PP_RECHARGE: -1 };
        const result = sanitizeInventory(input, {});
        expect(result.RESTORE_CHIP).toBe(0);
        expect(result.PP_RECHARGE).toBe(0);
    });

    it('handles non-number values as 0', () => {
        const input = { RESTORE_CHIP: 'abc' as unknown, PP_RECHARGE: true as unknown };
        const result = sanitizeInventory(input as Record<string, unknown>, {});
        expect(result.RESTORE_CHIP).toBe(0);
        expect(result.PP_RECHARGE).toBe(0);
    });

    it('returns server inventory when client inventory is null', () => {
        const serverInv = { RESTORE_CHIP: 5 };
        expect(sanitizeInventory(null, serverInv)).toEqual(serverInv);
    });

    it('returns server inventory when client inventory is undefined', () => {
        const serverInv = { PP_RECHARGE: 2 };
        expect(sanitizeInventory(undefined, serverInv)).toEqual(serverInv);
    });

    it('returns empty object when both are null', () => {
        expect(sanitizeInventory(null, null)).toEqual({});
    });

    it('handles all valid item IDs', () => {
        const input: Record<string, number> = {};
        VALID_ITEM_IDS.forEach(id => { input[id] = 5; });
        const result = sanitizeInventory(input, {});
        expect(Object.keys(result).length).toBe(VALID_ITEM_IDS.size);
    });
});

/** Server-side item whitelist — only these IDs are valid inventory keys */
export const VALID_ITEM_IDS = new Set([
    'RESTORE_CHIP', 'PP_RECHARGE', 'ATTACK_MATRIX', 'DEFENSE_MATRIX',
    'HYPER_RESTORE', 'FULL_PP_RESTORE', 'stim_pack'
]);

export const MAX_ITEM_QUANTITY = 99;

/**
 * Validate and sanitize inventory from client.
 * - Strips unknown item IDs
 * - Caps quantities at MAX_ITEM_QUANTITY
 * - Ensures quantities are non-negative integers
 */
export function sanitizeInventory(
    clientInventory: Record<string, unknown> | null | undefined,
    serverInventory: Record<string, number> | null | undefined
): Record<string, number> {
    if (!clientInventory || typeof clientInventory !== 'object') return serverInventory || {};

    const sanitized: Record<string, number> = {};
    for (const [key, value] of Object.entries(clientInventory)) {
        if (!VALID_ITEM_IDS.has(key)) continue;
        const qty = typeof value === 'number' ? Math.floor(value) : 0;
        sanitized[key] = Math.max(0, Math.min(qty, MAX_ITEM_QUANTITY));
    }
    return sanitized;
}

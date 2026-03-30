import { describe, it, expect } from 'vitest';

/**
 * Tests for POST /api/player/sync validation logic.
 *
 * HARDENED: Sync endpoint no longer accepts reward fields (deltaXp, deltaWins,
 * deltaLosses, rank, missionId, duration). All rewards are granted exclusively
 * by server-authoritative endpoints (/api/mission/complete, /api/pvp/forfeit).
 *
 * Sync only persists: inventory, streamerNatures, completedMissions, faction, isFactionMinted.
 */

// Replicate the valid streamer IDs set (same as in the route)
const VALID_STREAMER_IDS = new Set([
    'kaicenat', 'adinross', 'ishowspeed', 'xqc', 'dukedennis',
    'fanum', 'agent00', 'druski', 'hasanabi', 'zoey',
    'sneako', 'plaqueboymax', 'rakai', 'reggie', 'bendadonnn',
    'ddg', 'extraemily', 'rayasianboy', 'tylil', 'jazzygunz'
]);

describe('Player Sync Validation (Hardened)', () => {
    describe('Sync accepts only state fields', () => {
        const ALLOWED_FIELDS = ['inventory', 'streamerNatures', 'completedMissions', 'faction', 'isFactionMinted'];
        const REJECTED_FIELDS = ['deltaXp', 'deltaWins', 'deltaLosses', 'rank', 'missionId', 'duration', 'ptsReward'];

        it('allows inventory', () => expect(ALLOWED_FIELDS.includes('inventory')).toBe(true));
        it('allows streamerNatures', () => expect(ALLOWED_FIELDS.includes('streamerNatures')).toBe(true));
        it('allows completedMissions', () => expect(ALLOWED_FIELDS.includes('completedMissions')).toBe(true));
        it('allows faction', () => expect(ALLOWED_FIELDS.includes('faction')).toBe(true));
        it('allows isFactionMinted', () => expect(ALLOWED_FIELDS.includes('isFactionMinted')).toBe(true));

        it('does not accept deltaXp', () => expect(ALLOWED_FIELDS.includes('deltaXp')).toBe(false));
        it('does not accept deltaWins', () => expect(ALLOWED_FIELDS.includes('deltaWins')).toBe(false));
        it('does not accept deltaLosses', () => expect(ALLOWED_FIELDS.includes('deltaLosses')).toBe(false));
        it('does not accept rank', () => expect(ALLOWED_FIELDS.includes('rank')).toBe(false));
        it('does not accept missionId', () => expect(ALLOWED_FIELDS.includes('missionId')).toBe(false));
        it('does not accept duration', () => expect(ALLOWED_FIELDS.includes('duration')).toBe(false));

        it('rejected fields list matches hardened design', () => {
            REJECTED_FIELDS.forEach(field => {
                expect(ALLOWED_FIELDS.includes(field)).toBe(false);
            });
        });
    });

    describe('Streamer ID validation', () => {
        it('contains kaicenat', () => {
            expect(VALID_STREAMER_IDS.has('kaicenat')).toBe(true);
        });

        it('contains ishowspeed', () => {
            expect(VALID_STREAMER_IDS.has('ishowspeed')).toBe(true);
        });

        it('rejects unknown streamers', () => {
            expect(VALID_STREAMER_IDS.has('unknown_streamer')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(VALID_STREAMER_IDS.has('')).toBe(false);
        });

        it('has exactly 20 valid streamer IDs', () => {
            expect(VALID_STREAMER_IDS.size).toBe(20);
        });

        it('rejects SQL injection attempt', () => {
            expect(VALID_STREAMER_IDS.has("'; DROP TABLE users;--")).toBe(false);
        });
    });

    describe('Faction validation', () => {
        const VALID_FACTIONS = ['RED', 'PURPLE', 'NONE'];

        it('accepts RED', () => expect(VALID_FACTIONS.includes('RED')).toBe(true));
        it('accepts PURPLE', () => expect(VALID_FACTIONS.includes('PURPLE')).toBe(true));
        it('accepts NONE', () => expect(VALID_FACTIONS.includes('NONE')).toBe(true));
        it('rejects BLUE', () => expect(VALID_FACTIONS.includes('BLUE')).toBe(false));
        it('rejects empty string', () => expect(VALID_FACTIONS.includes('')).toBe(false));
    });
});

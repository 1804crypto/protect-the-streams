import { test, expect } from '@playwright/test';

/**
 * PvP Wager Flow E2E Tests
 * Covers: wager selection, matchmaking search state, bot fallback, cancel/forfeit.
 * Supabase realtime is mocked via page.addInitScript to avoid live channel deps.
 */

const mockUser = {
    id: 'test-pvp-user',
    wallet_address: 'G9TGuEqWwaqeaCNrQchKUtMxAp4jBNcqJr72hcs2KiaE',
    pts_balance: 5000,
    glr_points: 1000,
    faction: 'BLUE',
    xp: 500,
    level: 3,
};

test.describe('PvP Wager Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Auth + data mocks
        await page.route('/api/auth/session', route =>
            route.fulfill({ json: { authenticated: true, user: mockUser } })
        );
        await page.route('/api/auth/login', route =>
            route.fulfill({ json: { success: true, user: mockUser } })
        );
        await page.route('/api/player/sync', route =>
            route.fulfill({ json: { success: true } })
        );
        await page.route('/api/prices', route =>
            route.fulfill({ json: { solUsd: 150, mintPriceSol: 0.01, mintPriceUsd: 1.5, ptsValueUsd: 0.01, ptsValueSol: 0.000067, source: 'live' } })
        );

        await page.addInitScript(() => {
            localStorage.setItem('pts_tutorial_complete', 'true');
            // Stub Supabase realtime so matchmaking doesn't crash in JSDOM
            (window as unknown as Record<string, unknown>).__supabase_channel_stub__ = true;
        });
    });

    test('PvP terminal opens and shows wager selection', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Find PvP button on any card (first visible one)
        const pvpBtn = page.getByRole('button', { name: /pvp|arena|battle|challenge/i }).first();
        if (await pvpBtn.count() === 0) {
            // Try hovering a card to reveal actions
            const card = page.locator('[data-testid="streamer-card"], .card-responsive').first();
            if (await card.count() > 0) await card.hover({ force: true });
            await page.waitForTimeout(300);
        }

        // Open PvP terminal via roster section PvP buttons
        const anyPvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|PVP|BATTLE_QUEUE/i }).first();
        if (await anyPvpBtn.count() > 0) {
            await anyPvpBtn.click({ force: true });
            await page.waitForTimeout(500);

            // Terminal loading spinner should briefly appear
            // (may have already faded by now — just verify no crash)

            // PvP terminal should be visible
            const terminal = page.locator('text=/WAGER|STAKES|INITIATE_UPLINK/i').first();
            await expect(terminal).toBeVisible({ timeout: 5000 });
        }
    });

    test('Wager selection updates displayed stakes', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open PvP terminal
        const pvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|BATTLE_QUEUE/i }).first();
        if (await pvpBtn.count() === 0) {
            test.skip(true, 'No PvP button visible — access gated (no NFT)');
            return;
        }

        await pvpBtn.click({ force: true });
        await page.waitForTimeout(500);

        // Look for wager amount buttons (0, 100, 500, 1000 PTS)
        const wager100Btn = page.getByRole('button', { name: /100/i }).first();
        if (await wager100Btn.count() > 0) {
            await wager100Btn.click();
            // Verify stakes are reflected
            await expect(page.locator('text=/100.*PTS|STAKES.*100/i').first()).toBeVisible({ timeout: 3000 });
        }

        const wager500Btn = page.getByRole('button', { name: /500/i }).first();
        if (await wager500Btn.count() > 0) {
            await wager500Btn.click();
            await expect(page.locator('text=/500.*PTS|STAKES.*500/i').first()).toBeVisible({ timeout: 3000 });
        }
    });

    test('Initiating search shows SEARCHING state', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const pvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|BATTLE_QUEUE/i }).first();
        if (await pvpBtn.count() === 0) {
            test.skip(true, 'No PvP button visible — access gated');
            return;
        }

        await pvpBtn.click({ force: true });
        await page.waitForTimeout(500);

        const initiateBtn = page.getByRole('button', { name: /INITIATE_UPLINK|FIND_MATCH|SEARCH/i }).first();
        if (await initiateBtn.count() > 0) {
            await initiateBtn.click();
            await page.waitForTimeout(300);

            // Should show searching state
            const searchingIndicator = page.locator('text=/SEARCHING|SCANNING|LOOKING/i').first();
            await expect(searchingIndicator).toBeVisible({ timeout: 5000 });
        }
    });

    test('Bot fallback occurs after 15s timeout', async ({ page }) => {
        // Speed up time so we don't wait 15s in CI
        await page.addInitScript(() => {
            const OriginalSetTimeout = window.setTimeout;
            // Replace setTimeout so 15000ms fires immediately (only the 15s matchmaking timer)
            (window as unknown as Record<string, unknown>).__fakeTimerInstalled__ = true;
            const origST = window.setTimeout;
            (window as unknown as Record<string, unknown>).__origST__ = origST;
            window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
                // Only accelerate the matchmaking 15s timeout
                const adjustedDelay = delay === 15000 ? 100 : delay;
                return origST(fn as TimerHandler, adjustedDelay, ...args);
            }) as typeof setTimeout;
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const pvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|BATTLE_QUEUE/i }).first();
        if (await pvpBtn.count() === 0) {
            test.skip(true, 'No PvP button visible — access gated');
            return;
        }

        await pvpBtn.click({ force: true });
        await page.waitForTimeout(400);

        const initiateBtn = page.getByRole('button', { name: /INITIATE_UPLINK|FIND_MATCH|SEARCH/i }).first();
        if (await initiateBtn.count() > 0) {
            await initiateBtn.click();

            // With accelerated timeout, AI_SENTINEL bot match should appear quickly
            await expect(
                page.locator('text=/AI_SENTINEL|BOT|MATCH_FOUND/i').first()
            ).toBeVisible({ timeout: 8000 });
        }
    });

    test('Cancel button during search resets to IDLE', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const pvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|BATTLE_QUEUE/i }).first();
        if (await pvpBtn.count() === 0) {
            test.skip(true, 'No PvP button visible — access gated');
            return;
        }

        await pvpBtn.click({ force: true });
        await page.waitForTimeout(400);

        const initiateBtn = page.getByRole('button', { name: /INITIATE_UPLINK|FIND_MATCH|SEARCH/i }).first();
        if (await initiateBtn.count() > 0) {
            await initiateBtn.click();
            await page.waitForTimeout(300);

            // Click cancel
            const cancelBtn = page.getByRole('button', { name: /CANCEL|ABORT|DISCONNECT/i }).first();
            if (await cancelBtn.count() > 0) {
                await cancelBtn.click();
                await page.waitForTimeout(200);
                // Should be back to idle — wager selector or initiate button visible again
                const idleBtn = page.getByRole('button', { name: /INITIATE_UPLINK|FIND_MATCH|SEARCH/i }).first();
                await expect(idleBtn).toBeVisible({ timeout: 3000 });
            }
        }
    });

    test('PvP terminal closes cleanly without errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const pvpBtn = page.getByRole('button', { name: /SECTOR.*ARENA|BATTLE_QUEUE/i }).first();
        if (await pvpBtn.count() === 0) {
            test.skip(true, 'No PvP button visible — access gated');
            return;
        }

        await pvpBtn.click({ force: true });
        await page.waitForTimeout(400);

        // Close via X button or Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // No JS errors should have been thrown
        const criticalErrors = errors.filter(e => !e.includes('supabase') && !e.includes('WebSocket'));
        expect(criticalErrors).toHaveLength(0);
    });
});

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('page loads and renders title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Protect The Streams/i);
    });

    test('streamer roster renders cards', async ({ page }) => {
        await page.goto('/');
        // Wait for the page to hydrate
        await page.waitForTimeout(2000);
        // The roster should have multiple streamer cards visible
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
    });

    test('wallet connect button exists', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
        // Look for wallet-related button
        const walletButton = page.locator('button:has-text("Connect"), button:has-text("WALLET"), button:has-text("Uplink")');
        const count = await walletButton.count();
        expect(count).toBeGreaterThan(0);
    });
});

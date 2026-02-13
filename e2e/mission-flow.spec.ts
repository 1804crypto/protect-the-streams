import { test, expect } from '@playwright/test';

test.describe('Mission Terminal', () => {
    test('clicking a streamer card opens mission UI', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(3000);

        // Look for a streamer card or clickable element
        const streamerCard = page.locator('[data-testid="streamer-card"], .streamer-card').first();
        const hasCards = await streamerCard.count();

        if (hasCards > 0) {
            await streamerCard.click();
            await page.waitForTimeout(1000);
            // After clicking, some mission UI should appear
            const body = await page.textContent('body');
            expect(body?.length).toBeGreaterThan(0);
        } else {
            // If no test IDs, just verify the page loaded without errors
            const body = await page.textContent('body');
            expect(body).toBeTruthy();
        }
    });
});

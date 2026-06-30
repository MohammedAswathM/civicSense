import { expect, test } from '@playwright/test';

test('citizen can report and receive a tracking ID', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/CivicSense/);
  await page.goto('/report', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Report an Issue' })).toBeVisible();
  await page.waitForTimeout(1500);
  await page.click('[data-testid="confirm-photo"]');
  await expect(page.getByText('✓ Photo selected')).toBeVisible();
  await page.click('[data-testid="next-step"]');
  await expect(page.locator('[data-testid="location-confirmed"]')).toContainText(/\d+\.\d+/);
  await page.click('[data-testid="next-step"]');
  await page.getByRole('button', { name: /pothole/i }).click();
  await page.fill('[data-testid="description-input"]', 'Large pothole near bus stop');
  await page.click('[data-testid="next-step"]');
  await expect(page.getByText(/Review and submit/i)).toBeVisible();
  await page.click('[data-testid="submit-report"]');
  await expect(page.locator('[data-testid="tracking-id"]')).toHaveText(/CS-\d{4}-[A-Z0-9]{4}/);
});

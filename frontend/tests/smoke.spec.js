import { test, expect } from '@playwright/test';

test.describe('SuperChase Dashboard Smoke Tests', () => {

  test('dashboard loads and shows online status', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load - check for SuperChase branding in sidebar
    await expect(page.locator('text=SuperChase').first()).toBeVisible();
    await expect(page.locator('text=Executive OS').first()).toBeVisible();

    // Check Dashboard nav item is visible
    await expect(page.locator('text=Dashboard').first()).toBeVisible();

    // Wait for API to respond and show online
    await expect(page.locator('text=Online').first()).toBeVisible({ timeout: 15000 });
  });

  test('all main cards render', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check main cards are visible - use heading selectors for uniqueness
    await expect(page.getByRole('heading', { name: 'Business Velocity' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Task Pipeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Strategic Roadmap' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Friction Radar' })).toBeVisible();
  });

  test('George orb is interactive', async ({ page }) => {
    await page.goto('/');

    // Find the George orb button
    const orb = page.locator('button[title="Click to generate new briefing"]');
    await expect(orb).toBeVisible();

    // Verify it's clickable (don't actually click to avoid triggering briefing)
    await expect(orb).toBeEnabled();
  });

  test('quick ingest modal opens and closes', async ({ page }) => {
    await page.goto('/');

    // Click the + button
    const addButton = page.locator('button[title="Quick Ingest"]');
    await addButton.click();

    // Verify modal opens
    await expect(page.locator('h2:has-text("Quick Ingest")')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Cancel")').click();

    // Verify modal closed
    await expect(page.locator('h2:has-text("Quick Ingest")')).not.toBeVisible();
  });

  test('business unit filters are clickable', async ({ page }) => {
    await page.goto('/');

    // Check filter buttons exist - use first() for buttons that might appear multiple times
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Scan2Plan")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Studio C")').first()).toBeVisible();

    // Click a filter - verify it's interactive
    const s2pButton = page.locator('button:has-text("Scan2Plan")').first();
    await s2pButton.click();

    // Verify the button is still visible after click (didn't break)
    await expect(s2pButton).toBeVisible();
    // Verify it has tabindex (is focusable/interactive)
    await expect(s2pButton).toHaveAttribute('tabindex', '0');
  });

  test('system status shows spoke health', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for spoke names in System Status card
    await expect(page.locator('text=Hub (Gemini)').first()).toBeVisible();
    await expect(page.locator('text=Asana Spoke').first()).toBeVisible();
    await expect(page.locator('text=Voice (ElevenLabs)').first()).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like favicon 404)
    const criticalErrors = errors.filter(e => !e.includes('favicon'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('system alerts card renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that System Alerts card is visible - use heading for specificity
    await expect(page.getByRole('heading', { name: 'System Alerts' })).toBeVisible();
  });

  test('alerts show all-clear when no issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The card should either show alerts OR show "All systems operational"
    const allClear = page.locator('text=All systems operational').first();
    const hasAlerts = page.locator('[class*="alert-critical"], [class*="alert-warning"]').first();

    // Wait for either state - either we have alerts or all clear message
    await expect(allClear.or(hasAlerts)).toBeVisible({ timeout: 10000 });
  });

});

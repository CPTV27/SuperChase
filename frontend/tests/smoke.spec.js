import { test, expect } from '@playwright/test';

test.describe('SuperChase Dashboard Smoke Tests', () => {

  test('dashboard loads and shows online status', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await expect(page.locator('h1')).toContainText('SuperChase');

    // Check version text
    await expect(page.locator('text=Executive Command Center')).toBeVisible();

    // Wait for API to respond and show online
    await expect(page.locator('text=Online')).toBeVisible({ timeout: 15000 });
  });

  test('all main cards render', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check main cards are visible
    await expect(page.locator('text=Business Velocity')).toBeVisible();
    await expect(page.locator('text=Task Pipeline')).toBeVisible();
    await expect(page.locator('text=System Status')).toBeVisible();
    await expect(page.locator('text=Strategic Roadmap')).toBeVisible();
    await expect(page.locator('text=Friction Radar')).toBeVisible();
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

    // Check filter buttons exist
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Scan2Plan")')).toBeVisible();
    await expect(page.locator('button:has-text("Studio C")')).toBeVisible();

    // Click a filter
    await page.locator('button:has-text("Scan2Plan")').click();

    // Verify it becomes active (has background color)
    const s2pButton = page.locator('button:has-text("Scan2Plan")');
    await expect(s2pButton).toHaveCSS('background-color', 'rgb(59, 130, 246)');
  });

  test('system status shows spoke health', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for spoke names in System Status card
    await expect(page.locator('text=Hub (Gemini)')).toBeVisible();
    await expect(page.locator('text=Asana Spoke')).toBeVisible();
    await expect(page.locator('text=Voice (ElevenLabs)')).toBeVisible();
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

    // Check that System Alerts card is visible
    await expect(page.locator('text=System Alerts')).toBeVisible();
  });

  test('alerts show all-clear when no issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The card should either show alerts OR show "All systems operational"
    const alertCard = page.locator('div:has(> div:has-text("System Alerts"))');
    const allClear = alertCard.locator('text=All systems operational');
    const hasAlerts = alertCard.locator('.alert-critical, .alert-warning, .alert-info');

    // Wait for either state - either we have alerts or all clear message
    await expect(allClear.or(hasAlerts.first())).toBeVisible({ timeout: 10000 });
  });

});

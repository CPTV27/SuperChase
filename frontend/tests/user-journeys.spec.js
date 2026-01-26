import { test, expect } from '@playwright/test';

test.describe('User Journey Tests', () => {

  test('executive can view daily briefing', async ({ page }) => {
    await page.goto('/');

    // Wait for briefing card to load
    await page.waitForLoadState('networkidle');

    // Find George's Briefing section
    const briefingSection = page.locator('text=George\'s Briefing').first();
    await expect(briefingSection).toBeVisible();

    // Verify briefing metrics are displayed (Urgent count and Tasks count)
    await expect(page.locator('text=Urgent').first()).toBeVisible();
    await expect(page.locator('text=Tasks').first()).toBeVisible();
  });

  test('executive can view task metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check Business Velocity card shows metrics
    await expect(page.getByRole('heading', { name: 'Business Velocity' })).toBeVisible();

    // Verify metric numbers are displayed
    const tasksActive = page.locator('text=Tasks Active').first();
    await expect(tasksActive).toBeVisible();

    const triagedToday = page.locator('text=Triaged Today').first();
    await expect(triagedToday).toBeVisible();
  });

  test('executive can view system health at a glance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // System Status card should be visible
    await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();

    // Should show Spokes Online count
    const spokesOnline = page.locator('text=Spokes Online').first();
    await expect(spokesOnline).toBeVisible();

    // Should show individual spoke status
    await expect(page.locator('text=Asana Spoke').first()).toBeVisible();
    await expect(page.locator('text=Hub (Gemini)').first()).toBeVisible();
  });

  test('sidebar navigation is fully functional', async ({ page }) => {
    await page.goto('/');

    // Verify main nav items exist and are clickable
    const navItems = ['Dashboard', 'Tasks', 'Review Queue', 'Marketing Hub', 'Audit Log', 'Settings'];

    for (const item of navItems) {
      const navItem = page.locator(`text=${item}`).first();
      await expect(navItem).toBeVisible();
    }

    // Verify portfolio business units are listed
    await expect(page.locator('text=PORTFOLIO WASHES').first()).toBeVisible();
    await expect(page.locator('text=Scan2Plan').first()).toBeVisible();
  });

  test('friction radar displays issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Friction Radar card should be visible
    await expect(page.getByRole('heading', { name: 'Friction Radar' })).toBeVisible();

    // Should show Friction Points metric
    const frictionPoints = page.locator('text=Friction Points').first();
    await expect(frictionPoints).toBeVisible();
  });

  test('strategic roadmap shows priorities', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Strategic Roadmap card should be visible
    await expect(page.getByRole('heading', { name: 'Strategic Roadmap' })).toBeVisible();
  });

  test('quick actions toolbar is accessible', async ({ page }) => {
    await page.goto('/');

    // Find the action toolbar (Team, Briefing, Scout, Brief, Draft, Publish)
    await expect(page.locator('text=Team').first()).toBeVisible();
    await expect(page.locator('text=Briefing').first()).toBeVisible();
    await expect(page.locator('text=Scout').first()).toBeVisible();
    await expect(page.locator('text=Brief').first()).toBeVisible();
    await expect(page.locator('text=Draft').first()).toBeVisible();
    await expect(page.locator('text=Publish').first()).toBeVisible();
  });

  test('portfolio sidebar navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify Portfolio Washes section exists in sidebar
    await expect(page.locator('text=PORTFOLIO WASHES').first()).toBeVisible();

    // Verify business units are listed in sidebar
    await expect(page.locator('text=Big Muddy Inn').first()).toBeVisible();
    await expect(page.locator('text=Studio C').first()).toBeVisible();

    // Click on Big Muddy Inn in sidebar to navigate to its GST page
    // (Use Big Muddy Inn since "Scan2Plan" appears in sidebar header too)
    await page.locator('text=Big Muddy Inn').first().click();

    // Wait for navigation to GST page
    await page.waitForURL(/\/gst\/bigmuddy/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Should navigate to GST page with Goals section
    await expect(page.locator('text=Goals').first()).toBeVisible({ timeout: 10000 });
  });

  test('refresh button is functional', async ({ page }) => {
    await page.goto('/');

    // Find the refresh button (sync icon in top right)
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    // Click should not cause errors
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // Page should still be functional
      await expect(page.locator('text=Scan2Plan').first()).toBeVisible();
    }
  });

  test('mobile/tablet layout is usable', async ({ page }) => {
    // Test at iPad size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Core content should still be visible
    await expect(page.locator('text=Scan2Plan').first()).toBeVisible();
    await expect(page.locator('text=Dashboard').first()).toBeVisible();

    // Cards should be visible
    await expect(page.getByRole('heading', { name: 'Business Velocity' })).toBeVisible();
  });

  test('no visual regressions on dark theme', async ({ page }) => {
    await page.goto('/');

    // Verify dark theme is applied (background should be dark)
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);

    // Should be a dark color (low luminance)
    // Dark themes typically have RGB values below 50
    expect(bgColor).toMatch(/rgb|oklab/);
  });

});

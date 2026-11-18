/**
 * @file tests/e2e/admin.spec.js
 * Playwright E2E test specs for System Administrator flows.
 * Owned by Member 3 per Master Integration Contract §2.5.
 */

import { test, expect } from '@playwright/test';

test.describe('System Administrator Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock token for SYSTEM_ADMIN role
    await page.addInitScript(() => {
      localStorage.setItem('fc_token', 'mock-system-admin-jwt');
      localStorage.setItem('fc_user', JSON.stringify({
        id: 'user-admin-1',
        role: 'SYSTEM_ADMIN',
        name: 'Chief SysAdmin',
      }));
    });
  });

  test('displays user management table with role selector', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.locator('h1')).toContainText('System Administration Dashboard');
    await expect(page.locator('th', { hasText: 'Role' })).toBeVisible();

    // Verify role select dropdown is present
    const roleSelect = page.locator('select').first();
    await expect(roleSelect).toBeVisible();
  });

  test('queue and processing stats tab renders BullMQ queue metrics', async ({ page }) => {
    await page.goto('/admin');

    await page.click('button:has-text("Queue & Processing")');
    await expect(page.locator('h3', { hasText: "BullMQ Queue: 'claim-processing'" })).toBeVisible();
  });

  test('health tab displays operational status across mongo, postgres, redis, and s3', async ({ page }) => {
    await page.goto('/admin');

    await page.click('button:has-text("Health")');
    await expect(page.locator('h3', { hasText: 'System Status:' })).toBeVisible();
  });
});

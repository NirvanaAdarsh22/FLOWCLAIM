/**
 * @file tests/e2e/finance.spec.js
 * Playwright E2E test specs for Finance Administrator flows.
 * Owned by Member 3 per Master Integration Contract §2.5.
 */

import { test, expect } from '@playwright/test';

test.describe('Finance Administrator Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock token for FINANCE_ADMIN role
    await page.addInitScript(() => {
      localStorage.setItem('fc_token', 'mock-finance-admin-jwt');
      localStorage.setItem('fc_user', JSON.stringify({
        id: 'user-fin-1',
        role: 'FINANCE_ADMIN',
        name: 'Finance Officer',
      }));
    });
  });

  test('displays budget list and allows switching between tabs', async ({ page }) => {
    await page.goto('/finance');

    // Verify main header
    await expect(page.locator('h1')).toContainText('Finance Administration Dashboard');

    // Check tab navigation exists
    const tabs = page.locator('button', { hasText: 'Budgets' });
    await expect(tabs).toBeVisible();

    // Switch to Ledger tab
    await page.click('button:has-text("Ledger")');
    await expect(page.locator('th', { hasText: 'Entry ID' })).toBeVisible();

    // Switch to Audit tab
    await page.click('button:has-text("Audit")');
    await expect(page.locator('th', { hasText: 'Audit ID' })).toBeVisible();
  });

  test('submitting a new budget form updates display', async ({ page }) => {
    await page.goto('/finance');

    await page.fill('input[placeholder="emp-101"]', 'emp-test-99');
    await page.fill('input[placeholder="10000"]', '15000');
    await page.click('button:has-text("Set Budget")');

    // Check if new budget entry is rendered or form is reset
    await expect(page.locator('input[placeholder="emp-101"]')).toHaveValue('');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Basic Page Loads', () => {
  test('should load the Dashboard page', async ({ page }) => {
    await page.goto('/');
    // Check for a heading or a unique element on the dashboard
    await expect(page.locator('h1:has-text("BetAI")')).toBeVisible(); 
    // Check that there are no console errors related to loading
    page.on('console', msg => {
      if (msg.type() === 'error') {
        expect(msg.text()).not.toContain('Failed to load');
      }
    });
  });

  test('should load the NBA Games page', async ({ page }) => {
    await page.goto('/nba');
    await expect(page.locator('h1:has-text("NBA Predictions")')).toBeVisible();
    // Optionally, wait for loading to finish and check for game cards
    // await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible({ timeout: 15000 });
    // await expect(page.locator('[data-testid="game-card"]')).toHaveCount( { timeout: 10000 }); // Check if cards > 0
    page.on('console', msg => {
      if (msg.type() === 'error') {
        expect(msg.text()).not.toContain('Failed to load');
      }
    });
  });

  test('should load the MLB Games page', async ({ page }) => {
    await page.goto('/mlb');
    await expect(page.locator('h1:has-text("MLB Predictions")')).toBeVisible();
    // Optionally, wait for loading to finish and check for game cards
    // await expect(page.locator('[data-testid="loading-skeleton"]')).not.toBeVisible({ timeout: 15000 });
    // await expect(page.locator('[data-testid="game-card"]')).toHaveCount( { timeout: 10000 });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        expect(msg.text()).not.toContain('Failed to load');
      }
    });
  });

  test('should load the Insights page', async ({ page }) => {
    await page.goto('/insights');
    // Check for a unique element on the insights page
    await expect(page.locator('h1:has-text("Betting Insights")')).toBeVisible(); 
    page.on('console', msg => {
      if (msg.type() === 'error') {
        expect(msg.text()).not.toContain('Failed to load');
      }
    });
  });
}); 
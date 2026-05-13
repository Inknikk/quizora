import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('auth page loads and shows sign in form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('auth page switches to register mode', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('protected route redirects to auth when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/auth');
  });
});

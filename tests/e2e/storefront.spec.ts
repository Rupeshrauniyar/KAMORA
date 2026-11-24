import { test, expect } from '@playwright/test';

test.describe('Kamora D2C Storefront & Security Boundaries', () => {
  test('renders luxury homepage and navigates to flagship back support belt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Move Freely\. Live Fully\./i })).toBeVisible();
    await expect(page.getByText(/The Complete Back Comfort Kit/i)).toBeVisible();

    await page.getByRole('link', { name: /Discover Your Support/i }).click();
    await expect(page).toHaveURL(/\/products\/back-support-belt/);
    await expect(
      page.getByRole('heading', { name: /Kamora Adjustable Back Support Belt/i })
    ).toBeVisible();
  });

  test('size guide waist calculator suggests size and adds item to cart', async ({ page }) => {
    await page.goto('/products/back-support-belt');
    await page.getByRole('button', { name: /Size Guide & Calculator/i }).click();
    await page.getByLabel(/Enter waist measurement/i).fill('36');
    await expect(page.getByText(/Suggested Size:/i)).toBeVisible();
    await page.getByRole('button', { name: /Select Size L/i }).click();

    await page.getByRole('button', { name: /Add to Cart/i }).first().click();
    await expect(page.getByText(/Your Cart \(1\)/i)).toBeVisible();
  });

  test('PIN code checker validates Indian delivery zones', async ({ page }) => {
    await page.goto('/products/back-support-belt');
    await page.getByLabel(/6-digit Indian PIN code/i).fill('560038');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText(/Delivery available to 560038/i)).toBeVisible();
  });

  test('blocks unauthenticated access to /admin and redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

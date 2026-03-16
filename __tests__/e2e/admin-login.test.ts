/**
 * admin-login.test.ts  (E2E — Playwright)
 *
 * Tests the Payload CMS admin login flow.
 * Credentials: admin@test.com / TestAdmin123!
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "TestAdmin123!";

test.describe("Admin login", () => {
  test("admin login page loads and shows the login form", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // The Payload admin login form should be present
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test("logging in with valid credentials redirects to admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);

    // Submit the form
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should redirect away from login page
    await page.waitForURL((url) => !url.pathname.includes("login"), {
      timeout: 15000,
    });

    // Dashboard should be visible
    await expect(page).toHaveURL(/\/admin/);
  });

  test("logging in with invalid credentials shows an error message", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill("wrong@example.com");
    await passwordInput.fill("WrongPassword123!");

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should stay on or near the login page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/admin/);

    // An error message or alert should appear
    const errorText = page.locator('[role="alert"], .error, .notification--error, [class*="error"]');
    await expect(errorText.first()).toBeVisible({ timeout: 10000 });
  });
});

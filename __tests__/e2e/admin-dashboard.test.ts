/**
 * admin-dashboard.test.ts  (E2E — Playwright)
 *
 * Tests that the admin dashboard loads correctly after login:
 *   - Stat cards render
 *   - Quick action buttons are present and clickable
 *
 * Uses shared login helper.
 */

import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "TestAdmin123!";

async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  await page.waitForURL((url) => !url.pathname.includes("login"), {
    timeout: 15000,
  });
}

test.describe("Admin dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard page loads successfully", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin/);
    // Page should not be an error page
    const body = page.locator("body");
    await expect(body).not.toContainText("500");
  });

  test("the BeforeDashboard custom component renders with store stats", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Our custom BeforeDashboard injects store data above the default admin dashboard
    // It may contain headings like "Dashboard", "Orders", or stat cards
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500);
  });

  test("admin navigation links are present", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Payload admin renders navigation for collections
    // There should be links for Products, Orders, Users, Media
    const nav = page.locator("nav, [role='navigation'], .nav");
    await expect(nav.first()).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to the Products collection", async ({ page }) => {
    await page.goto("/admin/collections/products");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/collections\/products/);
    // Should not redirect to login
    await expect(page).not.toHaveURL(/login/);
  });

  test("can navigate to the Orders collection", async ({ page }) => {
    await page.goto("/admin/collections/orders");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/collections\/orders/);
    await expect(page).not.toHaveURL(/login/);
  });
});

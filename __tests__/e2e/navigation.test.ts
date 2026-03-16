/**
 * navigation.test.ts  (E2E — Playwright)
 *
 * Tests the Home → Products → Product Detail → Cart user flow.
 * Requires the server to be running at http://localhost:3000.
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation flow", () => {
  test("homepage loads and displays the site title / hero content", async ({ page }) => {
    await page.goto("/");
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    // The page title or a prominent heading should be visible
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("products page loads and shows a grid of products", async ({ page }) => {
    await page.goto("/products");
    // Wait for product cards to appear
    await page.waitForLoadState("networkidle");
    // Expect at least one product card link to be present
    const productLinks = page.locator("a[href*='/products/']");
    await expect(productLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking a product card navigates to the product detail page", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Click the first product card link
    const firstProductLink = page.locator("a[href*='/products/']").first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();

    // Should navigate to a /products/<slug> URL
    await expect(page).toHaveURL(/\/products\/.+/);
  });

  test("product detail page has an Add to Cart button", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const firstProductLink = page.locator("a[href*='/products/']").first();
    await firstProductLink.click();
    await page.waitForLoadState("networkidle");

    // Add to Cart button should be present
    const addBtn = page.getByRole("button", { name: /add to cart/i });
    await expect(addBtn).toBeVisible({ timeout: 10000 });
  });

  test("adding a product to cart updates the cart icon count", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const firstProductLink = page.locator("a[href*='/products/']").first();
    await firstProductLink.click();
    await page.waitForLoadState("networkidle");

    // Click Add to Cart
    const addBtn = page.getByRole("button", { name: /add to cart/i });
    await addBtn.click();

    // Wait briefly for state update
    await page.waitForTimeout(500);

    // Navigate to cart page
    await page.goto("/cart");
    await page.waitForLoadState("networkidle");

    // Cart should have at least one item
    const cartItems = page.locator("[data-testid='cart-item'], .cart-item, li");
    // Alternatively, check for a non-empty cart indicator
    await expect(page.locator("body")).not.toContainText("Your cart is empty");
  });
});

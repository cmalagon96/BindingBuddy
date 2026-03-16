/**
 * checkout-validation.test.ts
 *
 * Tests for validateCartItems() and calculateTotal() in checkout-validation.ts.
 * These are pure functions with no I/O — no mocks required.
 */

import { describe, it, expect } from "vitest";
import {
  validateCartItems,
  calculateTotal,
  type ValidatedCartItem,
} from "@/lib/checkout-validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validItem = (overrides: Partial<ValidatedCartItem> = {}): ValidatedCartItem => ({
  productId: "prod-abc",
  name: "Pikachu Binder",
  price: 4999,
  quantity: 2,
  ...overrides,
});

// ---------------------------------------------------------------------------
// validateCartItems
// ---------------------------------------------------------------------------

describe("validateCartItems", () => {
  describe("array-level guards", () => {
    it("throws when items is null", () => {
      expect(() => validateCartItems(null)).toThrow("Cart is empty");
    });

    it("throws when items is not an array", () => {
      expect(() => validateCartItems("not-an-array")).toThrow("Cart is empty");
    });

    it("throws when items array is empty", () => {
      expect(() => validateCartItems([])).toThrow("Cart is empty");
    });

    it("throws when more than 50 items are present", () => {
      const items = Array.from({ length: 51 }, (_, i) =>
        validItem({ productId: `prod-${i}` })
      );
      expect(() => validateCartItems(items)).toThrow("Too many items in cart");
    });

    it("accepts exactly 50 items", () => {
      const items = Array.from({ length: 50 }, (_, i) =>
        validItem({ productId: `prod-${i}` })
      );
      expect(() => validateCartItems(items)).not.toThrow();
    });
  });

  describe("item-level validation", () => {
    it("throws when an item is null", () => {
      expect(() => validateCartItems([null])).toThrow("Invalid item at index 0");
    });

    it("throws when an item is a primitive", () => {
      expect(() => validateCartItems([42])).toThrow("Invalid item at index 0");
    });

    it("throws when productId is missing", () => {
      const item = { ...validItem(), productId: "" };
      expect(() => validateCartItems([item])).toThrow("Missing productId at index 0");
    });

    it("throws when productId is a number instead of string", () => {
      const item = { ...validItem(), productId: 123 };
      expect(() => validateCartItems([item])).toThrow("Missing productId at index 0");
    });

    it("throws when name is missing", () => {
      const item = { ...validItem(), name: "" };
      expect(() => validateCartItems([item])).toThrow("Missing name at index 0");
    });

    it("throws when price is 0", () => {
      const item = { ...validItem(), price: 0 };
      expect(() => validateCartItems([item])).toThrow("Invalid price at index 0");
    });

    it("throws when price is negative", () => {
      const item = { ...validItem(), price: -100 };
      expect(() => validateCartItems([item])).toThrow("Invalid price at index 0");
    });

    it("throws when price is a float", () => {
      const item = { ...validItem(), price: 9.99 };
      expect(() => validateCartItems([item])).toThrow("Invalid price at index 0");
    });

    it("throws when price is a string", () => {
      const item = { ...validItem(), price: "9.99" };
      expect(() => validateCartItems([item])).toThrow("Invalid price at index 0");
    });

    it("throws when quantity is 0", () => {
      const item = { ...validItem(), quantity: 0 };
      expect(() => validateCartItems([item])).toThrow("Invalid quantity at index 0");
    });

    it("throws when quantity is 100 (above max)", () => {
      const item = { ...validItem(), quantity: 100 };
      expect(() => validateCartItems([item])).toThrow("Invalid quantity at index 0");
    });

    it("accepts quantity of 1 (minimum)", () => {
      const items = [validItem({ quantity: 1 })];
      expect(() => validateCartItems(items)).not.toThrow();
    });

    it("accepts quantity of 99 (maximum)", () => {
      const items = [validItem({ quantity: 99 })];
      expect(() => validateCartItems(items)).not.toThrow();
    });

    it("throws when quantity is a float", () => {
      const item = { ...validItem(), quantity: 1.5 };
      expect(() => validateCartItems([item])).toThrow("Invalid quantity at index 0");
    });

    it("returns valid items with optional image included", () => {
      const items = [validItem()];
      const result = validateCartItems(items);
      expect(result[0]).toMatchObject({
        productId: "prod-abc",
        name: "Pikachu Binder",
        price: 4999,
        quantity: 2,
      });
    });

    it("strips non-string image values (returns undefined)", () => {
      const item = { ...validItem(), image: 12345 };
      const result = validateCartItems([item]);
      expect(result[0].image).toBeUndefined();
    });

    it("preserves string image values", () => {
      const item = { ...validItem(), image: "/img.png" };
      const result = validateCartItems([item]);
      expect(result[0].image).toBe("/img.png");
    });
  });
});

// ---------------------------------------------------------------------------
// calculateTotal
// ---------------------------------------------------------------------------

describe("calculateTotal", () => {
  it("returns the correct sum of price * quantity for all items", () => {
    const items: ValidatedCartItem[] = [
      validItem({ price: 1000, quantity: 2 }),
      validItem({ productId: "prod-b", price: 500, quantity: 3 }),
    ];
    expect(calculateTotal(items)).toBe(3500);
  });

  it("throws when total is below Stripe minimum (50 cents)", () => {
    const items: ValidatedCartItem[] = [validItem({ price: 1, quantity: 1 })];
    expect(() => calculateTotal(items)).toThrow("below the minimum charge");
  });

  it("does not throw when total equals exactly 50 cents", () => {
    const items: ValidatedCartItem[] = [validItem({ price: 50, quantity: 1 })];
    expect(() => calculateTotal(items)).not.toThrow();
    expect(calculateTotal(items)).toBe(50);
  });

  it("correctly calculates a single-item cart", () => {
    const items: ValidatedCartItem[] = [validItem({ price: 4999, quantity: 1 })];
    expect(calculateTotal(items)).toBe(4999);
  });
});

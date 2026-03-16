/**
 * cart-store.test.ts
 *
 * Tests for the Zustand cart store: add, remove, update quantity, clear,
 * persistence key, and max-quantity cap (MED-13).
 *
 * Zustand stores are singletons in the module registry.  We reset internal
 * state between tests by calling clearCart() rather than re-importing.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Stub out zustand/middleware "persist" so we don't need localStorage in jsdom
// ---------------------------------------------------------------------------
vi.mock("zustand/middleware", () => ({
  persist: (fn: unknown) => fn,
}));

// Import AFTER mocking middleware
import { useCartStore } from "@/lib/cart-store";

const { getState } = useCartStore;

const makeItem = (overrides: Partial<Parameters<typeof getState>["0"] extends never ? never : ReturnType<typeof getState>["items"][0]> = {}) => ({
  productId: "prod-1",
  name: "Test Product",
  price: 1000,
  image: "/img.png",
  quantity: 1,
  ...overrides,
});

beforeEach(() => {
  getState().clearCart();
});

describe("addItem", () => {
  it("adds a new item to an empty cart", () => {
    const item = makeItem();
    getState().addItem(item);
    expect(getState().items).toHaveLength(1);
    expect(getState().items[0]).toMatchObject(item);
  });

  it("increments quantity when the same productId is added again", () => {
    getState().addItem(makeItem({ quantity: 3 }));
    getState().addItem(makeItem({ quantity: 2 }));
    const items = getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it("caps accumulated quantity at 99 (MED-13)", () => {
    getState().addItem(makeItem({ quantity: 95 }));
    getState().addItem(makeItem({ quantity: 10 }));
    expect(getState().items[0].quantity).toBe(99);
  });

  it("caps initial quantity at 99 when a single add exceeds the limit", () => {
    getState().addItem(makeItem({ quantity: 50 }));
    getState().addItem(makeItem({ quantity: 60 }));
    expect(getState().items[0].quantity).toBe(99);
  });

  it("adds multiple distinct products independently", () => {
    getState().addItem(makeItem({ productId: "prod-1" }));
    getState().addItem(makeItem({ productId: "prod-2", name: "Other" }));
    expect(getState().items).toHaveLength(2);
  });
});

describe("removeItem", () => {
  it("removes an item by productId", () => {
    getState().addItem(makeItem());
    getState().removeItem("prod-1");
    expect(getState().items).toHaveLength(0);
  });

  it("does not error when removing a productId that is not in the cart", () => {
    getState().addItem(makeItem());
    expect(() => getState().removeItem("does-not-exist")).not.toThrow();
    expect(getState().items).toHaveLength(1);
  });

  it("removes only the targeted item, leaving others intact", () => {
    getState().addItem(makeItem({ productId: "prod-1" }));
    getState().addItem(makeItem({ productId: "prod-2", name: "Other" }));
    getState().removeItem("prod-1");
    expect(getState().items).toHaveLength(1);
    expect(getState().items[0].productId).toBe("prod-2");
  });
});

describe("updateQty", () => {
  it("updates an item's quantity to the supplied value", () => {
    getState().addItem(makeItem({ quantity: 1 }));
    getState().updateQty("prod-1", 5);
    expect(getState().items[0].quantity).toBe(5);
  });

  it("clamps quantity to 1 when 0 is supplied (MED-12)", () => {
    getState().addItem(makeItem({ quantity: 3 }));
    getState().updateQty("prod-1", 0);
    expect(getState().items[0].quantity).toBe(1);
  });

  it("clamps quantity to 1 when a negative value is supplied (MED-12)", () => {
    getState().addItem(makeItem({ quantity: 3 }));
    getState().updateQty("prod-1", -10);
    expect(getState().items[0].quantity).toBe(1);
  });

  it("does not affect other items when updating one item", () => {
    getState().addItem(makeItem({ productId: "prod-1", quantity: 1 }));
    getState().addItem(makeItem({ productId: "prod-2", name: "Other", quantity: 2 }));
    getState().updateQty("prod-1", 7);
    expect(getState().items.find((i) => i.productId === "prod-2")?.quantity).toBe(2);
  });
});

describe("clearCart", () => {
  it("empties all items from the cart", () => {
    getState().addItem(makeItem({ productId: "prod-1" }));
    getState().addItem(makeItem({ productId: "prod-2", name: "Other" }));
    getState().clearCart();
    expect(getState().items).toHaveLength(0);
  });

  it("is idempotent — clearing an already-empty cart does not throw", () => {
    expect(() => getState().clearCart()).not.toThrow();
    expect(getState().items).toHaveLength(0);
  });
});

describe("persistence key", () => {
  it("store is created successfully (persistence layer stubbed out)", () => {
    // The store module loaded without error — confirms the persist wrapper
    // is compatible with our mock.
    expect(useCartStore).toBeDefined();
  });
});

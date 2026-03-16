/**
 * validate-stock.test.ts
 *
 * Tests for validateStock() in src/lib/inventory/validate-stock.ts.
 *
 * validateStock() calls payload.find() internally.  We mock the entire
 * "payload" module and "@payload-config" so no MongoDB connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StockItem } from "@/lib/inventory/types";

// ---------------------------------------------------------------------------
// Mock @payload-config — must come before importing validate-stock
// ---------------------------------------------------------------------------
vi.mock("@payload-config", () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Mock payload module
// ---------------------------------------------------------------------------
const mockFind = vi.fn();

vi.mock("payload", () => ({
  getPayload: vi.fn(() =>
    Promise.resolve({
      find: mockFind,
    })
  ),
}));

import { validateStock } from "@/lib/inventory/validate-stock";

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: "prod-1",
  name: "Test Product",
  stock: 10,
  ...overrides,
});

const stubFind = (docs: ReturnType<typeof makeProduct>[]) => {
  mockFind.mockResolvedValue({ docs });
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Edge cases: empty input
// ---------------------------------------------------------------------------

describe("validateStock — empty input", () => {
  it("returns valid with no unavailable items for empty array", async () => {
    const result = await validateStock([]);
    expect(result.valid).toBe(true);
    expect(result.unavailableItems).toHaveLength(0);
  });

  it("does not call payload for empty input", async () => {
    await validateStock([]);
    expect(mockFind).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Normal stock
// ---------------------------------------------------------------------------

describe("validateStock — normal stock", () => {
  it("passes when requested quantity is below available stock", async () => {
    stubFind([makeProduct({ stock: 10 })]);
    const items: StockItem[] = [{ productId: "prod-1", quantity: 5 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
    expect(result.unavailableItems).toHaveLength(0);
  });

  it("passes when requested quantity equals available stock (exact match)", async () => {
    stubFind([makeProduct({ stock: 5 })]);
    const items: StockItem[] = [{ productId: "prod-1", quantity: 5 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
  });

  it("fails when requested quantity exceeds available stock", async () => {
    stubFind([makeProduct({ stock: 3 })]);
    const items: StockItem[] = [{ productId: "prod-1", quantity: 10 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems).toHaveLength(1);
    expect(result.unavailableItems[0]).toMatchObject({
      productId: "prod-1",
      requested: 10,
      available: 3,
    });
  });

  it("treats undefined stock as 0 and marks item unavailable", async () => {
    stubFind([makeProduct({ stock: undefined })]);
    const items: StockItem[] = [{ productId: "prod-1", quantity: 1 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems[0].available).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unlimited stock (stock === -1)
// ---------------------------------------------------------------------------

describe("validateStock — unlimited stock", () => {
  it("passes for any quantity when stock is -1 (unlimited)", async () => {
    stubFind([makeProduct({ stock: -1 })]);
    const items: StockItem[] = [{ productId: "prod-1", quantity: 9999 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
    expect(result.unavailableItems).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Product not found
// ---------------------------------------------------------------------------

describe("validateStock — product not found", () => {
  it("marks item unavailable with 0 stock when product is not in DB", async () => {
    stubFind([]); // no products returned
    const items: StockItem[] = [{ productId: "ghost-id", quantity: 1 }];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems[0]).toMatchObject({
      productId: "ghost-id",
      available: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Variant-level stock
// ---------------------------------------------------------------------------

describe("validateStock — variant-level stock", () => {
  it("uses the variant stock when variantLabel is provided", async () => {
    stubFind([
      makeProduct({
        stock: 100,
        variants: [{ label: "Blue", stock: 2 }],
      }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 3, variantLabel: "Blue" },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems[0]).toMatchObject({
      requested: 3,
      available: 2,
    });
  });

  it("passes when variant stock is sufficient", async () => {
    stubFind([
      makeProduct({
        stock: 100,
        variants: [{ label: "Red", stock: 10 }],
      }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 5, variantLabel: "Red" },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
  });

  it("marks unavailable when the requested variant does not exist on the product", async () => {
    stubFind([
      makeProduct({
        variants: [{ label: "Green", stock: 5 }],
      }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 1, variantLabel: "Purple" },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems[0].available).toBe(0);
  });

  it("respects unlimited variant stock (variant.stock === -1)", async () => {
    stubFind([
      makeProduct({
        stock: 5,
        variants: [{ label: "Gold", stock: -1 }],
      }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 9999, variantLabel: "Gold" },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
  });

  it("treats undefined variant stock as 0", async () => {
    stubFind([
      makeProduct({
        variants: [{ label: "Silver" }], // no stock field
      }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 1, variantLabel: "Silver" },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems[0].available).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple items — mixed results
// ---------------------------------------------------------------------------

describe("validateStock — multiple items", () => {
  it("returns valid:false when any single item fails stock check", async () => {
    stubFind([
      makeProduct({ id: "prod-1", stock: 10 }),
      makeProduct({ id: "prod-2", name: "Low Stock", stock: 0 }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 5 },
      { productId: "prod-2", quantity: 1 },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(false);
    expect(result.unavailableItems).toHaveLength(1);
    expect(result.unavailableItems[0].productId).toBe("prod-2");
  });

  it("returns valid:true when all items have sufficient stock", async () => {
    stubFind([
      makeProduct({ id: "prod-1", stock: 10 }),
      makeProduct({ id: "prod-2", name: "Other", stock: 10 }),
    ]);
    const items: StockItem[] = [
      { productId: "prod-1", quantity: 3 },
      { productId: "prod-2", quantity: 4 },
    ];
    const result = await validateStock(items);
    expect(result.valid).toBe(true);
    expect(result.unavailableItems).toHaveLength(0);
  });
});

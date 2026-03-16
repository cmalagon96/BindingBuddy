/**
 * checkout.test.ts
 *
 * Unit tests for POST /api/checkout/create-payment-intent
 * Stripe is mocked — no real API calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPaymentIntentsCreate = vi.fn().mockResolvedValue({
  client_secret: "pi_test_secret_abc",
});

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
  })),
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "organic" }),
  }),
}));

// Mock stores registry
vi.mock("@/lib/stores", () => ({
  stores: {
    "cool-cards-phoenix": "Cool Cards Phoenix",
    "elite-four-games": "Elite Four Games",
  },
}));

// Mock Payload client (needed for server-side price verification)
vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn().mockResolvedValue({
    find: vi.fn().mockResolvedValue({
      docs: [
        { id: "prod-1", name: "Pikachu Binder", price: 4999, stock: 10, inStock: true, variants: [] },
        { id: "prod-2", name: "Other", price: 1000, stock: 5, inStock: true, variants: [] },
      ],
    }),
  }),
}));

// Mock stock validation (passes by default)
vi.mock("@/lib/inventory/validate-stock", () => ({
  validateStock: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

import { POST } from "@/app/api/checkout/create-payment-intent/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validItem = (overrides = {}) => ({
  productId: "prod-1",
  name: "Pikachu Binder",
  price: 4999,
  quantity: 1,
  image: "/img.png",
  ...overrides,
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/checkout/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPaymentIntentsCreate.mockResolvedValue({
    client_secret: "pi_test_secret_abc",
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/checkout/create-payment-intent — happy path", () => {
  it("returns 200 with clientSecret for a valid cart", async () => {
    const res = await POST(makeRequest({ items: [validItem()] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.clientSecret).toBe("pi_test_secret_abc");
  });

  it("creates a PaymentIntent with the correct total from DB prices (not client prices)", async () => {
    // Client sends price: 2000 and 1000, but DB has 4999 for prod-1 and 1000 for prod-2
    // Server uses DB prices: (4999 * 2) + (1000 * 1) = 10998
    const items = [
      validItem({ price: 2000, quantity: 2 }),
      validItem({ productId: "prod-2", name: "Other", price: 1000, quantity: 1 }),
    ];
    await POST(makeRequest({ items }));
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10998 })
    );
  });

  it("sets currency to usd", async () => {
    await POST(makeRequest({ items: [validItem()] }));
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "usd" })
    );
  });

  it("uses storeRef from the request body when it matches a known store", async () => {
    await POST(makeRequest({ items: [validItem()], storeRef: "cool-cards-phoenix" }));
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ store_ref: "cool-cards-phoenix" }),
      })
    );
  });

  it("falls back to cookie storeRef when body storeRef is not a known store", async () => {
    await POST(makeRequest({ items: [validItem()], storeRef: "fake-store" }));
    // cookie returns "organic" in the mock
    expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ store_ref: "organic" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Validation failures
// ---------------------------------------------------------------------------

describe("POST /api/checkout/create-payment-intent — validation", () => {
  it("returns 400 when items array is empty", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when items is missing from body", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("still rejects items with price 0 at validation layer", async () => {
    // price: 0 is caught by validateCartItems format check before DB lookup
    const res = await POST(makeRequest({ items: [validItem({ price: 0 })] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when an item has invalid quantity (0)", async () => {
    const res = await POST(makeRequest({ items: [validItem({ quantity: 0 })] }));
    expect(res.status).toBe(400);
  });

  it("server-side price prevents sub-minimum total (security fix)", async () => {
    // Client sends price: 1 but server uses DB price (4999) — total is valid
    const res = await POST(makeRequest({ items: [validItem({ price: 1, quantity: 1 })] }));
    // Should succeed because server price (4999) > Stripe minimum (50)
    expect(res.status).toBe(200);
  });

  it("returns 400 when more than 50 items are in the cart", async () => {
    const items = Array.from({ length: 51 }, (_, i) =>
      validItem({ productId: `prod-${i}` })
    );
    const res = await POST(makeRequest({ items }));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Stripe errors
// ---------------------------------------------------------------------------

describe("POST /api/checkout/create-payment-intent — Stripe error", () => {
  it("returns 400 when Stripe throws an error", async () => {
    mockPaymentIntentsCreate.mockRejectedValue(new Error("Stripe API down"));
    const res = await POST(makeRequest({ items: [validItem()] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});

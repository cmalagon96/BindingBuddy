/**
 * stripe-webhook.test.ts
 *
 * Unit tests for POST /api/webhooks/stripe
 * Stripe client is mocked — no real signature verification or API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@payload-config", () => ({ default: {} }));

const mockConstructEvent = vi.fn();
const mockPayloadFind = vi.fn();
const mockPayloadUpdate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

vi.mock("payload", () => ({
  getPayload: vi.fn(() =>
    Promise.resolve({
      find: mockPayloadFind,
      update: mockPayloadUpdate,
    })
  ),
}));

vi.mock("@/lib/orders/create-order", () => ({
  confirmOrder: vi.fn().mockResolvedValue({ id: "order-1", status: "confirmed" }),
}));

vi.mock("@/lib/email/send-order-confirmation", () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/inventory/deduct-stock", () => ({
  deductStock: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body = "raw-body", headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "stripe-signature": "sig_test",
      ...headers,
    },
    body,
  });
}

const pendingOrderDoc = {
  id: "order-1",
  status: "pending",
  customerEmail: "ash@pallet.town",
  items: [{ productId: "prod-1", quantity: 2 }],
  total: 4999,
  shippingAddress: {},
  paymentMethod: "stripe",
  paymentId: "pi_test_123",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  mockPayloadFind.mockResolvedValue({ docs: [pendingOrderDoc] });
  mockPayloadUpdate.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Configuration guards
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe — configuration", () => {
  it("returns 500 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe — signature verification", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    // Build a request with NO stripe-signature header
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "body",
      // deliberately omit stripe-signature
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// payment_intent.succeeded
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe — payment_intent.succeeded", () => {
  it("returns 200 with received:true for a successful event", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_test_123" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("skips processing when order is already confirmed (idempotency)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_test_123" } },
    });
    mockPayloadFind.mockResolvedValue({
      docs: [{ ...pendingOrderDoc, status: "confirmed" }],
    });

    const { confirmOrder } = await import("@/lib/orders/create-order");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(confirmOrder).not.toHaveBeenCalled();
  });

  it("returns 200 even when no order is found for the payment intent", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_ghost" } },
    });
    mockPayloadFind.mockResolvedValue({ docs: [] });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// payment_intent.payment_failed
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe — payment_intent.payment_failed", () => {
  it("returns 200 and marks the order as cancelled", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_test_123" } },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPayloadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
  });

  it("skips update when order is not in pending state", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_test_123" } },
    });
    mockPayloadFind.mockResolvedValue({
      docs: [{ ...pendingOrderDoc, status: "cancelled" }],
    });
    await POST(makeRequest());
    expect(mockPayloadUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unhandled event types
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe — unhandled event types", () => {
  it("returns 200 with received:true for unknown event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});

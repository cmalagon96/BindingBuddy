/**
 * contact.test.ts
 *
 * Unit tests for POST /api/contact
 * Tests validation, rate limiting, and Resend integration (mocked).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted so all factories must be self-contained.
// ---------------------------------------------------------------------------

// Resend mock: uses a class syntax so `new Resend()` works.
vi.mock("resend", () => {
  const sendMock = vi.fn().mockResolvedValue({ id: "email-id-123" });
  class ResendMock {
    emails = { send: sendMock };
  }
  return { Resend: ResendMock, __sendMock: sendMock };
});

// Rate-limit mock: pure factory, no external references.
vi.mock("@/lib/rate-limit", () => ({
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
  isRateLimited: vi.fn().mockReturnValue(false),
  recordFailedAttempt: vi.fn(),
}));

import { POST } from "@/app/api/contact/route";
import * as rateLimitModule from "@/lib/rate-limit";
import * as resendModule from "resend";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validBody = {
  name: "Ash Ketchum",
  email: "ash@pallet.town",
  binderType: "9-pocket",
  message: "I need a custom Pikachu engraving on my binder please!",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Returns the send mock from inside the mocked Resend class. */
function getSendMock() {
  // The mock class was constructed in the factory — access via a fresh instance
  const instance = new (resendModule.Resend as unknown as new () => { emails: { send: ReturnType<typeof vi.fn> } })();
  return instance.emails.send;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimitModule.isRateLimited).mockReturnValue(false);
  vi.mocked(rateLimitModule.recordFailedAttempt).mockReturnValue(undefined);
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.CONTACT_EMAIL = "team@bindingbuddy.com";
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/contact — happy path", () => {
  it("returns 200 with success:true for a valid submission", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("calls Resend emails.send once for a valid submission", async () => {
    await POST(makeRequest(validBody));
    const sendMock = getSendMock();
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("sends an email with the submitter's name in the subject", async () => {
    await POST(makeRequest(validBody));
    const sendMock = getSendMock();
    const callArg = sendMock.mock.calls[0]?.[0] as { subject: string } | undefined;
    expect(callArg?.subject).toContain("Ash Ketchum");
  });

  it("records a rate-limit attempt even on success", async () => {
    await POST(makeRequest(validBody));
    expect(vi.mocked(rateLimitModule.recordFailedAttempt)).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Validation failures
// ---------------------------------------------------------------------------

describe("POST /api/contact — validation", () => {
  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is shorter than 10 characters", async () => {
    const res = await POST(makeRequest({ ...validBody, message: "Hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 5000 characters", async () => {
    const res = await POST(makeRequest({ ...validBody, message: "x".repeat(5001) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when binderType is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, binderType: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is completely empty", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("POST /api/contact — rate limiting", () => {
  it("returns 429 when the IP is rate-limited", async () => {
    vi.mocked(rateLimitModule.isRateLimited).mockReturnValue(true);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });

  it("does not call Resend when rate-limited", async () => {
    vi.mocked(rateLimitModule.isRateLimited).mockReturnValue(true);
    await POST(makeRequest(validBody));
    const sendMock = getSendMock();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Missing configuration
// ---------------------------------------------------------------------------

describe("POST /api/contact — configuration", () => {
  it("returns 500 when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});

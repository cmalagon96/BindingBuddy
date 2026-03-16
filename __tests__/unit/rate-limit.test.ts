/**
 * rate-limit.test.ts
 *
 * Tests for the in-memory rate limiter:
 *   getRateLimitKey(), isRateLimited(), recordFailedAttempt(), clearFailedAttempts()
 *
 * Because the module uses a module-level Map as its store, each test uses a
 * unique namespace to avoid cross-test interference without needing module
 * resets.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { type NextRequest } from "next/server";
import {
  getRateLimitKey,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nsCounter = 0;
/** Returns a unique namespace string so tests never share state. */
function uniqueNs() {
  return `test-ns-${++nsCounter}`;
}

/** Minimal NextRequest stub — only the headers we care about. */
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as NextRequest;
}

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// getRateLimitKey
// ---------------------------------------------------------------------------

describe("getRateLimitKey", () => {
  it("returns a user-scoped key when userId is provided", () => {
    const req = makeRequest();
    expect(getRateLimitKey(req, "user-42")).toBe("user:user-42");
  });

  it("returns x-forwarded-for first IP when no userId", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getRateLimitKey(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "9.10.11.12" });
    expect(getRateLimitKey(req)).toBe("9.10.11.12");
  });

  it("falls back to 'unknown' when no IP headers are present", () => {
    const req = makeRequest();
    expect(getRateLimitKey(req)).toBe("unknown");
  });

  it("prefers userId over x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getRateLimitKey(req, "user-99")).toBe("user:user-99");
  });

  it("treats null / undefined userId as anonymous (uses IP fallback)", () => {
    const req = makeRequest({ "x-forwarded-for": "3.3.3.3" });
    expect(getRateLimitKey(req, null)).toBe("3.3.3.3");
    expect(getRateLimitKey(req, undefined)).toBe("3.3.3.3");
  });
});

// ---------------------------------------------------------------------------
// isRateLimited / recordFailedAttempt
// ---------------------------------------------------------------------------

describe("isRateLimited", () => {
  it("returns false for a key with no recorded attempts", () => {
    const ns = uniqueNs();
    expect(isRateLimited("brand-new-key", ns)).toBe(false);
  });

  it("returns false when attempts are below maxAttempts", () => {
    const ns = uniqueNs();
    recordFailedAttempt("key-a", ns, { maxAttempts: 5 });
    recordFailedAttempt("key-a", ns, { maxAttempts: 5 });
    expect(isRateLimited("key-a", ns, { maxAttempts: 5 })).toBe(false);
  });

  it("returns true once attempts reach maxAttempts", () => {
    const ns = uniqueNs();
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("key-b", ns, { maxAttempts: 5 });
    }
    expect(isRateLimited("key-b", ns, { maxAttempts: 5 })).toBe(true);
  });

  it("uses default maxAttempts of 5 when config is omitted", () => {
    const ns = uniqueNs();
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("key-c", ns);
    }
    expect(isRateLimited("key-c", ns)).toBe(true);
  });

  it("resets the counter after the window expires", () => {
    vi.useFakeTimers();
    const ns = uniqueNs();
    const config = { windowMs: 1000, maxAttempts: 2 };

    recordFailedAttempt("key-d", ns, config);
    recordFailedAttempt("key-d", ns, config);
    expect(isRateLimited("key-d", ns, config)).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(isRateLimited("key-d", ns, config)).toBe(false);
  });

  it("namespaces are isolated — different namespaces don't share counters", () => {
    const ns1 = uniqueNs();
    const ns2 = uniqueNs();
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("shared-key", ns1);
    }
    expect(isRateLimited("shared-key", ns1)).toBe(true);
    expect(isRateLimited("shared-key", ns2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearFailedAttempts
// ---------------------------------------------------------------------------

describe("clearFailedAttempts", () => {
  it("resets a rate-limited key so it passes again", () => {
    const ns = uniqueNs();
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("key-e", ns);
    }
    expect(isRateLimited("key-e", ns)).toBe(true);

    clearFailedAttempts("key-e", ns);
    expect(isRateLimited("key-e", ns)).toBe(false);
  });

  it("does not throw when clearing a key that was never recorded", () => {
    const ns = uniqueNs();
    expect(() => clearFailedAttempts("never-seen", ns)).not.toThrow();
  });

  it("only clears the targeted key, leaving others intact", () => {
    const ns = uniqueNs();
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("key-f", ns);
      recordFailedAttempt("key-g", ns);
    }
    clearFailedAttempts("key-f", ns);
    expect(isRateLimited("key-f", ns)).toBe(false);
    expect(isRateLimited("key-g", ns)).toBe(true);
  });
});

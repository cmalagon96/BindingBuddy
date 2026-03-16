/**
 * stores-api.test.ts
 *
 * Unit tests for:
 *   GET  /api/stores/check-ref   — cookie presence check
 *   POST /api/stores/set-ref     — sets store_ref cookie
 *   GET  /api/stores/[slug]/qr  — QR code PNG generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCookiesGet = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookiesGet,
      set: mockCookiesSet,
    })
  ),
}));

vi.mock("@/lib/stores", () => ({
  stores: {
    "cool-cards-phoenix": "Cool Cards Phoenix",
    "elite-four-games": "Elite Four Games",
  },
}));

// QRCode mock — returns a Buffer-like Uint8Array
vi.mock("qrcode", () => ({
  default: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
  },
}));

import { GET as checkRef } from "@/app/api/stores/check-ref/route";
import { POST as setRef } from "@/app/api/stores/set-ref/route";
import { GET as qrGet } from "@/app/api/stores/[slug]/qr/route";

// ---------------------------------------------------------------------------
// check-ref
// ---------------------------------------------------------------------------

describe("GET /api/stores/check-ref", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hasRef:false when no cookie is set", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    const res = await checkRef();
    const json = await res.json();
    expect(json.hasRef).toBe(false);
  });

  it("returns hasRef:false when cookie value is 'organic'", async () => {
    mockCookiesGet.mockReturnValue({ value: "organic" });
    const res = await checkRef();
    const json = await res.json();
    expect(json.hasRef).toBe(false);
  });

  it("returns hasRef:true when a real store slug is in the cookie", async () => {
    mockCookiesGet.mockReturnValue({ value: "cool-cards-phoenix" });
    const res = await checkRef();
    const json = await res.json();
    expect(json.hasRef).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// set-ref
// ---------------------------------------------------------------------------

describe("POST /api/stores/set-ref", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeSetRefRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/stores/set-ref", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 200 with ok:true for a valid store slug", async () => {
    const res = await setRef(makeSetRefRequest({ slug: "cool-cards-phoenix" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 400 when slug is not in the stores registry", async () => {
    const res = await setRef(makeSetRefRequest({ slug: "fake-store" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing from the request body", async () => {
    const res = await setRef(makeSetRefRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is an empty string", async () => {
    const res = await setRef(makeSetRefRequest({ slug: "" }));
    expect(res.status).toBe(400);
  });

  it("sets the store_ref cookie with httpOnly flag", async () => {
    const res = await setRef(makeSetRefRequest({ slug: "cool-cards-phoenix" }));
    expect(res.status).toBe(200);
    // The cookie is set on the response object, verify via Set-Cookie header
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("store_ref=cool-cards-phoenix");
    expect(setCookieHeader).toContain("HttpOnly");
  });
});

// ---------------------------------------------------------------------------
// QR code generation
// ---------------------------------------------------------------------------

describe("GET /api/stores/[slug]/qr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeQrRequest(slug: string, params: Record<string, string> = {}): NextRequest {
    const url = new URL(`http://localhost/api/stores/${slug}/qr`);
    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val);
    }
    return new NextRequest(url.toString());
  }

  it("returns 200 with image/png content-type for a known store", async () => {
    const res = await qrGet(makeQrRequest("cool-cards-phoenix"), {
      params: Promise.resolve({ slug: "cool-cards-phoenix" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 404 for an unknown store slug", async () => {
    const res = await qrGet(makeQrRequest("ghost-store"), {
      params: Promise.resolve({ slug: "ghost-store" }),
    });
    expect(res.status).toBe(404);
  });

  it("includes Content-Disposition attachment header when download=true", async () => {
    const res = await qrGet(makeQrRequest("elite-four-games", { download: "true" }), {
      params: Promise.resolve({ slug: "elite-four-games" }),
    });
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("elite-four-games-qr.png");
  });

  it("omits Content-Disposition when download is not set", async () => {
    const res = await qrGet(makeQrRequest("cool-cards-phoenix"), {
      params: Promise.resolve({ slug: "cool-cards-phoenix" }),
    });
    expect(res.headers.get("Content-Disposition")).toBeNull();
  });

  it("includes Cache-Control header", async () => {
    const res = await qrGet(makeQrRequest("cool-cards-phoenix"), {
      params: Promise.resolve({ slug: "cool-cards-phoenix" }),
    });
    expect(res.headers.get("Cache-Control")).toContain("max-age");
  });
});

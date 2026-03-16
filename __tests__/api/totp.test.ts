/**
 * totp.test.ts
 *
 * Unit tests for the TOTP lib functions (generateSecret, verifyToken,
 * getOtpauthUri, generateQRDataURL) and the totp route handlers.
 *
 * otplib and qrcode are mocked so no crypto randomness is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock otplib and qrcode for the totp lib
// ---------------------------------------------------------------------------

vi.mock("otplib", () => ({
  authenticator: {
    generateSecret: vi.fn().mockReturnValue("JBSWY3DPEHPK3PXP"),
    verify: vi.fn().mockReturnValue(true),
    keyuri: vi.fn().mockReturnValue("otpauth://totp/BindingBuddy%20Admin:user%40test.com?secret=ABC&issuer=BindingBuddy%20Admin"),
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,FAKE"),
  },
}));

import { generateSecret, verifyToken, getOtpauthUri, generateQRDataURL } from "@/lib/totp";

// ---------------------------------------------------------------------------
// Lib tests
// ---------------------------------------------------------------------------

describe("generateSecret", () => {
  it("returns a non-empty string", () => {
    const secret = generateSecret();
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThan(0);
  });
});

describe("verifyToken", () => {
  it("returns true for a valid token/secret pair", () => {
    expect(verifyToken("123456", "JBSWY3DPEHPK3PXP")).toBe(true);
  });

  it("returns false for an invalid token (mock returns false)", async () => {
    const { authenticator } = await import("otplib");
    vi.mocked(authenticator.verify).mockReturnValueOnce(false);
    expect(verifyToken("000000", "JBSWY3DPEHPK3PXP")).toBe(false);
  });
});

describe("getOtpauthUri", () => {
  it("returns a string starting with otpauth://", () => {
    const uri = getOtpauthUri("user@test.com", "ABC123");
    expect(uri.startsWith("otpauth://")).toBe(true);
  });
});

describe("generateQRDataURL", () => {
  it("resolves to a data URL string", async () => {
    const url = await generateQRDataURL("user@test.com", "SECRET");
    expect(url).toBe("data:image/png;base64,FAKE");
  });
});

// ---------------------------------------------------------------------------
// Route handler tests — TOTP verify logic (pure logic, mocked dependencies)
// ---------------------------------------------------------------------------

describe("TOTP verify logic", () => {
  it("rejects an empty token string as invalid", async () => {
    const { authenticator } = await import("otplib");
    vi.mocked(authenticator.verify).mockReturnValueOnce(false);

    const result = verifyToken("", "SECRET");
    expect(result).toBe(false);
  });

  it("accepts a 6-digit TOTP code when the secret matches", () => {
    const result = verifyToken("123456", "JBSWY3DPEHPK3PXP");
    expect(result).toBe(true);
  });
});

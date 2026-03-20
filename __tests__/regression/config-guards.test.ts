/**
 * config-guards.test.ts
 *
 * Guards against deployment-breaking regressions in payload.config.ts and
 * next.config.ts. Extends the pattern from admin-500-regression.test.ts.
 *
 * Covers:
 *   - payload.config.ts: env var guards, sharp import, collections count,
 *     no autoRun, vercelBlobStorage token guard
 *   - next.config.ts: AVIF image format, remotePatterns non-empty,
 *     security headers present
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../..");

function readRoot(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), "utf-8");
}

const payloadConfig = readRoot("payload.config.ts");
const nextConfig = readRoot("next.config.ts");

// ---------------------------------------------------------------------------
// payload.config.ts — deployment guards
// ---------------------------------------------------------------------------
describe("payload.config.ts — deployment guards", () => {
  it("PAYLOAD_SECRET uses process.env (not hardcoded)", () => {
    // Must reference process.env.PAYLOAD_SECRET, not a bare string literal
    expect(payloadConfig).toMatch(/process\.env\.PAYLOAD_SECRET/);
    // Must not assign a hardcoded non-env string to payloadSecret
    expect(payloadConfig).not.toMatch(/const payloadSecret\s*=\s*["'][^"']+["']/);
  });

  it("DATABASE_URI uses process.env (not hardcoded)", () => {
    expect(payloadConfig).toMatch(/process\.env\.DATABASE_URI/);
    expect(payloadConfig).not.toMatch(/const databaseUri\s*=\s*["'][^"']+["']/);
  });

  it("collections array contains at least 5 entries", () => {
    // Match the collections: [...] array and count collection references
    const collectionsMatch = payloadConfig.match(/collections:\s*\[([^\]]+)\]/);
    expect(collectionsMatch).not.toBeNull();
    const collectionsList = collectionsMatch![1];
    // Count comma-separated entries (N entries = N-1 commas + 1)
    const entries = collectionsList.split(",").map((s) => s.trim()).filter(Boolean);
    expect(entries.length).toBeGreaterThanOrEqual(5);
  });

  it("sharp is imported at the top level", () => {
    expect(payloadConfig).toMatch(/import\s+sharp\s+from\s+["']sharp["']/);
  });

  it("config does not contain autoRun (crashes Vercel serverless)", () => {
    // Inherited from admin-500-regression — kept here for completeness
    expect(payloadConfig).not.toContain("autoRun");
  });

  it("vercelBlobStorage enabled is guarded by BLOB_READ_WRITE_TOKEN", () => {
    expect(payloadConfig).toMatch(/enabled:\s*!!process\.env\.BLOB_READ_WRITE_TOKEN/);
  });

  it("vercelBlobStorage does not use enabled: true (unguarded)", () => {
    const blobMatch = payloadConfig.match(/vercelBlobStorage\s*\(\s*\{[\s\S]*?\}\s*\)/);
    expect(blobMatch).not.toBeNull();
    const blobSection = blobMatch![0];
    expect(blobSection).not.toMatch(/enabled:\s*true/);
  });
});

// ---------------------------------------------------------------------------
// next.config.ts — image optimization + security headers
// ---------------------------------------------------------------------------
describe("next.config.ts — image optimization", () => {
  it("image formats include avif", () => {
    expect(nextConfig).toContain("image/avif");
  });

  it("image formats include webp", () => {
    expect(nextConfig).toContain("image/webp");
  });

  it("remotePatterns is configured and non-empty", () => {
    // Must have at least one remotePatterns entry with a hostname key
    expect(nextConfig).toMatch(/remotePatterns:\s*\[/);
    expect(nextConfig).toContain("hostname");
  });
});

describe("next.config.ts — security headers", () => {
  it("X-Frame-Options header is present", () => {
    expect(nextConfig).toContain("X-Frame-Options");
  });

  it("X-Content-Type-Options header is present", () => {
    expect(nextConfig).toContain("X-Content-Type-Options");
  });

  it("Strict-Transport-Security header is present", () => {
    expect(nextConfig).toContain("Strict-Transport-Security");
  });

  it("Referrer-Policy header is present", () => {
    expect(nextConfig).toContain("Referrer-Policy");
  });

  it("async headers() function is exported via nextConfig", () => {
    // headers() must be a method on the config object, not just a loose function
    expect(nextConfig).toMatch(/headers\s*\(\s*\)/);
  });
});

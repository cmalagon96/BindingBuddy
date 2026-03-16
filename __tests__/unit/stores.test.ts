/**
 * stores.test.ts
 *
 * Tests for the partner store registry in src/lib/stores.ts.
 */

import { describe, it, expect } from "vitest";
import { stores, getStoreName } from "@/lib/stores";

describe("stores registry", () => {
  it("exports an object with at least one store entry", () => {
    expect(Object.keys(stores).length).toBeGreaterThan(0);
  });

  it("uses kebab-case slug keys", () => {
    for (const key of Object.keys(stores)) {
      expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has non-empty display name values", () => {
    for (const value of Object.values(stores)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("contains the canonical Cool Cards Phoenix entry", () => {
    expect(stores["cool-cards-phoenix"]).toBe("Cool Cards Phoenix");
  });
});

describe("getStoreName", () => {
  it("returns the display name for a known store slug", () => {
    const firstSlug = Object.keys(stores)[0];
    expect(getStoreName(firstSlug)).toBe(stores[firstSlug]);
  });

  it("returns the raw slug for an unknown store id (fallback)", () => {
    expect(getStoreName("unknown-store-xyz")).toBe("unknown-store-xyz");
  });

  it("returns empty string for empty string input", () => {
    // empty string is not in registry — returns input as fallback
    expect(getStoreName("")).toBe("");
  });
});

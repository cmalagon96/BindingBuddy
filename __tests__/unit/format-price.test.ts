/**
 * format-price.test.ts
 *
 * Tests for the formatPrice utility that converts integer cents to a
 * human-readable "$X.XX" string.
 */

import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/format-price";

describe("formatPrice", () => {
  it("formats a standard price correctly", () => {
    expect(formatPrice(1999)).toBe("$19.99");
  });

  it("formats zero cents as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats exactly 100 cents as $1.00", () => {
    expect(formatPrice(100)).toBe("$1.00");
  });

  it("formats 50 cents as $0.50", () => {
    expect(formatPrice(50)).toBe("$0.50");
  });

  it("formats whole dollar amounts with two decimal places", () => {
    expect(formatPrice(5000)).toBe("$50.00");
  });

  it("formats a large price correctly", () => {
    expect(formatPrice(99999)).toBe("$999.99");
  });

  it("always includes the dollar sign prefix", () => {
    expect(formatPrice(250).startsWith("$")).toBe(true);
  });

  it("always has exactly two decimal places", () => {
    const formatted = formatPrice(1001);
    const decimalPart = formatted.split(".")[1];
    expect(decimalPart).toHaveLength(2);
  });

  it("formats 1 cent as $0.01", () => {
    expect(formatPrice(1)).toBe("$0.01");
  });
});

/**
 * route-smoke.test.ts
 *
 * Smoke tests that assert every frontend page, API route, and layout file
 * exists and exports the correct symbol. These tests catch accidental
 * deletions, route renames, or removed HTTP-method exports before they
 * reach production.
 *
 * Pattern: read source as string, assert existence + export presence.
 * No module imports — pure filesystem checks so the suite runs without
 * environment variables or a running server.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../..");

function srcPath(relPath: string): string {
  return path.join(root, "src", relPath);
}

function readSrc(relPath: string): string {
  return fs.readFileSync(srcPath(relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Frontend pages — file exists and exports a default component
// ---------------------------------------------------------------------------
describe("Frontend pages — file exists and exports default", () => {
  const pages: Array<[string, string]> = [
    ["home", "app/(frontend)/page.tsx"],
    ["about", "app/(frontend)/about/page.tsx"],
    ["products list", "app/(frontend)/products/page.tsx"],
    ["product detail [slug]", "app/(frontend)/products/[slug]/page.tsx"],
    ["cart", "app/(frontend)/cart/page.tsx"],
    ["checkout", "app/(frontend)/checkout/page.tsx"],
    ["contact", "app/(frontend)/contact/page.tsx"],
    ["custom-order", "app/(frontend)/custom-order/page.tsx"],
    ["ref [slug] landing", "app/(frontend)/ref/[slug]/page.tsx"],
    ["stores [slug] print", "app/(frontend)/stores/[slug]/print/page.tsx"],
    ["payload admin catch-all", "app/(payload)/admin/[[...segments]]/page.tsx"],
  ];

  for (const [label, relPath] of pages) {
    it(`${label} — exists`, () => {
      expect(fs.existsSync(srcPath(relPath))).toBe(true);
    });

    it(`${label} — exports default`, () => {
      const source = readSrc(relPath);
      expect(source).toContain("export default");
    });
  }
});

// ---------------------------------------------------------------------------
// API routes — file exists and exports the correct HTTP method handler
// ---------------------------------------------------------------------------
describe("API routes — file exists and exports correct HTTP method", () => {
  // [label, relPath, method]
  const postRoutes: Array<[string, string]> = [
    [
      "checkout create-payment-intent",
      "app/api/checkout/create-payment-intent/route.ts",
    ],
    [
      "checkout paypal capture-order",
      "app/api/checkout/paypal/capture-order/route.ts",
    ],
    [
      "checkout paypal create-order",
      "app/api/checkout/paypal/create-order/route.ts",
    ],
    [
      "checkout stripe confirm-order",
      "app/api/checkout/stripe/confirm-order/route.ts",
    ],
    ["contact", "app/api/contact/route.ts"],
    ["stores set-ref", "app/api/stores/set-ref/route.ts"],
    ["webhooks stripe", "app/api/webhooks/stripe/route.ts"],
    ["admin totp setup", "app/api/admin/totp/setup/route.ts"],
    ["admin totp verify", "app/api/admin/totp/verify/route.ts"],
    ["admin totp disable", "app/api/admin/totp/disable/route.ts"],
    ["admin weekly-report", "app/api/admin/weekly-report/route.ts"],
  ];

  for (const [label, relPath] of postRoutes) {
    it(`${label} — exists`, () => {
      expect(fs.existsSync(srcPath(relPath))).toBe(true);
    });

    it(`${label} — exports POST handler`, () => {
      const source = readSrc(relPath);
      expect(source).toMatch(/export\s+(async\s+)?function\s+POST|export\s+const\s+POST\s*=/);
    });
  }

  const getRoutes: Array<[string, string]> = [
    ["stores [slug] qr", "app/api/stores/[slug]/qr/route.ts"],
    ["stores check-ref", "app/api/stores/check-ref/route.ts"],
    ["admin totp status", "app/api/admin/totp/status/route.ts"],
  ];

  for (const [label, relPath] of getRoutes) {
    it(`${label} — exists`, () => {
      expect(fs.existsSync(srcPath(relPath))).toBe(true);
    });

    it(`${label} — exports GET handler`, () => {
      const source = readSrc(relPath);
      expect(source).toMatch(/export\s+(async\s+)?function\s+GET|export\s+const\s+GET\s*=/);
    });
  }

  // Payload catch-all exports both GET and POST
  it("payload api catch-all — exists", () => {
    expect(
      fs.existsSync(srcPath("app/(payload)/api/[...slug]/route.ts"))
    ).toBe(true);
  });

  it("payload api catch-all — exports GET", () => {
    const source = readSrc("app/(payload)/api/[...slug]/route.ts");
    expect(source).toMatch(/export\s+(async\s+)?function\s+GET|export\s+const\s+GET\s*=/);
  });

  it("payload api catch-all — exports POST", () => {
    const source = readSrc("app/(payload)/api/[...slug]/route.ts");
    expect(source).toMatch(/export\s+(async\s+)?function\s+POST|export\s+const\s+POST\s*=/);
  });
});

// ---------------------------------------------------------------------------
// Layouts — required wrappers present and export default
// ---------------------------------------------------------------------------
describe("Layouts — file exists and exports default", () => {
  const layouts: Array<[string, string]> = [
    ["root layout", "app/layout.tsx"],
    ["frontend group layout", "app/(frontend)/layout.tsx"],
    ["payload group layout", "app/(payload)/layout.tsx"],
    ["cart layout", "app/(frontend)/cart/layout.tsx"],
    ["checkout layout", "app/(frontend)/checkout/layout.tsx"],
    ["products layout", "app/(frontend)/products/layout.tsx"],
    ["contact layout", "app/(frontend)/contact/layout.tsx"],
  ];

  for (const [label, relPath] of layouts) {
    it(`${label} — exists`, () => {
      expect(fs.existsSync(srcPath(relPath))).toBe(true);
    });

    it(`${label} — exports default`, () => {
      const source = readSrc(relPath);
      expect(source).toContain("export default");
    });
  }
});

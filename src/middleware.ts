import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Unified CSP for all public routes — payment security is enforced server-side.
// Stripe/PayPal SDKs loaded only from allowlisted domains.
const SHARED_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.stripe.com https://www.paypalobjects.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  "connect-src 'self' https://api.stripe.com https://q.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
];

// ---------------------------------------------------------------------------
// P27: TOTP cookie HMAC validation for Edge Runtime (Web Crypto API)
// R4: Uses Date.now() (UTC milliseconds) — no locale-dependent dates.
// R6: Typed cookie parts — no `as any`.
// R7: Missing/empty/malformed cookies are treated as "not verified".
// ---------------------------------------------------------------------------
const TOTP_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

interface TotpCookieParts {
  userId: string;
  timestamp: string;
  hmac: string;
}

function parseTotpCookie(cookieValue: string): TotpCookieParts | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;
  const [userId, timestamp, hmac] = parts;
  if (!userId || !timestamp || !hmac) return null;
  return { userId, timestamp, hmac };
}

/**
 * Validate the HMAC-signed totp_verified cookie using Web Crypto API (Edge Runtime).
 * Returns true only if the cookie has a valid HMAC and has not expired.
 */
async function validateTotpCookieEdge(cookieValue: string): Promise<boolean> {
  const secret = process.env.TOTP_COOKIE_SECRET || process.env.PAYLOAD_SECRET;
  if (!secret) return false;

  const parsed = parseTotpCookie(cookieValue);
  if (!parsed) return false;

  // R4: Validate timestamp is a valid base-36 number and within the 8-hour window
  const cookieTimeMs = parseInt(parsed.timestamp, 36);
  if (isNaN(cookieTimeMs) || cookieTimeMs <= 0) return false;
  if (Date.now() - cookieTimeMs > TOTP_COOKIE_MAX_AGE_MS) return false;

  // Compute expected HMAC using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${parsed.userId}:${parsed.timestamp}`);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedHmac = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison: compare all chars, don't short-circuit
    if (parsed.hmac.length !== expectedHmac.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expectedHmac.length; i++) {
      mismatch |= parsed.hmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // MFA enforcement is handled entirely by TOTPProvider (admin.components.providers).
  // It covers all cases: not logged in, TOTP not enabled, needs verification, already verified.
  // No middleware redirect needed — avoids redirect loops for unauthenticated users.

  // --- CSP injection (skip admin routes — handled by static header in next.config.ts) ---
  const requestHeaders = new Headers(request.headers);
  let cspHeader: string;

  if (pathname.startsWith("/admin")) {
    // Admin CSP is set via next.config.ts static headers — pass through.
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return applyReferralCookie(request, response, pathname);
  }

  const isDev = process.env.NODE_ENV !== "production";

  const devEval = isDev ? " 'unsafe-eval'" : "";
  const scriptSrc = `script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com${devEval}`;
  cspHeader = [...SHARED_DIRECTIVES, scriptSrc].join("; ");

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);

  return applyReferralCookie(request, response, pathname);
}

/** Store referral cookie — from ?ref= query param OR /ref/[slug] path */
function applyReferralCookie(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
): NextResponse {
  const queryRef = request.nextUrl.searchParams.get("ref");
  const pathMatch = pathname.match(/^\/ref\/([a-z0-9-]+)$/);
  const storeRef = queryRef || (pathMatch ? pathMatch[1] : null);

  // MED-1: Validate store_ref against allowlist pattern before setting cookie
  const STORE_REF_REGEX = /^[a-z0-9-]{1,64}$/;
  if (storeRef && STORE_REF_REGEX.test(storeRef.trim().toLowerCase())) {
    response.cookies.set("store_ref", storeRef.trim().toLowerCase(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|images/).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};

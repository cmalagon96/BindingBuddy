import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Payment routes get strict nonce-based CSP; other public routes get relaxed CSP.
const PAYMENT_ROUTES = ["/checkout", "/cart", "/contact"];

function isPaymentRoute(pathname: string): boolean {
  return PAYMENT_ROUTES.some((route) => pathname.startsWith(route));
}

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

export function middleware(request: NextRequest) {
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

  if (isPaymentRoute(pathname)) {
    // Nonce-based CSP for payment routes.
    // NOTE: 'strict-dynamic' is intentionally NOT used here because it causes
    // browsers to ignore 'self', which blocks webpack chunk loading for
    // next/dynamic imports (ChunkLoadError). Instead we use 'self' + nonce
    // so that same-origin chunks load normally while inline scripts still
    // require the nonce.
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
    requestHeaders.set("x-nonce", nonce);

    const devEval = isDev ? " 'unsafe-eval'" : "";
    const scriptSrc = `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com${devEval}`;
    cspHeader = [...SHARED_DIRECTIVES, scriptSrc].join("; ");
  } else {
    // Relaxed CSP for other public routes
    const devEval = isDev ? " 'unsafe-eval'" : "";
    const scriptSrc = `script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com${devEval}`;
    cspHeader = [...SHARED_DIRECTIVES, scriptSrc].join("; ");
  }

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

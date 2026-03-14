import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { verifyToken } from "@/lib/totp";
import crypto from "crypto";
import {
  getRateLimitKey,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/rate-limit";

// HIGH-3 / MED-3: Rate limiting uses shared module keyed by userId.
// Namespace "totp" is shared between verify and disable routes so attempts
// count toward the same per-user limit.
const RATE_LIMIT_NAMESPACE = "totp";

// ---------------------------------------------------------------------------
// HIGH-4: HMAC-based totp_verified cookie scoped to user
// ---------------------------------------------------------------------------
function createTotpCookieValue(userId: string): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is not set");
  const timestamp = Date.now().toString(36);
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${timestamp}`)
    .digest("hex");
  return `${userId}:${timestamp}:${hmac}`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();

    const { user } = await payload.auth({ headers: headersList });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const typedUser = user as {
      id: string;
      totpSecret?: string;
      totpEnabled?: boolean;
    };

    // MED-3: Rate limit by userId (not spoofable IP)
    const rateLimitKey = getRateLimitKey(req, typedUser.id);
    if (isRateLimited(rateLimitKey, RATE_LIMIT_NAMESPACE)) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429 }
      );
    }

    const { token, action } = (await req.json()) as {
      token: string;
      action?: "enable" | "verify";
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get the secret directly from DB (field is hidden from API reads)
    const fullUser = await payload.findByID({
      collection: "users",
      id: typedUser.id,
      overrideAccess: true,
    });

    const secret = (fullUser as Record<string, unknown>).totpSecret as
      | string
      | undefined;

    if (!secret) {
      return NextResponse.json(
        { error: "TOTP not set up. Run setup first." },
        { status: 400 }
      );
    }

    const valid = verifyToken(token, secret);
    if (!valid) {
      recordFailedAttempt(rateLimitKey, RATE_LIMIT_NAMESPACE);
      return NextResponse.json(
        { error: "Invalid TOTP code" },
        { status: 400 }
      );
    }

    // Successful verification — clear rate limit record
    clearFailedAttempts(rateLimitKey, RATE_LIMIT_NAMESPACE);

    // If this is the initial enable action, mark TOTP as enabled
    if (action === "enable" && !typedUser.totpEnabled) {
      await payload.update({
        collection: "users",
        id: typedUser.id,
        data: { totpEnabled: true } as Record<string, unknown>,
        overrideAccess: true,
      });
    }

    // HIGH-4: Set HMAC-signed session cookie scoped to userId
    const cookieStore = await cookies();
    cookieStore.set("totp_verified", createTotpCookieValue(typedUser.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Session cookie — expires when browser closes
    });

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

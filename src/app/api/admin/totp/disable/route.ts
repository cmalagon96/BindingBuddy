import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { verifyToken } from "@/lib/totp";
import {
  getRateLimitKey,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/rate-limit";

// HIGH-3: Rate limiting shared with verify route (same namespace + per-user key)
const RATE_LIMIT_NAMESPACE = "totp";

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

    if (!typedUser.totpEnabled) {
      return NextResponse.json(
        { error: "TOTP is not enabled" },
        { status: 400 }
      );
    }

    const { token } = (await req.json()) as { token: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Current TOTP code required to disable" },
        { status: 400 }
      );
    }

    // Get secret from DB
    const fullUser = await payload.findByID({
      collection: "users",
      id: typedUser.id,
      overrideAccess: true,
    });

    const secret = (fullUser as Record<string, unknown>).totpSecret as
      | string
      | undefined;

    if (!secret || !verifyToken(token, secret)) {
      recordFailedAttempt(rateLimitKey, RATE_LIMIT_NAMESPACE);
      return NextResponse.json(
        { error: "Invalid TOTP code" },
        { status: 400 }
      );
    }

    // Success — clear rate limit
    clearFailedAttempts(rateLimitKey, RATE_LIMIT_NAMESPACE);

    await payload.update({
      collection: "users",
      id: typedUser.id,
      data: {
        totpEnabled: false,
        totpSecret: "",
      } as Record<string, unknown>,
      overrideAccess: true,
    });

    return NextResponse.json({ disabled: true });
  } catch (error) {
    console.error("TOTP disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable TOTP" },
      { status: 500 }
    );
  }
}

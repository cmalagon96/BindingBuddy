import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getPayloadClient } from "@/lib/payload";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// HIGH-4: Validate HMAC-signed totp_verified cookie is scoped to current user
// MED-6: Removed console.log that logged userId and cookie values
// ---------------------------------------------------------------------------
function validateTotpCookie(cookieValue: string, userId: string): boolean {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) return false;

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return false;

  const [cookieUserId, timestamp, hmac] = parts;

  // Verify the cookie belongs to this user
  if (cookieUserId !== userId) return false;

  // Verify the cookie hasn't expired (8-hour window)
  const cookieTime = parseInt(timestamp, 36);
  const maxAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  if (isNaN(cookieTime) || Date.now() - cookieTime > maxAge) return false;

  // Verify the HMAC
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(`${cookieUserId}:${timestamp}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const payload = await getPayloadClient();
    const headersList = await headers();

    const { user } = await payload.auth({ headers: headersList });
    if (!user) {
      // Clear TOTP session cookie if user is not authenticated
      const cookieStore = await cookies();
      cookieStore.delete("totp_verified");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const typedUser = user as { id: string; totpEnabled?: boolean };
    const cookieStore = await cookies();
    const totpEnabled = typedUser.totpEnabled === true;
    const cookieValue = cookieStore.get("totp_verified")?.value;

    // HIGH-4: Validate cookie HMAC and userId match
    const totpVerified = cookieValue
      ? validateTotpCookie(cookieValue, typedUser.id)
      : false;

    return NextResponse.json({
      totpEnabled,
      totpVerified: !totpEnabled || totpVerified,
    });
  } catch (error) {
    console.error("TOTP status error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

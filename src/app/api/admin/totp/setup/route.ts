import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPayloadClient } from "@/lib/payload";
import { generateSecret, generateQRDataURL } from "@/lib/totp";

export async function POST() {
  try {
    const payload = await getPayloadClient();
    const headersList = await headers();

    const { user } = await payload.auth({ headers: headersList });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const typedUser = user as { id: string; email: string; totpEnabled?: boolean };

    if (typedUser.totpEnabled) {
      return NextResponse.json(
        { error: "TOTP is already enabled" },
        { status: 400 }
      );
    }

    const secret = generateSecret();
    const qrDataURL = await generateQRDataURL(typedUser.email, secret);

    // Store the secret temporarily (not yet enabled)
    await payload.update({
      collection: "users",
      id: typedUser.id,
      data: { totpSecret: secret } as Record<string, unknown>,
      overrideAccess: true,
    });

    return NextResponse.json({ qrDataURL });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up TOTP" },
      { status: 500 }
    );
  }
}

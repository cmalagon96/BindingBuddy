import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPayPalApiBase, getPayPalAccessToken } from "@/lib/paypal";
import { validateCartItems, calculateTotal } from "@/lib/checkout-validation";
import { stores } from "@/lib/stores";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// HIGH-2: Sign the server-generated orderId for capture verification
// ---------------------------------------------------------------------------
function signOrderId(orderId: string): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET not set");
  return crypto
    .createHmac("sha256", secret)
    .update(`paypal_order:${orderId}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = validateCartItems(body.items);
    const totalCents = calculateTotal(items);
    const totalDollars = (totalCents / 100).toFixed(2);

    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("store_ref")?.value || "organic";
    // Body storeRef (from fallback picker) takes priority if valid
    const storeRef =
      body.storeRef && stores[body.storeRef] ? body.storeRef : cookieRef;

    const accessToken = await getPayPalAccessToken();
    const base = getPayPalApiBase();

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: totalDollars,
            },
            custom_id: storeRef,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      // HIGH-11: Log full error, return generic message
      console.error("[paypal/create-order] PayPal API error:", text);
      return NextResponse.json(
        { error: "Payment processing failed" },
        { status: 500 }
      );
    }

    const order = await res.json();

    // HIGH-2: Store signed orderId in httpOnly cookie for capture verification
    cookieStore.set("pp_order_sig", signOrderId(order.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30, // 30 minutes — generous for checkout
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    // HIGH-11: Log full error, return generic message
    console.error("[paypal/create-order] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

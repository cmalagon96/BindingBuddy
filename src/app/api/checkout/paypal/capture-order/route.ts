import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPayPalApiBase, getPayPalAccessToken } from "@/lib/paypal";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// HIGH-2: PayPal orderId validation + signed cookie verification
// ---------------------------------------------------------------------------
const PAYPAL_ORDER_ID_REGEX = /^[A-Z0-9]{17}$/;

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
    const { orderId } = body;

    // HIGH-2 / MED-14: Validate orderId presence and format
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    if (!PAYPAL_ORDER_ID_REGEX.test(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    // HIGH-2: Verify orderId matches the signed cookie from create-order
    const cookieStore = await cookies();
    const expectedSig = cookieStore.get("pp_order_sig")?.value;
    const actualSig = signOrderId(orderId);
    if (!expectedSig || expectedSig !== actualSig) {
      return NextResponse.json(
        { error: "Order ID mismatch" },
        { status: 400 }
      );
    }

    // Clear the one-time-use cookie
    cookieStore.delete("pp_order_sig");

    // Capture the PayPal order
    const accessToken = await getPayPalAccessToken();
    const base = getPayPalApiBase();

    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      // HIGH-11: Log full error, return generic message
      console.error("[paypal/capture] PayPal capture failed:", text);
      return NextResponse.json(
        { error: "Payment processing failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    if (data.status !== "COMPLETED") {
      console.error("[paypal/capture] Unexpected status:", data.status);
      return NextResponse.json(
        { error: "Payment processing failed" },
        { status: 500 }
      );
    }

    const captureId =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    return NextResponse.json({ status: data.status, captureId });
  } catch (err) {
    // HIGH-11: Log full error, return generic message
    console.error("[paypal/capture] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

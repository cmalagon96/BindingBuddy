import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPayPalApiBase, getPayPalAccessToken } from "@/lib/paypal";
import {
  validateAndPriceCartItems,
  calculateTotal,
} from "@/lib/checkout-validation";
import { validateStock } from "@/lib/inventory/validate-stock";
import { stores } from "@/lib/stores";
import crypto from "crypto";
import { checkoutLimiter } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// P10: Dedicated PayPal signing secret with fallback warning
// ---------------------------------------------------------------------------
function getPayPalSigningSecret(): string {
  const dedicated = process.env.PAYPAL_SIGNING_SECRET;
  if (dedicated) return dedicated;

  const fallback = process.env.PAYLOAD_SECRET;
  if (!fallback) {
    throw new Error("Server configuration error");
  }
  console.warn(
    "[security] PAYPAL_SIGNING_SECRET is not set — falling back to shared secret. " +
      "Set a dedicated PAYPAL_SIGNING_SECRET for proper key separation."
  );
  return fallback;
}

// ---------------------------------------------------------------------------
// HIGH-2: Sign the server-generated orderId for capture verification
// ---------------------------------------------------------------------------
function signOrderId(orderId: string): string {
  return crypto
    .createHmac("sha256", getPayPalSigningSecret())
    .update(`paypal_order:${orderId}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    // P12: Rate limit checkout requests
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";
    const { success } = await checkoutLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();

    // P1: Server-side price verification — prices come from DB, not client
    const items = await validateAndPriceCartItems(body.items);

    // P8: Validate stock BEFORE creating the PayPal order
    const stockResult = await validateStock(
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantLabel: i.variant,
      }))
    );
    if (!stockResult.valid) {
      return NextResponse.json(
        {
          error: "Some items are out of stock",
          unavailableItems: stockResult.unavailableItems,
        },
        { status: 400 }
      );
    }

    const totalCents = calculateTotal(items);
    const totalDollars = (totalCents / 100).toFixed(2);

    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("store_ref")?.value || "organic";
    // P21: Validate cookie-sourced storeRef against allowlist too
    const rawRef = body.storeRef || cookieRef;
    const storeRef =
      body.storeRef && stores[body.storeRef]
        ? body.storeRef
        : stores[cookieRef]
          ? cookieRef
          : "organic";
    if (rawRef !== "organic" && !stores[rawRef]) {
      console.warn(`[store-attribution] unregistered slug "${rawRef}", falling back to organic`);
    }

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

    // P2: Store cart data in a signed cookie so capture route can create the order.
    // We encode items, customerEmail, shippingAddress, storeRef, and total.
    const pendingOrderData = JSON.stringify({
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        variant: i.variant,
      })),
      customerEmail: body.customerEmail,
      shippingAddress: body.shippingAddress,
      storeRef,
      totalCents,
    });
    const pendingOrderB64 = Buffer.from(pendingOrderData).toString("base64");
    const pendingOrderSig = crypto
      .createHmac("sha256", getPayPalSigningSecret())
      .update(`pp_pending:${pendingOrderB64}`)
      .digest("hex");

    cookieStore.set("pp_pending_order", `${pendingOrderB64}.${pendingOrderSig}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30,
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("[paypal/create-order] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

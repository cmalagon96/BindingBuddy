import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPayPalApiBase, getPayPalAccessToken } from "@/lib/paypal";
import { createOrder } from "@/lib/orders/create-order";
import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { deductStock } from "@/lib/inventory/deduct-stock";
import { validateShippingAddress } from "@/lib/shipping/validation";
import { stores } from "@/lib/stores";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// HIGH-2: PayPal orderId validation + signed cookie verification
// ---------------------------------------------------------------------------
const PAYPAL_ORDER_ID_REGEX = /^[A-Z0-9]{17}$/;

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

function signOrderId(orderId: string): string {
  return crypto
    .createHmac("sha256", getPayPalSigningSecret())
    .update(`paypal_order:${orderId}`)
    .digest("hex");
}

/**
 * Verify and decode the pending order data cookie set during create-order.
 * Returns the parsed order data or null if invalid/missing.
 */
function decodePendingOrderCookie(
  cookieValue: string | undefined
): {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    variant?: string;
  }>;
  customerEmail: string;
  shippingAddress: Record<string, unknown>;
  storeRef: string;
  totalCents: number;
} | null {
  if (!cookieValue) return null;

  let secret: string;
  try {
    secret = getPayPalSigningSecret();
  } catch {
    return null;
  }

  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const b64 = cookieValue.slice(0, dotIdx);
  const sig = cookieValue.slice(dotIdx + 1);

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`pp_pending:${b64}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (
    sig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    // Basic shape validation — customerEmail may be absent when ShippingForm
    // is not rendered in the checkout flow (architecture gap).
    if (
      !decoded ||
      !Array.isArray(decoded.items) ||
      typeof decoded.totalCents !== "number"
    ) {
      return null;
    }
    // Normalise missing customerEmail so downstream code always sees a string.
    if (typeof decoded.customerEmail !== "string") {
      decoded.customerEmail = "";
    }
    return decoded;
  } catch {
    return null;
  }
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

    // P2: Decode the pending order data before capture
    const pendingCookie = cookieStore.get("pp_pending_order")?.value;
    const pendingOrder = decodePendingOrderCookie(pendingCookie);
    if (!pendingOrder) {
      console.error("[paypal/capture] Missing or invalid pp_pending_order cookie");
      return NextResponse.json(
        { error: "Order session expired. Please restart checkout." },
        { status: 400 }
      );
    }

    // Clear the one-time-use cookies
    cookieStore.delete("pp_order_sig");
    cookieStore.delete("pp_pending_order");

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

    // P2: Verify captured amount matches expected total
    const capturedAmount =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    if (capturedAmount) {
      const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100);
      if (capturedCents !== pendingOrder.totalCents) {
        console.error(
          `[paypal/capture] Amount mismatch: captured ${capturedCents} vs expected ${pendingOrder.totalCents}`
        );
        // Log but don't fail — money is already captured. Flag for manual review.
      }
    }

    const captureId =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    // Extract buyer email from PayPal response as fallback when checkout
    // doesn't collect it (ShippingForm not rendered — architecture gap).
    const paypalBuyerEmail: string =
      data.payer?.email_address || pendingOrder.customerEmail || "";

    // Gap 6: custom_id from capture response as fallback for storeRef.
    // The pending cookie's storeRef is primary; custom_id is a recovery path
    // for cases where the cookie was lost between create and capture.
    const customIdRef = typeof data.purchase_units?.[0]?.custom_id === "string"
      ? data.purchase_units[0].custom_id
      : null;
    const rawStoreRef = pendingOrder.storeRef || customIdRef || "organic";
    const storeRef = stores[rawStoreRef] ? rawStoreRef : "organic";

    // P2: Create the order record in the database
    // Validate shipping address before creating order
    const shippingResult = validateShippingAddress(pendingOrder.shippingAddress);
    const shippingAddress = shippingResult.success && shippingResult.data
      ? shippingResult.data
      : {
          fullName: "",
          line1: "",
          city: "",
          state: "",
          postalCode: "",
          country: "US" as const,
        };

    try {
      const order = await createOrder({
        customerEmail: paypalBuyerEmail,
        items: pendingOrder.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant,
        })),
        total: pendingOrder.totalCents,
        shippingAddress,
        paymentMethod: "paypal",
        paymentId: orderId,
        storeRef,
      });

      // Deduct stock
      deductStock(
        pendingOrder.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantLabel: i.variant,
        }))
      ).catch((err) => {
        console.error("[paypal/capture] Failed to deduct stock:", err);
      });

      // Send confirmation email — fire and forget
      sendOrderConfirmation(order).catch((err) => {
        console.error("[paypal/capture] Failed to send confirmation email:", err);
      });

      return NextResponse.json({
        status: data.status,
        captureId,
        orderId: order.id,
      });
    } catch (orderErr) {
      // CRITICAL: Payment was captured but order creation failed.
      // Log everything needed for manual reconciliation.
      console.error(
        "[paypal/capture] CRITICAL: Payment captured but order creation failed.",
        {
          paypalOrderId: orderId,
          captureId,
          customerEmail: paypalBuyerEmail,
          totalCents: pendingOrder.totalCents,
          error: orderErr,
        }
      );
      // Still return success to the user — their payment went through.
      // The order will need manual reconciliation.
      return NextResponse.json({
        status: data.status,
        captureId,
        warning: "Order is being processed. You will receive a confirmation email shortly.",
      });
    }
  } catch (err) {
    console.error("[paypal/capture] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

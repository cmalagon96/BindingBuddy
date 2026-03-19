import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { getPayloadClient } from "@/lib/payload";
import { createOrder } from "@/lib/orders/create-order";
import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { deductStock } from "@/lib/inventory/deduct-stock";
import { validateShippingAddress } from "@/lib/shipping/validation";
import { stores } from "@/lib/stores";

// ---------------------------------------------------------------------------
// POST /api/checkout/stripe/confirm-order
//
// Called by the client AFTER stripe.confirmPayment() succeeds.
// Verifies payment with Stripe API, creates the order in Payload,
// deducts stock, and sends a confirmation email.
// ---------------------------------------------------------------------------

const PI_ID_REGEX = /^pi_[A-Za-z0-9]{16,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentIntentId, items, totalCents, customerEmail, shippingAddress } = body;

    // --- Validate paymentIntentId format ---
    if (
      !paymentIntentId ||
      typeof paymentIntentId !== "string" ||
      !PI_ID_REGEX.test(paymentIntentId)
    ) {
      return NextResponse.json(
        { error: "Invalid payment intent ID" },
        { status: 400 }
      );
    }

    // --- Validate items ---
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing order items" },
        { status: 400 }
      );
    }

    if (typeof totalCents !== "number" || totalCents < 50) {
      return NextResponse.json(
        { error: "Invalid order total" },
        { status: 400 }
      );
    }

    // --- Idempotency: check if order already exists for this PI ---
    const payload = await getPayloadClient();
    const existing = await payload.find({
      collection: "orders",
      where: { paymentId: { equals: paymentIntentId } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const existingOrder = existing.docs[0] as unknown as {
        id: string | number;
        status: string;
      };
      return NextResponse.json({
        status: "COMPLETED",
        orderId: String(existingOrder.id),
        duplicate: true,
      });
    }

    // --- Verify payment with Stripe API ---
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 400 }
      );
    }

    // Verify amount matches to prevent price manipulation
    if (pi.amount !== totalCents) {
      console.error(
        `[stripe/confirm] Amount mismatch: PI amount ${pi.amount} vs client ${totalCents}`
      );
      return NextResponse.json(
        { error: "Order total mismatch" },
        { status: 400 }
      );
    }

    // --- Resolve store ref ---
    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("store_ref")?.value || "organic";
    const storeRef = stores[cookieRef] ? cookieRef : "organic";

    // --- Validate shipping address ---
    const shippingResult = validateShippingAddress(shippingAddress);
    const validatedAddress =
      shippingResult.success && shippingResult.data
        ? shippingResult.data
        : {
            fullName: "",
            line1: "",
            city: "",
            state: "",
            postalCode: "",
            country: "US" as const,
          };

    // --- Resolve customer email ---
    // ShippingForm is not yet rendered (architecture gap), so customerEmail
    // may be absent. Fallback chain: client → PI receipt_email → placeholder.
    const email =
      (typeof customerEmail === "string" && customerEmail.length > 0
        ? customerEmail
        : pi.receipt_email) || `stripe+${paymentIntentId}@checkout.pending`;

    // --- Create order ---
    try {
      const order = await createOrder({
        customerEmail: email,
        items: items.map(
          (i: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
            variant?: string;
          }) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            variant: i.variant,
          })
        ),
        total: totalCents,
        shippingAddress: validatedAddress,
        paymentMethod: "stripe",
        paymentId: paymentIntentId,
        storeRef,
      });

      // Deduct stock — fire and forget
      deductStock(
        items.map(
          (i: { productId: string; quantity: number; variant?: string }) => ({
            productId: i.productId,
            quantity: i.quantity,
            variantLabel: i.variant,
          })
        )
      ).catch((err) => {
        console.error("[stripe/confirm] Failed to deduct stock:", err);
      });

      // Send confirmation email — fire and forget
      sendOrderConfirmation(order).catch((err) => {
        console.error(
          "[stripe/confirm] Failed to send confirmation email:",
          err
        );
      });

      return NextResponse.json({
        status: "COMPLETED",
        orderId: order.id,
        paymentIntentId,
      });
    } catch (orderErr) {
      // CRITICAL: Payment succeeded but order creation failed.
      console.error(
        "[stripe/confirm] CRITICAL: Payment succeeded but order creation failed.",
        {
          paymentIntentId,
          customerEmail: email,
          totalCents,
          error: orderErr,
        }
      );

      return NextResponse.json(
        {
          error:
            "Payment was processed but order creation failed. Please contact support.",
          paymentIntentId,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[stripe/confirm] Unhandled error:", err);
    return NextResponse.json(
      { error: "Order confirmation failed" },
      { status: 500 }
    );
  }
}

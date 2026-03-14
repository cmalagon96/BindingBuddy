import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getPayload } from "payload";
import config from "@payload-config";
import { confirmOrder } from "@/lib/orders/create-order";
import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { deductStock } from "@/lib/inventory/deduct-stock";
import type { Order } from "@/lib/orders/types";
import type { StockItem } from "@/lib/inventory/types";

// ---------------------------------------------------------------------------
// Stripe Webhook Handler (CRIT-4)
//
// Handles payment_intent.succeeded and payment_intent.payment_failed events.
// - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
// - Idempotent: checks order status before processing
// - Returns 200 quickly; processing is synchronous but lightweight
// ---------------------------------------------------------------------------

/** Payload order document shape for DB queries. */
interface PayloadOrderDoc {
  id: string | number;
  customerEmail: string;
  items: unknown;
  total: number;
  shippingAddress: unknown;
  paymentMethod: string;
  paymentId: string;
  storeRef?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  // Read the raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const paymentId = paymentIntent.id;

  try {
    const payload = await getPayload({ config });

    // Find the order by paymentId
    const result = await payload.find({
      collection: "orders",
      overrideAccess: true,
      where: { paymentId: { equals: paymentId } },
      limit: 1,
    });

    if (!result.docs || result.docs.length === 0) {
      console.warn(
        `[stripe-webhook] No order found for paymentIntent ${paymentId}`
      );
      return;
    }

    const orderDoc = result.docs[0] as unknown as PayloadOrderDoc;

    // Idempotency: skip if already confirmed or beyond
    if (orderDoc.status !== "pending") {
      console.info(
        `[stripe-webhook] Order ${orderDoc.id} already ${orderDoc.status}, skipping`
      );
      return;
    }

    // 1. Confirm the order
    const confirmedOrder = await confirmOrder(String(orderDoc.id));

    // 2. Deduct stock
    const items = orderDoc.items as Array<{
      productId: string;
      quantity: number;
      variant?: string;
    }>;
    const stockItems: StockItem[] = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantLabel: item.variant,
    }));
    await deductStock(stockItems);

    // 3. Send confirmation email (best-effort — don't fail the webhook)
    try {
      await sendOrderConfirmation(confirmedOrder as Order);
    } catch (emailErr) {
      console.error(
        `[stripe-webhook] Email failed for order ${orderDoc.id}:`,
        emailErr
      );
    }

    console.info(
      `[stripe-webhook] Order ${orderDoc.id} confirmed for payment ${paymentId}`
    );
  } catch (err) {
    console.error(
      `[stripe-webhook] Error processing payment_intent.succeeded for ${paymentId}:`,
      err
    );
    // Don't throw — return 200 so Stripe doesn't retry endlessly.
    // The order will be in "pending" state and can be manually reconciled.
  }
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const paymentId = paymentIntent.id;

  try {
    const payload = await getPayload({ config });

    const result = await payload.find({
      collection: "orders",
      overrideAccess: true,
      where: { paymentId: { equals: paymentId } },
      limit: 1,
    });

    if (!result.docs || result.docs.length === 0) {
      console.warn(
        `[stripe-webhook] No order found for failed paymentIntent ${paymentId}`
      );
      return;
    }

    const orderDoc = result.docs[0] as unknown as PayloadOrderDoc;

    // Only update if still pending
    if (orderDoc.status !== "pending") {
      console.info(
        `[stripe-webhook] Order ${orderDoc.id} already ${orderDoc.status}, skipping failure update`
      );
      return;
    }

    await payload.update({
      collection: "orders",
      overrideAccess: true,
      id: String(orderDoc.id),
      data: { status: "cancelled" },
    });

    console.info(
      `[stripe-webhook] Order ${orderDoc.id} marked cancelled for failed payment ${paymentId}`
    );
  } catch (err) {
    console.error(
      `[stripe-webhook] Error processing payment_intent.payment_failed for ${paymentId}:`,
      err
    );
  }
}

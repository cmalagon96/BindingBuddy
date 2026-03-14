import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { confirmOrder } from "@/lib/orders/create-order";
import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { deductStock } from "@/lib/inventory/deduct-stock";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const body = await req.json();
    const { paymentIntentId } = body as { paymentIntentId?: string };

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "Missing paymentIntentId" },
        { status: 400 }
      );
    }

    // Verify the PaymentIntent actually succeeded
    const stripe = getStripe();
    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not succeeded (status: ${paymentIntent.status})` },
        { status: 400 }
      );
    }

    // Confirm the order in DB
    const order = await confirmOrder(orderId);

    // Send confirmation email — fire and forget, don't block UX
    sendOrderConfirmation(order).catch((err) => {
      console.error("[orders/confirm] Failed to send confirmation email:", err);
    });

    // Deduct stock — fire and forget
    deductStock(
      order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        variantLabel: i.variant,
      }))
    ).catch((err) => {
      console.error("[orders/confirm] Failed to deduct stock:", err);
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

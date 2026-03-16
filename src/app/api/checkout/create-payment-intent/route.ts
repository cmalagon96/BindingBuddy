import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import {
  validateAndPriceCartItems,
  calculateTotal,
} from "@/lib/checkout-validation";
import { validateStock } from "@/lib/inventory/validate-stock";
import { stores } from "@/lib/stores";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // P1: Server-side price verification — prices come from DB, not client
    const items = await validateAndPriceCartItems(body.items);

    // P8: Validate stock BEFORE creating the PaymentIntent
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

    const total = calculateTotal(items);

    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("store_ref")?.value || "organic";
    // P21: Validate cookie-sourced storeRef against allowlist too
    const storeRef =
      body.storeRef && stores[body.storeRef]
        ? body.storeRef
        : stores[cookieRef]
          ? cookieRef
          : "organic";

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { store_ref: storeRef },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[create-payment-intent] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 400 }
    );
  }
}

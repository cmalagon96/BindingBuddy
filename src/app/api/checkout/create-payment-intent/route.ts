import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import {
  validateAndPriceCartItems,
  calculateTotal,
} from "@/lib/checkout-validation";
import { validateStock } from "@/lib/inventory/validate-stock";
import { stores } from "@/lib/stores";
import { checkoutLimiter } from "@/lib/rate-limit";

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

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { store_ref: storeRef },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    // Surface stock/validation errors to the client instead of generic message
    if (
      message.includes("out of stock") ||
      message.includes("Cart is empty") ||
      message.includes("Too many items") ||
      message.includes("Product not found")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[create-payment-intent] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

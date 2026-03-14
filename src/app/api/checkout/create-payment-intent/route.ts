import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { validateCartItems, calculateTotal } from "@/lib/checkout-validation";
import { stores } from "@/lib/stores";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = validateCartItems(body.items);
    const total = calculateTotal(items);

    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("store_ref")?.value || "organic";
    // Body storeRef (from fallback picker) takes priority if valid
    const storeRef =
      body.storeRef && stores[body.storeRef] ? body.storeRef : cookieRef;

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { store_ref: storeRef },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    // HIGH-11: Log full error, return generic message
    console.error("[create-payment-intent] Unhandled error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 400 }
    );
  }
}

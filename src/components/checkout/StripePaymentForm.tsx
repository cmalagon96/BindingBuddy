"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/format-price";
import Button from "@/components/ui/Button";
import type { CartItem } from "@/lib/cart-store";
import type { ShippingAddress } from "@/lib/shipping/validation";

interface StripePaymentFormProps {
  totalPrice: number;
  items: CartItem[];
  customerEmail?: string;
  shippingAddress?: ShippingAddress;
  onSuccess: () => void;
}

export default function StripePaymentForm({
  totalPrice,
  items,
  customerEmail,
  shippingAddress,
  onSuccess,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/checkout?success=true`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setLoading(false);
      return;
    }

    if (
      result.paymentIntent?.status === "succeeded" ||
      result.paymentIntent?.status === "processing"
    ) {
      // Create the order on the server now that payment succeeded
      try {
        const res = await fetch("/api/checkout/stripe/confirm-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: result.paymentIntent.id,
            items: items.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
            totalCents: totalPrice,
            customerEmail,
            shippingAddress,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(
            data.error ||
              `Payment processed but order creation failed. Reference: ${result.paymentIntent.id}`
          );
          setLoading(false);
          return;
        }

        onSuccess();
      } catch {
        setError(
          `Payment was processed but we couldn't confirm your order. Reference: ${result.paymentIntent.id}. Please contact support.`
        );
        setLoading(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mt-4">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || loading}
        variant="primary"
        className="w-full justify-center py-4 mt-6"
      >
        {loading ? "Processing..." : `Pay ${formatPrice(totalPrice)}`}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import type { CartItem } from "@/lib/cart-store";
import type { ShippingAddress } from "@/lib/shipping/validation";

interface PayPalPaymentFormProps {
  items: CartItem[];
  customerEmail?: string;
  shippingAddress?: ShippingAddress;
  onSuccess: () => void;
  storeRef?: string | null;
}

export default function PayPalPaymentForm({
  items,
  customerEmail,
  shippingAddress,
  onSuccess,
  storeRef,
}: PayPalPaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
        PayPal is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID.
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="bg-poke-card border border-poke-border rounded-xl p-4">
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            height: 48,
          }}
          createOrder={async () => {
            setError(null);
            const res = await fetch("/api/checkout/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: items.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                  image: i.image,
                })),
                customerEmail,
                shippingAddress,
                ...(storeRef ? { storeRef } : {}),
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create order");
            return data.orderId;
          }}
          onApprove={async (data) => {
            setError(null);
            const res = await fetch("/api/checkout/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });

            const result = await res.json();
            if (!res.ok)
              throw new Error(result.error || "Failed to capture payment");

            onSuccess();
          }}
          onError={(err) => {
            setError(
              err instanceof Error ? err.message : "PayPal payment failed"
            );
          }}
          onCancel={() => {
            // User closed PayPal popup — no action needed
          }}
        />
      </div>
    </>
  );
}

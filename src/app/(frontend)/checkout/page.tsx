"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { useCartStore, useTotalItems, useTotalPrice } from "@/lib/cart-store";
import { getStripeClient } from "@/lib/stripe-client";
import Button from "@/components/ui/Button";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentMethodSelector, {
  type PaymentMethod,
} from "@/components/checkout/PaymentMethodSelector";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";
import PayPalPaymentForm from "@/components/checkout/PayPalPaymentForm";
import StoreReferralPicker from "@/components/checkout/StoreReferralPicker";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="h-8 w-48 bg-poke-card rounded-xl animate-pulse mx-auto" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalItems = useTotalItems();
  const totalPrice = useTotalPrice();
  const searchParams = useSearchParams();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [manualStoreRef, setManualStoreRef] = useState<string | null>(null);

  // HIGH-7: guard flag prevents a second intent from being created when
  // manualStoreRef changes after the first intent is already in flight.
  const intentCreating = useRef(false);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  // Handle redirect-based success (3DS, etc.)
  useEffect(() => {
    if (success) {
      clearCart();
    }
  }, [success, clearCart]);

  // HIGH-7: Create PaymentIntent exactly once when cart has items.
  // manualStoreRef is intentionally excluded from deps — a store selection
  // after the intent is created must not trigger a second intent. The
  // cookie-based storeRef is read server-side; manualStoreRef is forwarded
  // to PayPal via the storeRef prop at confirmation time.
  useEffect(() => {
    if (items.length === 0 || success || canceled) return;
    if (clientSecret || intentCreating.current) return;

    intentCreating.current = true;
    let cancelled = false;

    async function createIntent() {
      try {
        const res = await fetch("/api/checkout/create-payment-intent", {
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
          }),
        });

        const data = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setIntentError(data.error || "Failed to initialize payment");
          } else {
            setClientSecret(data.clientSecret);
          }
        }
      } catch {
        if (!cancelled) {
          setIntentError("Failed to connect to payment server");
        }
      } finally {
        if (!cancelled) {
          intentCreating.current = false;
        }
      }
    }

    createIntent();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, success, canceled]);

  const handlePaymentSuccess = useCallback(() => {
    clearCart();
    setPaid(true);
  }, [clearCart]);

  // Thank-you screen (redirect-based or inline success)
  if (success || paid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-poke-text mb-3">
          Thank You!
        </h1>
        <p className="text-poke-muted mb-8">
          Your order has been placed. We&apos;ll start engraving right away.
          Check your email for a confirmation.
        </p>
        <Button href="/" variant="primary">
          Back to Shop
        </Button>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-poke-text mb-3">
          Checkout Canceled
        </h1>
        <p className="text-poke-muted mb-8">
          Your order was not completed. Your cart items are still saved.
        </p>
        <Button href="/cart" variant="primary">
          Return to Cart
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-poke-text mb-4">
          Nothing to checkout
        </h1>
        <Button href="/" variant="primary">
          Go to Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-poke-text mb-10">
        Checkout
      </h1>

      <div className="space-y-6">
        <OrderSummary
          items={items}
          totalItems={totalItems}
          totalPrice={totalPrice}
        />

        <StoreReferralPicker onStoreSelected={setManualStoreRef} />

        <PaymentMethodSelector
          selected={paymentMethod}
          onChange={setPaymentMethod}
        />

        {intentError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {intentError}
          </div>
        )}

        {paymentMethod === "card" && (
          <div className="bg-poke-card border border-poke-border rounded-2xl p-6">
            {clientSecret ? (
              <Elements
                stripe={getStripeClient()}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#3B6B9E",
                      colorBackground: "#1A1D27",
                      colorText: "#F0F0F8",
                      fontFamily: "DM Sans, sans-serif",
                      borderRadius: "12px",
                    },
                    rules: {
                      ".Input": { border: "1px solid #2A2D3A" },
                      ".Input:focus": {
                        border: "1px solid rgba(59,107,158,0.5)",
                      },
                    },
                  },
                }}
              >
                <StripePaymentForm
                  totalPrice={totalPrice}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-2 border-poke-blue border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-poke-muted text-sm">
                  Loading payment form...
                </span>
              </div>
            )}
          </div>
        )}

        {paymentMethod === "paypal" && (
          <PayPalPaymentForm
            items={items}
            onSuccess={handlePaymentSuccess}
            storeRef={manualStoreRef}
          />
        )}

        <Link
          href="/cart"
          className="block text-center text-poke-muted hover:text-poke-text text-sm transition-colors"
        >
          &larr; Edit Cart
        </Link>
      </div>
    </div>
  );
}

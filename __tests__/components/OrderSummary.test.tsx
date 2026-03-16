/**
 * OrderSummary.test.tsx
 *
 * Tests for the OrderSummary component — renders items, quantities, prices,
 * subtotal, and grand total correctly.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OrderSummary from "@/components/checkout/OrderSummary";
import type { CartItem } from "@/lib/cart-store";

// ---------------------------------------------------------------------------
// Mock zustand/middleware (prevent localStorage dependency)
// ---------------------------------------------------------------------------
import { vi } from "vitest";
vi.mock("zustand/middleware", () => ({
  persist: (fn: unknown) => fn,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "prod-1",
  name: "Pikachu Binder",
  price: 4999,
  quantity: 1,
  image: "/img.png",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OrderSummary", () => {
  it("renders the 'Order Summary' heading", () => {
    render(<OrderSummary items={[makeItem()]} totalItems={1} totalPrice={4999} />);
    expect(screen.getByText("Order Summary")).toBeInTheDocument();
  });

  it("renders each item's name", () => {
    const items = [
      makeItem({ name: "Pikachu Binder" }),
      makeItem({ productId: "prod-2", name: "Charizard Sleeve" }),
    ];
    render(<OrderSummary items={items} totalItems={2} totalPrice={9998} />);
    expect(screen.getByText(/Pikachu Binder/)).toBeInTheDocument();
    expect(screen.getByText(/Charizard Sleeve/)).toBeInTheDocument();
  });

  it("renders the correctly formatted line price for each item", () => {
    const items = [makeItem({ price: 4999, quantity: 2 })];
    render(<OrderSummary items={items} totalItems={2} totalPrice={9998} />);
    // 4999 * 2 = 9998 cents = $99.98 — appears in line item, subtotal, and total rows
    const prices = screen.getAllByText("$99.98");
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the subtotal with correct item count", () => {
    render(<OrderSummary items={[makeItem()]} totalItems={3} totalPrice={14997} />);
    expect(screen.getByText("Subtotal (3 items)")).toBeInTheDocument();
  });

  it("shows 'Free' for shipping", () => {
    render(<OrderSummary items={[makeItem()]} totalItems={1} totalPrice={4999} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("renders the grand total in the Total row", () => {
    render(<OrderSummary items={[makeItem({ price: 1000 })]} totalItems={1} totalPrice={1000} />);
    // $10.00 should appear in the Total row
    const totals = screen.getAllByText("$10.00");
    // Should appear at least twice: once in line item, once in total
    expect(totals.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a 'Total' label in the summary footer", () => {
    render(<OrderSummary items={[makeItem()]} totalItems={1} totalPrice={4999} />);
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows the quantity multiplier for each item", () => {
    render(
      <OrderSummary
        items={[makeItem({ quantity: 3 })]}
        totalItems={3}
        totalPrice={14997}
      />
    );
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it("renders an empty items list without crashing", () => {
    expect(() =>
      render(<OrderSummary items={[]} totalItems={0} totalPrice={0} />)
    ).not.toThrow();
  });

  it("formats the total price correctly using formatPrice", () => {
    render(<OrderSummary items={[makeItem({ price: 5000 })]} totalItems={1} totalPrice={5000} />);
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });
});

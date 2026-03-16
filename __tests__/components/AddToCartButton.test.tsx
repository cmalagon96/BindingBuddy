/**
 * AddToCartButton.test.tsx
 *
 * Tests for the AddToCartButton component:
 *   - Default and compact render modes
 *   - Clicking calls addItem with the correct payload
 *   - Visual feedback: button shows "Added" / "Added to Cart!" after click
 *   - Reverts to original label after 1.5 seconds
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Product } from "@/types/product";

// ---------------------------------------------------------------------------
// Mock Zustand store
// ---------------------------------------------------------------------------

const mockAddItem = vi.fn();

vi.mock("@/lib/cart-store", () => ({
  useCartStore: (selector: (state: { addItem: typeof mockAddItem }) => unknown) =>
    selector({ addItem: mockAddItem }),
}));

// ---------------------------------------------------------------------------
// Mock Zustand persist middleware (safe guard)
// ---------------------------------------------------------------------------

vi.mock("zustand/middleware", () => ({
  persist: (fn: unknown) => fn,
}));

import AddToCartButton from "@/components/products/AddToCartButton";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const product: Product = {
  id: "prod-001",
  slug: "charizard-binder",
  name: "Charizard Binder",
  description: "Fire type binder.",
  price: 5999,
  image: "/images/charizard.jpg",
  category: "engraved-binder",
  featured: false,
  stock: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Full-size button (default)
// ---------------------------------------------------------------------------

describe("AddToCartButton — default (full size)", () => {
  it("renders the 'Add to Cart' label by default", () => {
    render(<AddToCartButton product={product} />);
    expect(screen.getByText("Add to Cart")).toBeInTheDocument();
  });

  it("calls addItem with the correct product payload when clicked", () => {
    render(<AddToCartButton product={product} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockAddItem).toHaveBeenCalledWith({
      productId: "prod-001",
      name: "Charizard Binder",
      price: 5999,
      image: "/images/charizard.jpg",
      quantity: 1,
    });
  });

  it("shows 'Added to Cart!' immediately after clicking", () => {
    render(<AddToCartButton product={product} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Added to Cart!")).toBeInTheDocument();
  });

  it("reverts to 'Add to Cart' after 1.5 seconds", async () => {
    render(<AddToCartButton product={product} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Added to Cart!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Add to Cart")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Compact button
// ---------------------------------------------------------------------------

describe("AddToCartButton — compact mode", () => {
  it("renders the 'Add' label in compact mode", () => {
    render(<AddToCartButton product={product} compact />);
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("shows 'Added' immediately after clicking in compact mode", () => {
    render(<AddToCartButton product={product} compact />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Added")).toBeInTheDocument();
  });

  it("calls addItem once per click in compact mode", () => {
    render(<AddToCartButton product={product} compact />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockAddItem).toHaveBeenCalledOnce();
  });

  it("reverts to 'Add' after 1.5 seconds in compact mode", async () => {
    render(<AddToCartButton product={product} compact />);
    fireEvent.click(screen.getByRole("button"));

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Add")).toBeInTheDocument();
  });
});

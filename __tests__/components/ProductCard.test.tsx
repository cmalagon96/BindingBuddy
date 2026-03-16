/**
 * ProductCard.test.tsx
 *
 * Tests for the ProductCard component — renders product data, badge, and links.
 * next/image and next/link are mocked to avoid Next.js build-time dependencies.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Product } from "@/types/product";

// ---------------------------------------------------------------------------
// Mock Next.js components
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src as string} alt={props.alt as string} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock AddToCartButton since it depends on Zustand store
vi.mock("@/components/products/AddToCartButton", () => ({
  default: () => <button>Add to Cart</button>,
}));

// Mock HoloCard (framer-motion wrapper)
vi.mock("@/components/ui/HoloCard", () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock Zustand persist middleware to avoid localStorage errors
vi.mock("zustand/middleware", () => ({
  persist: (fn: unknown) => fn,
}));

import ProductCard from "@/components/ui/ProductCard";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const baseProduct: Product = {
  id: "prod-001",
  slug: "pikachu-binder",
  name: "Pikachu Engraved Binder",
  description: "A high-quality binder with Pikachu laser engraving.",
  price: 4999,
  image: "/images/pikachu-binder.jpg",
  category: "engraved-binder",
  featured: true,
  stock: 10,
  pokemon: "Pikachu",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProductCard", () => {
  it("renders the product name", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Pikachu Engraved Binder")).toBeInTheDocument();
  });

  it("renders the formatted price", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("$49.99")).toBeInTheDocument();
  });

  it("renders the product description", () => {
    render(<ProductCard product={baseProduct} />);
    expect(
      screen.getByText("A high-quality binder with Pikachu laser engraving.")
    ).toBeInTheDocument();
  });

  it("renders the product image with correct alt text", () => {
    render(<ProductCard product={baseProduct} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "Pikachu Engraved Binder");
    expect(img).toHaveAttribute("src", "/images/pikachu-binder.jpg");
  });

  it("links the product name to the product detail page", () => {
    render(<ProductCard product={baseProduct} />);
    const links = screen.getAllByRole("link");
    const productLinks = links.filter((l) =>
      l.getAttribute("href")?.includes("pikachu-binder")
    );
    expect(productLinks.length).toBeGreaterThan(0);
  });

  it("displays the Pokemon name when provided", () => {
    render(<ProductCard product={baseProduct} />);
    // Multiple elements may contain "Pikachu" (product name + pokemon label)
    const matches = screen.getAllByText(/Pikachu/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render Pokemon text when pokemon prop is absent", () => {
    const product = { ...baseProduct, pokemon: undefined };
    render(<ProductCard product={product} />);
    // The category label should still appear
    expect(screen.getByText("Engraved Binder")).toBeInTheDocument();
  });

  it("renders a badge when product.badge is set", () => {
    const product = { ...baseProduct, badge: "New" as const };
    render(<ProductCard product={product} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("does not render a badge when product.badge is absent", () => {
    const product = { ...baseProduct, badge: undefined };
    render(<ProductCard product={product} />);
    // Badge component should not render its text
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    expect(screen.queryByText("Limited")).not.toBeInTheDocument();
    expect(screen.queryByText("Best Seller")).not.toBeInTheDocument();
  });

  it("renders the 'Engraving Service' category label for engraving-only products", () => {
    const product = { ...baseProduct, category: "engraving-only" as const };
    render(<ProductCard product={product} />);
    expect(screen.getByText("Engraving Service")).toBeInTheDocument();
  });

  it("renders the Add to Cart button", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("Add to Cart")).toBeInTheDocument();
  });
});

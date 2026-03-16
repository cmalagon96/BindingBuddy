/**
 * Badge.test.tsx
 *
 * Tests for the Badge UI component — renders with known variants and falls back
 * gracefully for unknown labels.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders the label text", () => {
    render(<Badge label="New" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders a 'Best Seller' badge", () => {
    render(<Badge label="Best Seller" />);
    expect(screen.getByText("Best Seller")).toBeInTheDocument();
  });

  it("renders a 'Limited' badge", () => {
    render(<Badge label="Limited" />);
    expect(screen.getByText("Limited")).toBeInTheDocument();
  });

  it("renders an unknown label with the fallback muted color class", () => {
    const { container } = render(<Badge label="Custom Label" />);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    // Unknown labels get the muted fallback — just confirm the element renders
    expect(span?.textContent).toBe("Custom Label");
  });

  it("applies a custom className alongside the default styling", () => {
    const { container } = render(<Badge label="New" className="my-custom-class" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("my-custom-class");
  });

  it("uses the 'New' blue color class for the New badge", () => {
    const { container } = render(<Badge label="New" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("poke-blue");
  });

  it("uses the red color class for the Limited badge", () => {
    const { container } = render(<Badge label="Limited" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("red-500");
  });

  it("uses the gold color class for the Best Seller badge", () => {
    const { container } = render(<Badge label="Best Seller" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("poke-gold");
  });

  it("renders as an inline-block element", () => {
    const { container } = render(<Badge label="New" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("inline-block");
  });
});

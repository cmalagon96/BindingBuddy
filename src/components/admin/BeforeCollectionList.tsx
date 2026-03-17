"use client";

import { usePathname } from "next/navigation";

// ── Collection metadata by slug ───────────────────────────────────────────────

const COLLECTION_META: Record<
  string,
  { icon: string; label: string; sub: string; accent: string }
> = {
  products: {
    icon: "▦",
    label: "Products",
    sub: "Catalog — laser-engraved binder covers",
    accent: "#f59e0b",
  },
  orders: {
    icon: "◈",
    label: "Orders",
    sub: "Customer orders & fulfillment",
    accent: "#5A8DBD",
  },
  media: {
    icon: "⬡",
    label: "Media",
    sub: "Uploaded images & files",
    accent: "#6366f1",
  },
  users: {
    icon: "◉",
    label: "Users",
    sub: "Admin accounts & access",
    accent: "#22c55e",
  },
};

function deriveSlug(pathname: string): string {
  // /admin/collections/products → "products"
  const match = pathname.match(/\/admin\/collections\/([^/]+)/);
  return match?.[1] ?? "";
}

export default function BeforeCollectionList() {
  const pathname = usePathname() ?? "";
  const slug = deriveSlug(pathname);
  const meta = COLLECTION_META[slug];

  if (!meta) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1.5rem 1.75rem 1.25rem",
        borderBottom: "1px solid #1E2130",
        background: "#0A0C12",
        flexWrap: "wrap" as const,
        // Hairline crimson top-edge accent
        borderTop: "1px solid transparent",
        position: "relative" as const,
      }}
    >
      {/* Hairline crimson top-edge accent (matches app-header) */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute" as const,
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(230,57,70,0.18) 25%, rgba(230,57,70,0.18) 75%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Left: icon badge + title block — aligned to bottom of text column */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
        {/* Accent icon badge — sits flush with the h1 baseline */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: `${meta.accent}14`,
            border: `1px solid ${meta.accent}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "17px",
            color: meta.accent,
            marginBottom: "1px",
          }}
        >
          {meta.icon}
        </div>

        <div>
          {/* Eyebrow label */}
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#E63946",
              marginBottom: "3px",
              lineHeight: 1,
            }}
          >
            Binding Buddy
          </div>
          {/* Collection name */}
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(22px, 3vw, 32px)",
              lineHeight: 1,
              color: "#F0F0F8",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {meta.label.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Right: subtitle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          paddingBottom: "4px",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "#4A4E63",
            letterSpacing: "0.01em",
          }}
        >
          {meta.sub}
        </span>
      </div>
    </div>
  );
}

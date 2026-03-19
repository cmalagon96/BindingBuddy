"use client";

import { useEffect, useState } from "react";
import { stores } from "@/lib/stores";

interface StoreReferralPickerProps {
  onStoreSelected: (slug: string | null) => void;
}

export default function StoreReferralPicker({
  onStoreSelected,
}: StoreReferralPickerProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if store_ref cookie already exists
  useEffect(() => {
    async function checkRef() {
      try {
        const res = await fetch("/api/stores/check-ref");
        const data = await res.json();
        if (!data.hasRef) {
          setVisible(true);
        }
      } catch {
        // If check fails, don't show picker
      }
    }
    checkRef();
  }, []);

  if (!visible) return null;

  async function handleSelect(slug: string) {
    if (!slug) {
      onStoreSelected(null);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/stores/set-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        onStoreSelected(slug);
      }
    } catch {
      // Silently fail — cookie not critical for checkout
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-poke-card border border-poke-border rounded-2xl px-5 py-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-poke-muted text-sm">
          Were you referred by a partner store?
        </span>
        <svg
          className={`w-4 h-4 text-poke-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3">
          <select
            onChange={(e) => handleSelect(e.target.value)}
            disabled={saving}
            defaultValue=""
            className="w-full bg-poke-dark border border-poke-border rounded-xl px-4 py-2.5 text-sm text-poke-text focus:outline-none focus:border-poke-blue/50 transition-colors"
          >
            <option value="">None</option>
            {Object.entries(stores).map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

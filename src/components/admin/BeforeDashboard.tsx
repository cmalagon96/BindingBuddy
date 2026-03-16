"use client";

import { useState, useEffect } from "react";
import TOTPSetup from "./TOTPSetup";

export default function BeforeDashboard() {
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/admin/totp/status");
        if (res.ok) {
          const data = await res.json();
          setTotpEnabled(data.totpEnabled);
        }
      } catch {
        // ignore — 2FA status is non-critical
      }
    }
    checkStatus();
  }, []);

  if (showSetup) {
    return <TOTPSetup initialEnabled={totpEnabled ?? false} />;
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* ── Trainer HQ Header ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: totpEnabled === false ? "1rem" : "0",
          flexWrap: "wrap" as const,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              color: "#E63946",
              marginBottom: "4px",
            }}
          >
            Binding Buddy
          </div>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1,
              color: "#F0F0F8",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            TRAINER HQ
          </h1>
        </div>

        {/* Live indicator */}
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
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
              boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              animation: "bb-hq-pulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#22c55e",
            }}
          >
            Store Live
          </span>
          <style>{`
            @keyframes bb-hq-pulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.5; }
            }
          `}</style>
        </div>
      </div>

      {/* ── 2FA Banner (only shown when disabled or unknown) ──────── */}
      {totpEnabled === false && (
        <div
          style={{
            background: "rgba(230,57,70,0.05)",
            border: "1px solid rgba(230,57,70,0.2)",
            borderLeft: "3px solid #E63946",
            borderRadius: "6px",
            padding: "0.75rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap" as const,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#E63946",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "#C8CAD8",
              }}
            >
              Two-Factor Authentication is{" "}
              <span style={{ color: "#E63946", fontWeight: 600 }}>disabled</span>
              {" "}— secure your admin account.
            </span>
          </div>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              background: "#E63946",
              color: "#fff",
              border: "2px solid #E63946",
              borderRadius: "4px",
              padding: "6px 14px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "2px 2px 0 rgba(230,57,70,0.3)",
              whiteSpace: "nowrap" as const,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "#C62D38";
              el.style.borderColor = "#C62D38";
              el.style.transform = "translate(-1px,-1px)";
              el.style.boxShadow = "3px 3px 0 rgba(230,57,70,0.3)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "#E63946";
              el.style.borderColor = "#E63946";
              el.style.transform = "none";
              el.style.boxShadow = "2px 2px 0 rgba(230,57,70,0.3)";
            }}
          >
            Enable 2FA
          </button>
        </div>
      )}

      {/* ── 2FA Banner (enabled state — subtle, doesn't demand attention) ─ */}
      {totpEnabled === true && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.5rem 0",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "#8B8FA8",
            }}
          >
            Two-Factor Authentication:{" "}
            <span style={{ color: "#22c55e", fontWeight: 600 }}>Enabled</span>
          </span>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#8B8FA8",
              background: "none",
              border: "none",
              padding: "0 4px",
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationStyle: "dotted" as const,
            }}
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
}

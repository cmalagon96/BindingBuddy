"use client";

import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@payloadcms/ui";

type Status = "loading" | "needs-verify" | "verified";

export default function TOTPProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      // No authenticated user — Payload's own auth guard will redirect to login.
      // Reset to "verified" so the children are rendered if auth resolves later,
      // but do nothing else here (avoids noise before auth state is ready).
      setStatus("verified");
      return;
    }

    // User is logged in — check TOTP status
    setStatus("loading");
    setCode("");
    setError("");

    async function checkStatus() {
      try {
        const res = await fetch("/api/admin/totp/status");
        if (!res.ok) {
          setStatus("verified");
          return;
        }
        const data = await res.json();
        if (data.totpEnabled && !data.totpVerified) {
          setStatus("needs-verify");
        } else {
          setStatus("verified");
        }
      } catch {
        setStatus("verified");
      }
    }
    checkStatus();
  }, [user?.id]);

  useEffect(() => {
    if (status === "needs-verify" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || code.length !== 6) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code, action: "verify" }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setStatus("verified");
      } else {
        setError(data.error || "Invalid code. Please try again.");
        setCode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div style={styles.overlay}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (status === "needs-verify") {
    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E63946"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <h2 style={styles.heading}>Two-Factor Authentication</h2>
          <p style={styles.subtitle}>
            Enter the 6-digit code from your authenticator app to continue.
          </p>

          <form onSubmit={handleVerify}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(val);
              }}
              placeholder="000000"
              style={styles.input}
            />

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              style={{
                ...styles.button,
                opacity: submitting || code.length !== 6 ? 0.5 : 1,
                cursor:
                  submitting || code.length !== 6 ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0F1117",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #2A2D3A",
    borderTopColor: "#E63946",
    borderRadius: "50%",
    animation: "totp-spin 0.8s linear infinite",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#1A1D27",
    border: "1px solid #2A2D3A",
    borderRadius: 12,
    padding: "2.5rem",
    textAlign: "center" as const,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  iconWrap: {
    marginBottom: "1.25rem",
  },
  heading: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "1.5rem",
    color: "#F0F0F8",
    margin: "0 0 0.5rem",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#8B8FA8",
    fontSize: "0.875rem",
    lineHeight: 1.5,
    margin: "0 0 1.5rem",
  },
  input: {
    width: "100%",
    height: 48,
    background: "#0F1117",
    border: "1px solid #2A2D3A",
    borderRadius: 8,
    padding: "0 1rem",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "1.25rem",
    letterSpacing: "0.5em",
    textAlign: "center" as const,
    color: "#F0F0F8",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  error: {
    color: "#E63946",
    fontSize: "0.8125rem",
    margin: "0.75rem 0 0",
  },
  button: {
    width: "100%",
    height: 46,
    marginTop: "1.25rem",
    background: "#E63946",
    color: "#FFFFFF",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "0.9375rem",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    border: "none",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(230,57,70,0.15)",
  },
};

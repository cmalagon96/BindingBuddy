import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared in-memory rate limiter
// Keys by userId (authenticated) or falls back to IP.
// MED-3: Prefer userId over IP — user IDs can't be spoofed.
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 5;

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
}

interface RateLimitConfig {
  windowMs?: number;
  maxAttempts?: number;
}

// Separate stores per namespace so different features don't collide
const stores = new Map<string, Map<string, RateLimitRecord>>();

function getStore(namespace: string): Map<string, RateLimitRecord> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

/**
 * Build a rate-limit key. Prefers userId (not spoofable) over IP.
 * Falls back to X-Forwarded-For / X-Real-IP only for unauthenticated routes.
 */
export function getRateLimitKey(
  req: NextRequest,
  userId?: string | null
): string {
  if (userId) return `user:${userId}`;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check if a key is currently rate-limited.
 */
export function isRateLimited(
  key: string,
  namespace: string,
  config?: RateLimitConfig
): boolean {
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = config?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const store = getStore(namespace);

  const record = store.get(key);
  if (!record) return false;

  if (Date.now() - record.firstAttempt > windowMs) {
    store.delete(key);
    return false;
  }

  return record.count >= maxAttempts;
}

/**
 * Record a failed attempt against a key.
 */
export function recordFailedAttempt(
  key: string,
  namespace: string,
  config?: RateLimitConfig
): void {
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const store = getStore(namespace);

  const record = store.get(key);
  if (!record || Date.now() - record.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: Date.now() });
  } else {
    record.count++;
  }
}

/**
 * Clear all failed attempts for a key (e.g. on successful auth).
 */
export function clearFailedAttempts(
  key: string,
  namespace: string
): void {
  getStore(namespace).delete(key);
}

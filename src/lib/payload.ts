import { getPayload, type Payload } from "payload";
import config from "@payload-config";

let cached: Payload | null = null;

/**
 * Return a memoized Payload client instance.
 * Avoids re-initializing on every request in the same process.
 */
export async function getPayloadClient(): Promise<Payload> {
  if (!cached) {
    cached = await getPayload({ config });
  }
  return cached;
}

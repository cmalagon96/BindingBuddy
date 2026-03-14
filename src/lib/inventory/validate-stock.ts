import { getPayload } from "payload";
import config from "@payload-config";
import type { StockItem, StockValidationResult, UnavailableItem } from "./types";

interface ProductVariantDoc {
  label: string;
  stock?: number;
}

interface ProductDoc {
  id: string | number;
  name: string;
  stock?: number;
  inStock?: boolean;
  variants?: ProductVariantDoc[];
}

/**
 * Validate that all requested items have sufficient stock.
 *
 * Rules:
 * - stock === -1 → unlimited; always passes
 * - stock === undefined/null → treated as 0 (no stock)
 * - When variantLabel is provided, uses that variant's stock instead of top-level stock
 * - Concurrent requests are handled conservatively: we read the current committed
 *   stock value and compare against requested quantity. Actual atomic deduction
 *   happens in deductStock().
 */
export async function validateStock(
  items: StockItem[]
): Promise<StockValidationResult> {
  if (!items || items.length === 0) {
    return { valid: true, unavailableItems: [] };
  }

  const payload = await getPayload({ config });

  // Deduplicate product IDs for a single bulk fetch
  const productIds = [...new Set(items.map((item) => item.productId))];

  const result = await payload.find({
    collection: "products",
    where: { id: { in: productIds } },
    limit: productIds.length,
    depth: 0,
  });

  const productMap = new Map<string, ProductDoc>();
  for (const doc of result.docs) {
    const d = doc as unknown as ProductDoc;
    productMap.set(String(d.id), d);
  }

  const unavailableItems: UnavailableItem[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      // Product not found — treat as unavailable with 0 stock
      unavailableItems.push({
        productId: item.productId,
        name: "Unknown product",
        requested: item.quantity,
        available: 0,
      });
      continue;
    }

    // Determine which stock level to check
    let available: number;

    if (item.variantLabel) {
      const variant = product.variants?.find(
        (v) => v.label === item.variantLabel
      );

      if (!variant) {
        // Variant not found — treat as unavailable
        unavailableItems.push({
          productId: item.productId,
          name: `${product.name} (${item.variantLabel})`,
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      available = variant.stock ?? 0;
    } else {
      available = product.stock ?? 0;
    }

    // stock === -1 means unlimited — always passes
    if (available === -1) {
      continue;
    }

    if (item.quantity > available) {
      unavailableItems.push({
        productId: item.productId,
        name: item.variantLabel
          ? `${product.name} (${item.variantLabel})`
          : product.name,
        requested: item.quantity,
        available: Math.max(0, available),
      });
    }
  }

  return {
    valid: unavailableItems.length === 0,
    unavailableItems,
  };
}

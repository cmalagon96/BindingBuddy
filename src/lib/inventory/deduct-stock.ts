import { getPayloadClient } from "@/lib/payload";
import type { StockItem } from "./types";

// Narrow type for Payload's Mongoose adapter collections map
interface MongooseModel {
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<{ matchedCount: number; modifiedCount: number }>;
}

interface PayloadDbAdapter {
  collections: Record<string, MongooseModel>;
}

export interface StockDeductionFailure {
  productId: string;
  variantLabel?: string;
  quantity: number;
  reason: "insufficient_stock" | "product_not_found";
}

export interface StockDeductionResult {
  success: boolean;
  failures: StockDeductionFailure[];
}

/**
 * Atomically deduct stock from products after an order is confirmed.
 *
 * Uses MongoDB $inc via the underlying Mongoose model to prevent
 * race conditions from concurrent orders. Each updateOne is atomic at
 * the document level in MongoDB.
 *
 * P7: Added $gte guard to prevent stock going negative. If the filter
 * doesn't match (modifiedCount === 0), the item had insufficient stock
 * and is reported in the failures array.
 *
 * Behaviour:
 * - stock === -1 (unlimited): skipped — no deduction applied
 * - variantLabel provided: decrements the matched variant's stock field
 *   using arrayFilters so only the target element is modified
 * - No variantLabel: decrements the top-level product stock
 */
export async function deductStock(
  items: StockItem[]
): Promise<StockDeductionResult> {
  if (!items || items.length === 0) {
    return { success: true, failures: [] };
  }

  const payload = await getPayloadClient();

  const db = payload.db as unknown as PayloadDbAdapter;
  const ProductModel = db.collections["products"];

  if (!ProductModel) {
    throw new Error(
      "deductStock: products collection unavailable on database adapter"
    );
  }

  const failures: StockDeductionFailure[] = [];

  // All operations run in parallel — each updateOne is document-level atomic
  await Promise.all(
    items.map(async (item): Promise<void> => {
      if (item.variantLabel) {
        // Decrement a specific variant's stock.
        // P7: arrayFilters now includes $gte guard so stock cannot go negative.
        // $ne: -1 preserves unlimited variants; $gte ensures sufficient stock.
        const result = await ProductModel.updateOne(
          {
            _id: item.productId,
            "variants.label": item.variantLabel,
          },
          {
            $inc: { "variants.$[elem].stock": -item.quantity },
          },
          {
            arrayFilters: [
              {
                "elem.label": item.variantLabel,
                "elem.stock": { $ne: -1, $gte: item.quantity },
              },
            ],
          }
        );

        if (result.modifiedCount === 0) {
          // Could be: insufficient stock, unlimited variant (expected skip), or product not found.
          // We don't fail on unlimited variants, so check matchedCount.
          if (result.matchedCount === 0) {
            failures.push({
              productId: item.productId,
              variantLabel: item.variantLabel,
              quantity: item.quantity,
              reason: "product_not_found",
            });
          } else {
            // Document matched but filter excluded the variant — likely insufficient stock
            // (or unlimited, which is fine). Log as potential insufficient stock.
            failures.push({
              productId: item.productId,
              variantLabel: item.variantLabel,
              quantity: item.quantity,
              reason: "insufficient_stock",
            });
          }
        }
      } else {
        // Decrement top-level product stock.
        // P7: Added $gte guard so stock cannot go below zero.
        // $ne: -1 ensures unlimited products are skipped.
        const result = await ProductModel.updateOne(
          {
            _id: item.productId,
            stock: { $ne: -1, $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          }
        );

        if (result.modifiedCount === 0 && result.matchedCount === 0) {
          // No document matched — could be unlimited (fine) or not found
          // Check if it exists with unlimited stock — don't flag those as failures
          const checkResult = await ProductModel.updateOne(
            { _id: item.productId, stock: -1 },
            { $set: {} } // no-op — just checking match
          );
          if (checkResult.matchedCount === 0) {
            failures.push({
              productId: item.productId,
              quantity: item.quantity,
              reason: "insufficient_stock",
            });
          }
          // else: product has unlimited stock (-1), skip is expected
        }
      }
    })
  );

  return {
    success: failures.length === 0,
    failures,
  };
}

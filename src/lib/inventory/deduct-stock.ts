import { getPayload } from "payload";
import config from "@payload-config";
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

/**
 * Atomically deduct stock from products after an order is confirmed.
 *
 * Uses MongoDB $inc via the underlying Mongoose model to prevent
 * race conditions from concurrent orders. Each updateOne is atomic at
 * the document level in MongoDB.
 *
 * Behaviour:
 * - stock === -1 (unlimited): skipped — no deduction applied
 * - variantLabel provided: decrements the matched variant's stock field
 *   using arrayFilters so only the target element is modified
 * - No variantLabel: decrements the top-level product stock
 *
 * Items whose product no longer exists (matchedCount === 0) are silently
 * skipped — payment is already captured; inventory integrity is best-effort.
 */
export async function deductStock(items: StockItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  const payload = await getPayload({ config });

  const db = payload.db as unknown as PayloadDbAdapter;
  const ProductModel = db.collections["products"];

  if (!ProductModel) {
    throw new Error(
      "deductStock: products collection unavailable on database adapter"
    );
  }

  // All operations run in parallel — each updateOne is document-level atomic
  await Promise.all(
    items.map(async (item): Promise<void> => {
      if (item.variantLabel) {
        // Decrement a specific variant's stock.
        // arrayFilters targets only the variant with the matching label AND
        // a non-unlimited stock value, ensuring unlimited variants (-1) are
        // never touched.
        await ProductModel.updateOne(
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
                "elem.stock": { $ne: -1 }, // leave unlimited variants alone
              },
            ],
          }
        );
      } else {
        // Decrement top-level product stock.
        // The filter `stock: { $ne: -1 }` ensures unlimited products are skipped.
        await ProductModel.updateOne(
          {
            _id: item.productId,
            stock: { $ne: -1 },
          },
          {
            $inc: { stock: -item.quantity },
          }
        );
      }
    })
  );
}

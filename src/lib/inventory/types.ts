export interface UnavailableItem {
  productId: string;
  name: string;
  requested: number;
  available: number;
}

export interface StockValidationResult {
  valid: boolean;
  unavailableItems: UnavailableItem[];
}

/**
 * Represents one item as expected by the inventory functions.
 * productId is the Payload document ID.
 * variantLabel (optional) targets a specific variant's stock instead of
 * the top-level product stock.
 */
export interface StockItem {
  productId: string;
  quantity: number;
  /** If provided, stock is checked/deducted against this variant's stock field. */
  variantLabel?: string;
}

import { getPayloadClient } from "@/lib/payload";

/** Stripe minimum charge is $0.50 = 50 cents */
const STRIPE_MINIMUM_CENTS = 50;

export interface ValidatedCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

/** Shape-validate client-submitted cart items (no price trust). */
export function validateCartItems(items: unknown): ValidatedCartItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }

  if (items.length > 50) {
    throw new Error("Too many items in cart");
  }

  return items.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid item at index ${i}`);
    }

    const { productId, name, price, quantity, image, variant } = item as Record<
      string,
      unknown
    >;

    if (typeof productId !== "string" || !productId) {
      throw new Error(`Missing productId at index ${i}`);
    }
    if (typeof name !== "string" || !name) {
      throw new Error(`Missing name at index ${i}`);
    }
    if (typeof price !== "number" || price < 1 || !Number.isInteger(price)) {
      throw new Error(`Invalid price at index ${i}`);
    }
    if (
      typeof quantity !== "number" ||
      quantity < 1 ||
      quantity > 99 ||
      !Number.isInteger(quantity)
    ) {
      throw new Error(`Invalid quantity at index ${i}`);
    }

    return {
      productId,
      name,
      price,
      quantity,
      image: typeof image === "string" ? image : undefined,
      variant: typeof variant === "string" ? variant : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Product document shape returned by Payload for price lookup
// ---------------------------------------------------------------------------
interface ProductDoc {
  id: string | number;
  name: string;
  price: number;
  stock?: number;
  inStock?: boolean;
  variants?: Array<{ label: string; price?: number; stock?: number }>;
}

/**
 * Validate cart items AND replace client-supplied prices with server-authoritative
 * prices from the database. This is the ONLY function checkout routes should use.
 *
 * 1. Shape-validates the client payload (via validateCartItems)
 * 2. Bulk-fetches all referenced products from the Products collection
 * 3. Replaces every item's price with the DB price (client price is ignored)
 * 4. Throws if any product is missing or explicitly marked out of stock
 */
export async function validateAndPriceCartItems(
  clientItems: unknown
): Promise<ValidatedCartItem[]> {
  // Step 1: shape validation (ensures structure, types, ranges)
  const items = validateCartItems(clientItems);

  // Step 2: bulk-fetch all products from DB
  const payload = await getPayloadClient();
  const productIds = [...new Set(items.map((i) => i.productId))];

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

  // Step 3: replace prices with server-authoritative values
  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    // If product is explicitly marked out of stock, reject
    if (product.inStock === false) {
      throw new Error(`Product is out of stock: ${product.name}`);
    }

    // Determine the authoritative price — variant price takes precedence if applicable
    let serverPrice = product.price;
    if (item.variant && product.variants) {
      const variant = product.variants.find((v) => v.label === item.variant);
      if (variant && typeof variant.price === "number") {
        serverPrice = variant.price;
      }
    }

    return {
      ...item,
      price: serverPrice,
      name: product.name,
    };
  });
}

export function calculateTotal(items: ValidatedCartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (total < STRIPE_MINIMUM_CENTS) {
    throw new Error(
      `Order total ($${(total / 100).toFixed(2)}) is below the minimum charge of $0.50`
    );
  }
  return total;
}

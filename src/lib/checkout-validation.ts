/** Stripe minimum charge is $0.50 = 50 cents */
const STRIPE_MINIMUM_CENTS = 50;

export interface ValidatedCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

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

    const { productId, name, price, quantity, image } = item as Record<
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

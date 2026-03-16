import { getPayloadClient } from "@/lib/payload";
import type { Order, OrderCreateInput, OrderStatus } from "./types";

interface PayloadOrderDoc {
  id: string | number;
  customerEmail: string;
  items: unknown;
  total: number;
  shippingAddress: unknown;
  paymentMethod: string;
  paymentId: string;
  storeRef?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function docToOrder(doc: PayloadOrderDoc): Order {
  return {
    id: String(doc.id),
    customerEmail: doc.customerEmail,
    items: doc.items as Order["items"],
    total: doc.total,
    shippingAddress: doc.shippingAddress as Order["shippingAddress"],
    paymentMethod: doc.paymentMethod as Order["paymentMethod"],
    paymentId: doc.paymentId,
    storeRef: doc.storeRef,
    status: doc.status as OrderStatus,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

/**
 * Creates a new order in the database with status "pending".
 */
export async function createOrder(input: OrderCreateInput): Promise<Order> {
  const payload = await getPayloadClient();

  const doc = await payload.create({
    collection: "orders",
    overrideAccess: true,
    data: {
      customerEmail: input.customerEmail,
      items: input.items,
      total: input.total,
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      paymentId: input.paymentId,
      storeRef: input.storeRef,
      status: "pending",
    },
  });

  return docToOrder(doc as unknown as PayloadOrderDoc);
}

/**
 * Updates an existing order's status to "confirmed".
 */
export async function confirmOrder(orderId: string): Promise<Order> {
  const payload = await getPayloadClient();

  const doc = await payload.update({
    collection: "orders",
    overrideAccess: true,
    id: orderId,
    data: {
      status: "confirmed",
    },
  });

  return docToOrder(doc as unknown as PayloadOrderDoc);
}

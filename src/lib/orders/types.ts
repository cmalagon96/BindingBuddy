import type { ShippingAddress } from "@/lib/shipping/validation";

export interface OrderItem {
  productId: string;
  name: string;
  price: number; // in cents
  quantity: number;
  variant?: string;
}

export interface OrderCreateInput {
  customerEmail: string;
  items: OrderItem[];
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: "stripe" | "paypal";
  paymentId: string; // stripePaymentIntentId or paypalOrderId
  storeRef?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order extends OrderCreateInput {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

import type { CollectionConfig, Access } from "payload";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "customerEmail",
    defaultColumns: ["customerEmail", "total", "status", "createdAt"],
    components: {
      beforeList: ["/src/components/admin/BeforeCollectionList"],
    },
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  timestamps: true,
  indexes: [
    { fields: ["paymentId"] },
    { fields: ["stripePaymentIntentId"] },
    { fields: ["paypalOrderId"] },
    { fields: ["status"] },
    { fields: ["customerEmail"] },
    { fields: ["status", "createdAt"] },
    { fields: ["createdAt", "storeRef"] },
  ],
  fields: [
    {
      name: "stripePaymentIntentId",
      type: "text",
    },
    {
      name: "paypalOrderId",
      type: "text",
    },
    {
      name: "storeRef",
      type: "text",
    },
    {
      name: "total",
      type: "number",
      required: true,
      admin: { description: "Total in cents (e.g. 3499 = $34.99)" },
    },
    {
      name: "items",
      type: "json",
      required: true,
    },
    {
      name: "customerEmail",
      type: "email",
      required: true,
    },
    {
      name: "paymentMethod",
      type: "select",
      options: [
        { label: "Stripe", value: "stripe" },
        { label: "PayPal", value: "paypal" },
      ],
    },
    {
      name: "paymentId",
      type: "text",
      admin: { description: "Generic payment ID — Stripe PaymentIntent or PayPal order ID" },
    },
    {
      name: "shippingAddress",
      type: "json",
      admin: { description: "Full ShippingAddress object" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Processing", value: "processing" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
      ],
    },
  ],
};

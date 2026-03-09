import type { CollectionConfig, Access } from "payload";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "stripeSessionId",
    defaultColumns: ["stripeSessionId", "storeRef", "total", "status", "createdAt"],
  },
  access: {
    read: () => true,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  timestamps: true,
  fields: [
    {
      name: "stripeSessionId",
      type: "text",
      required: true,
    },
    {
      name: "storeRef",
      type: "text",
      admin: { description: "Referral attribution (e.g. store name from QR code)" },
    },
    {
      name: "total",
      type: "number",
      admin: { description: "Order total in cents" },
    },
    {
      name: "items",
      type: "json",
    },
    {
      name: "status",
      type: "select",
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
      ],
    },
  ],
};

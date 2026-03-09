import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "category", "badge", "inStock"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      admin: { description: "Price in cents (e.g. 3499 = $34.99)" },
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "images",
      type: "array",
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Engraved Binder", value: "engraved-binder" },
        { label: "Engraving Only", value: "engraving-only" },
      ],
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "stock",
      type: "number",
      defaultValue: 0,
      admin: { description: "-1 = unlimited availability" },
    },
    {
      name: "pokemon",
      type: "text",
    },
    {
      name: "binderType",
      type: "text",
    },
    {
      name: "badge",
      type: "select",
      options: [
        { label: "New", value: "New" },
        { label: "Limited", value: "Limited" },
        { label: "Best Seller", value: "Best Seller" },
      ],
    },
    {
      name: "variants",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "stock", type: "number", defaultValue: 0 },
      ],
    },
    {
      name: "inStock",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
  ],
};

import type { CollectionConfig, Access } from "payload";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "category", "badge", "inStock"],
    components: {
      beforeList: ["/src/components/admin/BeforeCollectionList"],
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  indexes: [
    { fields: ["featured"] },
    { fields: ["category"] },
    { fields: ["category", "featured"] },
  ],
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
      min: 1,
      admin: {
        description: "Price in cents (e.g. 3499 = $34.99). Minimum 1.",
        components: {
          Cell: "/src/components/admin/PriceCell",
        },
      },
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
        { label: "Villain Logo Binder", value: "villain-logo-binder" },
        { label: "Design Collection", value: "design-collection" },
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
      admin: {
        position: "sidebar",
        components: {
          Cell: "/src/components/admin/BooleanCell",
        },
      },
    },
  ],
};

import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    mimeTypes: ["image/*"],
    imageSizes: [
      { name: "thumbnail", width: 160, height: 160, position: "centre" },
      { name: "card", width: 480, height: 480, position: "centre" },
      { name: "full", width: 1200, height: undefined, position: "centre" },
    ],
  },
  admin: {
    useAsTitle: "alt",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
};

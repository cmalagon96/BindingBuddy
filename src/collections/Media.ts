import type { CollectionConfig, Access, CollectionAfterChangeHook } from "payload";
import sharp from "sharp";

const isAdmin: Access = ({ req }) => {
  const user = req.user as { role?: string } | null;
  return user?.role === "admin";
};

const generateBlurDataURL: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!doc.url || doc.blurDataURL) return doc;

  try {
    let imageBuffer: Buffer;
    if (doc.filename) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const staticDir = req.payload.collections.media.config.upload?.staticDir;
      if (typeof staticDir === "string") {
        const filePath = path.resolve(staticDir, doc.filename);
        try {
          imageBuffer = await fs.readFile(filePath);
        } catch {
          return doc;
        }
      } else {
        return doc;
      }
    } else {
      return doc;
    }

    const blurBuffer = await sharp(imageBuffer)
      .resize(8, 8, { fit: "inside" })
      .webp({ quality: 20 })
      .toBuffer();

    const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

    await req.payload.update({
      collection: "media",
      id: doc.id,
      data: { blurDataURL },
      depth: 0,
    });

    return { ...doc, blurDataURL };
  } catch (error) {
    console.error("[Media] Failed to generate blur placeholder:", error);
    return doc;
  }
};

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    imageSizes: [
      { name: "thumbnail", width: 160, height: 160, position: "centre" },
      { name: "card", width: 480, height: 480, position: "centre" },
      { name: "full", width: 1200, height: undefined, position: "centre" },
    ],
  },
  admin: {
    useAsTitle: "alt",
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
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        components: {
          Cell: "/src/components/admin/MediaThumbnailCell",
        },
      },
    },
    {
      name: "blurDataURL",
      type: "text",
      admin: {
        hidden: true,
      },
    },
  ],
  hooks: {
    afterChange: [generateBlurDataURL],
  },
};

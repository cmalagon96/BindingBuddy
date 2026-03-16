import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { Users } from "./src/collections/Users";
import { Media } from "./src/collections/Media";
import { Products } from "./src/collections/Products";
import { Orders } from "./src/collections/Orders";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadSecret = process.env.PAYLOAD_SECRET;
if (!payloadSecret) throw new Error("PAYLOAD_SECRET environment variable is required");

const databaseUri = process.env.DATABASE_URI;
if (!databaseUri) throw new Error("DATABASE_URI environment variable is required");

export default buildConfig({
  secret: payloadSecret,
  db: mongooseAdapter({
    url: databaseUri,
  }),
  editor: lexicalEditor(),
  sharp,
  collections: [Users, Media, Products, Orders],
  admin: {
    user: Users.slug,
    theme: "dark",
    meta: {
      titleSuffix: " | Binding Buddy",
    },
    components: {
      graphics: {
        Logo: "/src/components/admin/Logo",
        Icon: "/src/components/admin/Icon",
      },
      beforeLogin: ["/src/components/admin/BeforeLogin"],
      beforeDashboard: ["/src/components/admin/BeforeDashboard"],
      afterDashboard: ["/src/components/admin/AfterDashboard"],
      providers: ["/src/components/admin/TOTPProvider"],
      // Injects Google Fonts + theme-color into <head> for the admin panel.
      // Fonts are loaded here (preconnect + stylesheet) instead of via
      // @import in custom.scss to avoid Next.js generating a stale preload
      // hint that fires before the fonts are actually consumed.
      // `head` is a valid Payload runtime slot but missing from the beta types.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error — Payload 3 beta types don't yet expose `head`
      head: ["/src/components/admin/Head"],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});

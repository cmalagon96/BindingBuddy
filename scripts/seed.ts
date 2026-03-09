import "dotenv/config";
import { getPayload } from "payload";
import config from "../payload.config";

const products = [
  {
    slug: "charizard-engraved-9pocket",
    name: "Charizard Engraved Binder",
    description:
      "A fierce Charizard design laser-engraved onto a 9-pocket binder cover using xTool precision. Deep, clean lines bring every detail to life on the leatherette surface. Holds up to 360 cards with side-loading pages.",
    price: 3499,
    category: "engraved-binder" as const,
    featured: true,
    stock: 20,
    pokemon: "Charizard",
    binderType: "9-Pocket",
    badge: "Best Seller" as const,
    inStock: true,
  },
  {
    slug: "pikachu-engraved-9pocket",
    name: "Pikachu Engraved Binder",
    description:
      "The iconic Pikachu rendered in sharp relief on a 9-pocket binder cover, engraved with xTool laser accuracy. A staple design for any collector. Holds up to 360 cards with side-loading pages.",
    price: 3499,
    category: "engraved-binder" as const,
    featured: true,
    stock: 25,
    pokemon: "Pikachu",
    binderType: "9-Pocket",
    inStock: true,
  },
  {
    slug: "mewtwo-engraved-zipper",
    name: "Mewtwo Engraved Zipper Binder",
    description:
      "Mewtwo's silhouette engraved in full-cover detail on a premium zipper binder. xTool laser etching captures every line. Full-zip closure, 20 side-loading 9-pocket pages, and a zippered accessory pocket.",
    price: 4999,
    category: "engraved-binder" as const,
    featured: true,
    stock: 12,
    pokemon: "Mewtwo",
    binderType: "Zipper",
    badge: "Limited" as const,
    inStock: true,
  },
  {
    slug: "gengar-engraved-9pocket",
    name: "Gengar Engraved Binder",
    description:
      "Gengar's shadowy grin laser-engraved onto a 9-pocket binder with xTool precision. The ghost-type silhouette engraves with a striking dark contrast that looks incredible on leatherette. Holds up to 360 cards.",
    price: 3499,
    category: "engraved-binder" as const,
    featured: false,
    stock: 18,
    pokemon: "Gengar",
    binderType: "9-Pocket",
    badge: "New" as const,
    inStock: true,
  },
  {
    slug: "eevee-engraved-9pocket",
    name: "Eevee Engraved Binder",
    description:
      "Eevee engraved in fine xTool laser detail on a 9-pocket binder. Clean, elegant line work makes this one of the most requested designs in the shop. Holds up to 360 cards with side-loading pages.",
    price: 3499,
    category: "engraved-binder" as const,
    featured: false,
    stock: 22,
    pokemon: "Eevee",
    binderType: "9-Pocket",
    inStock: true,
  },
  {
    slug: "rayquaza-engraved-zipper",
    name: "Rayquaza Engraved Zipper Binder",
    description:
      "Rayquaza's serpentine form stretches across the full cover of this premium zipper binder, engraved in xTool laser detail. Full-zip protection, 20 side-loading 9-pocket pages, and a zippered accessory pocket.",
    price: 4999,
    category: "engraved-binder" as const,
    featured: false,
    stock: 10,
    pokemon: "Rayquaza",
    binderType: "Zipper",
    inStock: true,
  },
  {
    slug: "custom-engraving-standard",
    name: "Custom Engraving – Standard",
    description:
      "Send us your 9-pocket binder and we'll laser-engrave any Pokemon design onto the cover using our xTool machine. Choose from our design library or provide your own reference art. Turnaround: 5–7 business days after binder is received.",
    price: 1499,
    category: "engraving-only" as const,
    featured: false,
    stock: -1,
    inStock: true,
  },
  {
    slug: "custom-engraving-premium",
    name: "Custom Engraving – Premium",
    description:
      "Full-cover detail engraving on any binder size. Bring your binder in or ship it to us — we'll engrave a custom Pokemon design with xTool precision. Ideal for large zipper binders or complex multi-character scenes. Turnaround: 7–10 business days.",
    price: 2499,
    category: "engraving-only" as const,
    featured: false,
    stock: -1,
    inStock: true,
  },
];

async function seed() {
  const payload = await getPayload({ config });

  console.log("Seeding products...");

  for (const product of products) {
    const existing = await payload.find({
      collection: "products",
      where: { slug: { equals: product.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  Skipping "${product.name}" (already exists)`);
      continue;
    }

    await payload.create({
      collection: "products",
      data: product,
    });
    console.log(`  Created "${product.name}"`);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

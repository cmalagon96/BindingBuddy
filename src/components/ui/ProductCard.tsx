import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/format-price";
import AddToCartButton from "@/components/products/AddToCartButton";
import Badge from "./Badge";
import HoloCard from "./HoloCard";

interface Props {
  product: Product;
  priority?: boolean;
}

const categoryLabel: Record<Product["category"], string> = {
  "engraved-binder": "Engraved Binder",
  "engraving-only": "Engraving Service",
  "villain-logo-binder": "Villain Logo Binder",
  "design-collection": "Design Collection",
};

function ProductCard({ product, priority = false }: Props) {
  return (
    <HoloCard className="group flex flex-col bg-poke-card rounded-2xl overflow-hidden border border-poke-border hover:border-poke-blue/40 transition-all duration-300 hover:shadow-xl hover:shadow-poke-blue/10">
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden"
      >
        <div className={`relative h-56 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center${!product.blurDataURL ? " shimmer" : ""}`}>
          <Image
            src={product.image}
            alt={product.name}
            width={400}
            height={300}
            className="object-cover w-full h-full"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            {...(product.blurDataURL ? { placeholder: "blur" as const, blurDataURL: product.blurDataURL } : {})}
          />
          {product.badge && (
            <div className="absolute top-3 left-3">
              <Badge label={product.badge} />
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-poke-muted uppercase tracking-widest font-medium">
              {categoryLabel[product.category]}
            </span>
            {product.pokemon && (
              <span className="text-xs text-poke-gold font-semibold">
                · {product.pokemon}
              </span>
            )}
          </div>
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-display text-poke-text font-bold text-lg mt-1.5 leading-snug group-hover:text-poke-yellow transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
        </div>

        <p className="text-poke-muted text-sm line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-poke-border">
          <span className="font-display text-poke-yellow font-bold text-xl">
            {formatPrice(product.price)}
          </span>
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </HoloCard>
  );
}

export default memo(ProductCard);

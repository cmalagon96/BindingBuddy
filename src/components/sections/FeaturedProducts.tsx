import { Product } from "@/types/product";
import ProductCard from "@/components/ui/ProductCard";

interface Props {
  products: Product[];
}

export default function FeaturedProducts({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <section
      id="featured"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <div className="flex items-center gap-3 mb-8">
        <span className="w-8 h-1 bg-poke-yellow rounded-full" />
        <h2 className="font-display text-3xl font-bold text-poke-text tracking-tight">
          Featured Designs
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ))}
      </div>
    </section>
  );
}

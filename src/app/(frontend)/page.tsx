// MED-7: single getAllProducts() query — derive featured via .filter()
// instead of two sequential DB calls (getFeaturedProducts + getAllProducts)
import { getAllProducts } from "@/lib/products";
import Hero from "@/components/sections/Hero";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import CategoryGrid from "@/components/sections/CategoryGrid";
import ProcessSection from "@/components/sections/ProcessSection";
import Testimonials from "@/components/sections/Testimonials";
import ProductCard from "@/components/ui/ProductCard";

export const revalidate = 60;

export default async function HomePage() {
  const all = await getAllProducts();
  const featured = all.filter((p) => p.featured);

  return (
    <>
      <Hero />
      <FeaturedProducts products={featured} />
      <CategoryGrid />

      {/* All Products */}
      <section
        id="all-products"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-1 bg-poke-gold rounded-full" />
          <h2 className="font-display text-2xl font-bold text-poke-text tracking-tight">
            All Products
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {all.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <ProcessSection />
      <Testimonials />
    </>
  );
}

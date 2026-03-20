import { getHomePageProducts } from "@/lib/products";
import Hero from "@/components/sections/Hero";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import CategoryGrid from "@/components/sections/CategoryGrid";
import ProcessSection from "@/components/sections/ProcessSection";
import Testimonials from "@/components/sections/Testimonials";
import ProductCard from "@/components/ui/ProductCard";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  const { featured, newArrivals } = await getHomePageProducts();

  return (
    <>
      <Hero />
      <FeaturedProducts products={featured} />
      <CategoryGrid />

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-1 bg-poke-gold rounded-full" />
          <h2 className="font-display text-3xl font-bold text-poke-text tracking-tight">
            New Arrivals
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3 bg-poke-blue text-poke-text font-display font-bold text-lg rounded-xl hover:bg-poke-blue/80 transition-colors"
          >
            Browse All Products →
          </Link>
        </div>
      </section>

      <ProcessSection />
      <Testimonials />
    </>
  );
}

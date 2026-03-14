import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getProductBySlug,
  getAllProducts,
  getProductsByCategory,
  formatPrice,
} from "@/lib/products";
import AddToCartButton from "@/components/products/AddToCartButton";
import Badge from "@/components/ui/Badge";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

const categoryLabel: Record<string, string> = {
  "engraved-binder": "Engraved Binder",
  "engraving-only": "Engraving Service",
  "villain-logo-binder": "Villain Logo Binder",
  "design-collection": "Design Collection",
};

// HIGH-9: ISR — revalidate every 60s, pre-render known slugs at build time
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} – Binding Buddy`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // HIGH-10: use targeted category query instead of getAllProducts() (limit:200)
  const categoryProducts = await getProductsByCategory(product.category);
  const related = categoryProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-poke-muted mb-10">
        <Link href="/" className="hover:text-poke-text transition-colors">
          Shop
        </Link>
        <span>/</span>
        <Link
          href="/products"
          className="hover:text-poke-text transition-colors"
        >
          Products
        </Link>
        <span>/</span>
        <span className="text-poke-text">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Image */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl border border-poke-border overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            width={600}
            height={600}
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-xs text-poke-muted uppercase tracking-widest font-medium">
                {categoryLabel[product.category] ?? product.category}
              </span>
              {product.badge && <Badge label={product.badge} />}
              <span className="bg-poke-blue/20 border border-poke-blue/40 text-poke-blue text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                xTool Laser
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-poke-text leading-tight tracking-tight">
              {product.name}
            </h1>
          </div>

          <p className="font-display text-4xl font-bold text-poke-yellow">
            {formatPrice(product.price)}
          </p>

          <p className="text-poke-muted text-base leading-relaxed">
            {product.description}
          </p>

          {/* Metadata */}
          {(product.pokemon || product.binderType) && (
            <div className="bg-poke-card border border-poke-border rounded-xl p-4 flex flex-col gap-2.5 text-sm">
              {product.pokemon && (
                <div className="flex justify-between">
                  <span className="text-poke-muted">Pokemon</span>
                  <span className="text-poke-text font-semibold">
                    {product.pokemon}
                  </span>
                </div>
              )}
              {product.binderType && (
                <div className="flex justify-between">
                  <span className="text-poke-muted">Binder Type</span>
                  <span className="text-poke-text font-semibold">
                    {product.binderType}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-poke-muted">Engraving Method</span>
                <span className="text-poke-text font-semibold">
                  xTool Laser
                </span>
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                product.stock === 0
                  ? "bg-red-500"
                  : product.stock > 0 && product.stock <= 10
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
            />
            <span className="text-poke-muted">
              {product.stock === -1
                ? "Available"
                : product.stock === 0
                  ? "Out of stock"
                  : product.stock <= 10
                    ? `Only ${product.stock} left`
                    : "In stock"}
            </span>
          </div>

          {/* Add to cart */}
          <div className="max-w-xs">
            <AddToCartButton product={product} />
          </div>

          {/* Back */}
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-poke-muted hover:text-poke-text text-sm transition-colors mt-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to products
          </Link>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-xl font-bold text-poke-text tracking-tight mb-6">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group bg-poke-card border border-poke-border rounded-2xl p-4 flex gap-4 hover:border-poke-blue/40 transition-all"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-poke-text group-hover:text-poke-yellow transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-poke-muted text-xs line-clamp-2 mt-1">
                    {p.description}
                  </p>
                  <p className="font-display text-poke-yellow font-bold text-sm mt-2">
                    {formatPrice(p.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

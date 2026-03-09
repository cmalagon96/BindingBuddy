"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/components/ui/ProductCard";
import type { Product } from "@/lib/products";

type SortOption = "default" | "price-asc" | "price-desc" | "name";

const categoryOptions: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "engraved-binder", label: "Engraved Binders" },
  { value: "engraving-only", label: "Engraving Services" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low \u2192 High" },
  { value: "price-desc", label: "Price: High \u2192 Low" },
  { value: "name", label: "Name A\u2013Z" },
];

const selectClass =
  "bg-poke-card border border-poke-border text-poke-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-poke-blue/50 transition-colors";

interface Props {
  products: Product[];
}

export default function ProductsGrid({ products }: Props) {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortOption>("default");

  const filtered = useMemo(() => {
    let list: Product[] =
      category === "all"
        ? products
        : products.filter((p) => p.category === category);

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [products, category, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-poke-text tracking-tight mb-8">
        All Products
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={selectClass}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="text-poke-muted text-sm ml-auto">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-poke-muted text-lg">
            No products found for this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

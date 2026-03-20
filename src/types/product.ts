export interface ProductVariant {
  id: string;
  name: string;
  priceModifier?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  blurDataURL?: string;
  images?: string[];
  category: "engraved-binder" | "engraving-only" | "villain-logo-binder" | "design-collection";
  featured: boolean;
  stock: number;
  pokemon?: string;
  binderType?: string;
  variants?: ProductVariant[];
  badge?: "New" | "Limited" | "Best Seller";
}

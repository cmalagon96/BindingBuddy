import { getAllProducts } from "@/lib/products";
import ProductsClient from "./ProductsClient";

// HIGH-9: ISR — revalidate every 60s instead of force-dynamic
export const revalidate = 60;

export default async function ProductsPage() {
  const products = await getAllProducts();

  return <ProductsClient products={products} />;
}

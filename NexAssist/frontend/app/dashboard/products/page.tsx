import { Package } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopbar } from "@/components/app-topbar";
import { AddProductDialog } from "@/components/product-form";
import { getCompanies, getProducts } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { ProductListItem, ProductListResponse } from "@/lib/types/api";

const emptyProducts: ProductListResponse = {
  products: []
};

async function loadProducts(token: string): Promise<ProductListResponse> {
  try {
    const companies = await getCompanies(token);
    const companyId = companies.companies[0]?.id;
    return companyId ? getProducts(companyId, token) : emptyProducts;
  } catch {
    return emptyProducts;
  }
}

function ProductCard({ product }: Readonly<{ product: ProductListItem }>) {
  return (
    <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm">
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{product.category ?? "Other"}</span>
      <h2 className="mt-2 text-lg font-semibold text-foreground">{product.name}</h2>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{product.description ?? "No description provided"}</p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">{product.manual_count} manuals · {product.model_count} models</div>
        <Link href={`/dashboard/products/${product.id}`} className="text-sm font-medium text-primary transition-colors hover:text-primary/80">Manage →</Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border bg-card text-center">
      <Package className="h-12 w-12 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">No products yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Add your first product to get started</p>
      <div className="mt-5"><AddProductDialog /></div>
    </div>
  );
}

export default async function ProductsPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/auth/login");
  const products = await loadProducts(data.session.access_token);

  return (
    <div>
      <AppTopbar title="Products" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Products</h1>
          <AddProductDialog />
        </div>
        {products.products.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{products.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState />}
      </div>
    </div>
  );
}

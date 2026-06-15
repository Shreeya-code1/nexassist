"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowRight, Loader2 } from "lucide-react";

import { createSession, getSessions } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { SessionListResponse } from "@/lib/types/api";
import type { ProductListItem } from "@/lib/types/api";
import { useCompany } from "@/hooks/use-company";
import { useProducts } from "@/hooks/use-products";
import { cn, formatDate, phaseToLabel } from "@/lib/utils";

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function ProductCard({ product, selected, onSelect }: { product: ProductListItem; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={cn("rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm", selected ? "ring-2 ring-primary" : "")}>
      <div className="aspect-square rounded-lg bg-muted" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{product.manual_count} manuals</div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{product.category ?? "Other"}</span>
      </div>
    </button>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const { products, isLoading } = useProducts(companyId);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? null, [products, selectedProductId]);
  const sessions = useSWR<SessionListResponse, Error>(
    companyId && selectedProductId ? ["support-sessions", companyId, selectedProductId] : null,
    async ([, nextCompanyId, nextProductId]: readonly [string, string, string]) => getSessions({ company_id: nextCompanyId, product_id: nextProductId, limit: 5 }, await token()),
    { revalidateOnFocus: false }
  );

  async function startSession(): Promise<void> {
    if (!companyId || !selectedProductId) return;
    setStarting(true);
    try {
      const response = await createSession({ company_id: companyId, product_id: selectedProductId, product_model_id: null, external_user_label: null, initial_message: null }, await token());
      router.push(`/support/${response.session_id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-foreground">Get Support</h1>
        <section className="mt-8">
          <div className="text-sm font-medium text-muted-foreground">Step 1</div>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Choose your product</h2>
          {isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading products
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} selected={selectedProductId === product.id} onSelect={() => setSelectedProductId(product.id)} />
              ))}
            </div>
          )}
        </section>

        {selectedProduct ? (
          <section className="mt-10">
            <div className="text-sm font-medium text-muted-foreground">Step 2</div>
            <div className="mt-3 flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Start with {selectedProduct.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Describe symptoms and Kairo will guide the diagnosis one step at a time.</p>
              </div>
              <button type="button" onClick={() => void startSession()} disabled={starting} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Start New Session
              </button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or continue a session</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="rounded-xl border bg-card">
              {(sessions.data?.sessions ?? []).map((session) => (
                <div key={session.id} className="flex items-center gap-4 border-b p-4 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{session.title ?? "Untitled support session"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(session.updated_at)}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{phaseToLabel(session.current_phase)}</span>
                  <Link href={`/support/${session.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Continue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
              {sessions.data?.sessions.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No recent sessions for this product</div> : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

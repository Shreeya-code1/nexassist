import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopbar } from "@/components/app-topbar";
import { apiFetch, getCompanies, getProducts, runIngestion } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { ManualDeleteResponse, ProductDetailResponse, ProductListItem } from "@/lib/types/api";
import type { ManualStatus } from "@/lib/types/product";
import { cn, formatDate } from "@/lib/utils";

interface ProductManualGroup {
  product: ProductListItem;
  manuals: ProductDetailResponse["manuals"];
}

const statusClasses: Record<ManualStatus, string> = {
  uploaded: "border-border bg-muted text-muted-foreground",
  processing: "animate-pulse border-primary/20 bg-primary/10 text-primary",
  ready: "border-success/20 bg-success/10 text-success",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
  archived: "border-border bg-muted/50 text-muted-foreground"
};

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/auth/login");
  return data.session.access_token;
}

async function reindexManual(manualId: string): Promise<void> {
  "use server";
  await runIngestion(manualId, true, await token());
  revalidatePath("/dashboard/manuals");
}

async function deleteManual(manualId: string): Promise<void> {
  "use server";
  await apiFetch<ManualDeleteResponse>(`/api/v1/manuals/${manualId}`, { method: "DELETE" }, await token());
  revalidatePath("/dashboard/manuals");
}

async function loadGroups(accessToken: string): Promise<ProductManualGroup[]> {
  try {
    const companies = await getCompanies(accessToken);
    const companyId = companies.companies[0]?.id;
    if (!companyId) return [];
    const products = await getProducts(companyId, accessToken);
    return Promise.all(products.products.map(async (product) => ({ product, manuals: (await apiFetch<ProductDetailResponse>(`/api/v1/products/${product.id}`, undefined, accessToken)).manuals })));
  } catch {
    return [];
  }
}

function StatusBadge({ status }: Readonly<{ status: ManualStatus }>) {
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusClasses[status])}>{status}</span>;
}

export default async function ManualsPage() {
  const accessToken = await token();
  const groups = await loadGroups(accessToken);

  return (
    <div>
      <AppTopbar title="Manuals" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Manuals</h1>
          <Link href="/dashboard/manuals/upload" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Upload Manual</Link>
        </div>
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.product.id} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{group.product.name}</h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="grid grid-cols-[1.5fr_.7fr_.7fr_.8fr_.5fr_.8fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <span>Title</span><span>Version</span><span>Language</span><span>Status</span><span>Chunks</span><span>Uploaded</span><span>Actions</span>
                </div>
                {group.manuals.length ? group.manuals.map((manual) => (
                  <div key={manual.id} className="grid grid-cols-[1.5fr_.7fr_.7fr_.8fr_.5fr_.8fr_1fr] items-center gap-4 border-b px-4 py-3 text-sm last:border-b-0">
                    <span className="truncate font-medium text-foreground">{manual.title}</span><span className="text-muted-foreground">{manual.version ?? "—"}</span><span className="text-muted-foreground">{manual.language}</span><StatusBadge status={manual.status} /><span className="text-muted-foreground">{manual.chunk_count}</span><span className="text-muted-foreground">{formatDate(manual.created_at)}</span>
                    <div className="flex gap-3"><form action={reindexManual.bind(null, manual.id)}><button type="submit" className="text-sm text-primary hover:text-primary/80">Re-index</button></form><form action={deleteManual.bind(null, manual.id)}><button type="submit" className="text-sm text-destructive hover:text-destructive/80">Delete</button></form></div>
                  </div>
                )) : <div className="px-4 py-8 text-center text-sm text-muted-foreground">No manuals uploaded for this product</div>}
              </div>
            </section>
          ))}
          {groups.length === 0 ? <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No manuals yet</div> : null}
        </div>
      </div>
    </div>
  );
}

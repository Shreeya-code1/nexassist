"use client";

import { useRouter } from "next/navigation";

import { AppTopbar } from "@/components/app-topbar";
import { ManualUploadForm } from "@/components/manual-upload-form";
import { useCompany } from "@/hooks/use-company";
import { useProducts } from "@/hooks/use-products";

export default function ManualUploadPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const { products, isLoading } = useProducts(companyId);
  const productId = products[0]?.id ?? null;

  return (
    <div>
      <AppTopbar title="Upload Manual" />
      <div className="grid gap-6 p-6 xl:grid-cols-[3fr_2fr]">
        <div>
          {productId ? <ManualUploadForm productId={productId} onSuccess={() => router.push("/dashboard/manuals")} /> : <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">{isLoading ? "Loading products..." : "Create a product before uploading a manual"}</div>}
        </div>
        <aside className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">What happens next</h2>
          <div className="mt-5 space-y-4">
            {["PDF is securely stored", "Text and diagrams extracted page by page", "Content split into searchable knowledge chunks", "Chunks embedded and indexed — ready for the diagnostic AI"].map((item, index) => (
              <div key={item} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">{index + 1}</div>
                <p className="pt-1 text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

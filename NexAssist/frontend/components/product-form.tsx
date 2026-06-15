"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Package, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { createProduct } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/hooks/use-company";

interface ProductFormProps {
  onSuccess: () => void;
}

interface ProductFormErrors {
  name?: string;
  company?: string;
}

const categories = ["Electronics", "Appliances", "Vehicles", "Industrial", "Other"];

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function accessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function ProductForm({ onSuccess }: ProductFormProps) {
  const { companyId } = useCompany();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: ProductFormErrors = {};
    if (!name.trim()) nextErrors.name = "Product name is required";
    if (!companyId) nextErrors.company = "Select a company first";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!companyId) return;
    setLoading(true);
    try {
      await createProduct(companyId, { name, slug: slugify(name), category, description: description || null, image_url: null }, await accessToken());
      toast.success("Product created");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Product name" className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
        {errors.name ? <div className="mt-1 text-xs text-destructive">{errors.name}</div> : null}
      </div>
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
        {categories.map((item) => <option key={item}>{item}</option>)}
      </select>
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
      {errors.company ? <div className="text-xs text-destructive">{errors.company}</div> : null}
      <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add Product
      </button>
    </form>
  );
}

export function AddProductDialog() {
  const [open, setOpen] = useState(false);

  function onSuccess(): void {
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Add Product</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Create a product before uploading manuals.</Dialog.Description>
            </div>
          </div>
          <ProductForm onSuccess={onSuccess} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

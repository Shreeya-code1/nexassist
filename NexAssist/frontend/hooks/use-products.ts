"use client";

import useSWR, { type KeyedMutator } from "swr";

import { getProducts } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { ProductListItem, ProductListResponse } from "@/lib/types/api";

export interface UseProductsResult {
  products: ProductListItem[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<ProductListResponse>;
}

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function useProducts(companyId: string | null): UseProductsResult {
  const result = useSWR<ProductListResponse, Error>(
    companyId ? ["products", companyId] : null,
    async ([, id]: readonly [string, string]) => getProducts(id, await token()),
    { revalidateOnFocus: false }
  );

  return {
    products: result.data?.products ?? [],
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate
  };
}

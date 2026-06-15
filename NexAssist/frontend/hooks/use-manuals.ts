"use client";

import useSWR, { type KeyedMutator } from "swr";

import { apiFetch, getIngestionJob } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { IngestionJobResponse, ProductManualsResponse } from "@/lib/types/api";
import type { ManualStatus } from "@/lib/types/product";

export interface ManualListItem {
  id: string;
  company_id: string;
  product_id: string;
  product_model_id: string | null;
  title: string;
  version: string | null;
  language: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: ManualStatus;
  page_count: number | null;
  chunk_count: number;
  created_at: string;
  updated_at?: string;
}

export interface UseManualsResult {
  manuals: ManualListItem[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<ProductManualsResponse>;
}

export interface UseIngestionJobResult {
  job: IngestionJobResponse | null;
  isLoading: boolean;
  error: Error | undefined;
  mutate: KeyedMutator<IngestionJobResponse>;
}

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function useManuals(productId: string | null): UseManualsResult {
  const result = useSWR<ProductManualsResponse, Error>(
    productId ? ["manuals", productId] : null,
    async ([, id]: readonly [string, string]) => apiFetch<ProductManualsResponse>(`/api/v1/manuals/products/${id}/manuals`, undefined, await token()),
    { revalidateOnFocus: false }
  );

  return {
    manuals: result.data?.manuals ?? [],
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate
  };
}

export function useIngestionJob(jobId: string | null): UseIngestionJobResult {
  const result = useSWR<IngestionJobResponse, Error>(
    jobId ? ["ingestion-job", jobId] : null,
    async ([, id]: readonly [string, string]) => getIngestionJob(id, await token()),
    {
      revalidateOnFocus: false,
      refreshInterval: (latestData) => latestData && ["completed", "failed"].includes(latestData.status) ? 0 : 2000
    }
  );

  return {
    job: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate
  };
}

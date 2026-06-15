"use client";

import { useCallback, useEffect, useState } from "react";

import { getCompanies } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const COMPANY_STORAGE_KEY = "nexassist_company_id";

export interface UseCompanyResult {
  companyId: string | null;
  setCompanyId: (companyId: string) => void;
  clearCompanyId: () => void;
}

export function useCompany(): UseCompanyResult {
  const [companyId, setCompanyIdState] = useState<string | null>(null);

  const setCompanyId = useCallback((nextCompanyId: string): void => {
    localStorage.setItem(COMPANY_STORAGE_KEY, nextCompanyId);
    setCompanyIdState(nextCompanyId);
  }, []);

  const clearCompanyId = useCallback((): void => {
    localStorage.removeItem(COMPANY_STORAGE_KEY);
    setCompanyIdState(null);
  }, []);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (storedCompanyId) {
      setCompanyIdState(storedCompanyId);
      return;
    }
    async function selectFirstCompany(): Promise<void> {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const response = await getCompanies(data.session.access_token);
        const firstCompanyId = response.companies[0]?.id ?? null;
        if (firstCompanyId) setCompanyId(firstCompanyId);
      } catch {
        setCompanyIdState(null);
      }
    }
    void selectFirstCompany();
  }, [setCompanyId]);

  return { companyId, setCompanyId, clearCompanyId };
}

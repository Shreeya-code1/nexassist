"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppTopbar } from "@/components/app-topbar";
import { useCompany } from "@/hooks/use-company";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { CompanyDetailResponse, CompanyUpdateResponse } from "@/lib/types/api";

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function isValidUrl(value: string): boolean {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

export default function SettingsPage() {
  const { companyId } = useCompany();
  const [name, setName] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadCompany(): Promise<void> {
      if (!companyId) return;
      setLoading(true);
      try {
        const company = await apiFetch<CompanyDetailResponse>(`/api/v1/companies/${companyId}`, undefined, await token());
        setName(company.name);
        setWebsiteUrl(company.website_url ?? "");
        setLogoUrl(company.logo_url ?? "");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to load company profile";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
    void loadCompany();
  }, [companyId]);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!companyId) return;
    setSaving(true);
    try {
      await apiFetch<CompanyUpdateResponse>(`/api/v1/companies/${companyId}`, { method: "PATCH", body: JSON.stringify({ name, website_url: websiteUrl || null, logo_url: logoUrl || null }) }, await token());
      toast.success("Company profile saved");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save company profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppTopbar title="Settings" />
      <div className="p-6">
        <form onSubmit={(event) => void save(event)} className="max-w-lg rounded-xl border bg-card p-5">
          <h1 className="text-base font-semibold text-foreground">Company Profile</h1>
          {loading ? <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading company profile</div> : null}
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Company Name
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Website URL
              <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Logo URL
              <div className="mt-1 flex items-center gap-3">
                <input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                {isValidUrl(logoUrl) ? <img src={logoUrl} alt="" className="h-10 w-10 rounded-md border object-cover" /> : null}
              </div>
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </button>
        </form>

        <section className="mt-8 max-w-lg rounded-xl border border-destructive/30 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Danger Zone</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground">Archive all products</div>
              <div className="text-xs text-muted-foreground">Remove products from active support flows.</div>
            </div>
            <button type="button" onClick={() => toast("Archive action coming soon")} className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
              Archive
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

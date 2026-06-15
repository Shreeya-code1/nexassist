import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopbar, DashboardStatCards } from "@/components/app-topbar";
import { getCompanies, getProducts, getSessions } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { CompanyListItem, ProductListResponse, SessionListItem, SessionListResponse } from "@/lib/types/api";
import { cn, phaseToLabel } from "@/lib/utils";

interface DashboardData {
  company: CompanyListItem | null;
  sessions: SessionListResponse;
  products: ProductListResponse;
}

const emptySessions: SessionListResponse = {
  sessions: [],
  total: 0
};

const emptyProducts: ProductListResponse = {
  products: []
};

const severityClasses: Record<string, string> = {
  unknown: "border-border bg-muted text-muted-foreground",
  low: "border-primary/20 bg-primary/10 text-primary",
  medium: "border-warning/20 bg-warning/10 text-warning-foreground",
  high: "border-warning/30 bg-warning/15 text-warning-foreground",
  critical: "border-destructive/20 bg-destructive/10 text-destructive"
};

const statusClasses: Record<string, string> = {
  active: "border-primary/20 bg-primary/10 text-primary",
  resolved: "border-success/20 bg-success/10 text-success",
  escalated: "border-warning/20 bg-warning/10 text-warning-foreground",
  abandoned: "border-border bg-muted text-muted-foreground"
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function loadDashboardData(token: string): Promise<DashboardData> {
  try {
    const companies = await getCompanies(token);
    const company = companies.companies[0] ?? null;
    if (!company) return { company, sessions: emptySessions, products: emptyProducts };
    const [sessions, products] = await Promise.all([
      getSessions({ company_id: company.id, status: "active", limit: 5, offset: 0 }, token),
      getProducts(company.id, token)
    ]);
    return { company, sessions, products };
  } catch {
    return { company: null, sessions: emptySessions, products: emptyProducts };
  }
}

function Badge({ value, className }: Readonly<{ value: string; className: string }>) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm", className)}>{phaseToLabel(value)}</span>;
}

function SessionRow({ session }: Readonly<{ session: SessionListItem }>) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-white/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.03]">
      <div className="truncate text-sm font-medium text-white/90">{session.title ?? "Untitled session"}</div>
      <div className="truncate text-sm text-muted-foreground">{session.product_name ?? "No product"}</div>
      <Badge value={session.severity} className={severityClasses[session.severity]} />
      <Badge value={session.status} className={statusClasses[session.status]} />
      <div className="whitespace-nowrap text-sm text-muted-foreground">{timeAgo(session.updated_at)}</div>
      <Link href={`/dashboard/sessions/${session.id}`} className="text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200">Open</Link>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const data = await loadDashboardData(session.access_token);
  const manualsIndexed = data.products.products.reduce((total, product) => total + product.manual_count, 0);
  const stats = [
    { label: "Active Sessions", value: String(data.sessions.total), trend: true },
    { label: "Products Listed", value: String(data.products.products.length) },
    { label: "Manuals Indexed", value: String(manualsIndexed) },
    { label: "Resolved Today", value: "0" }
  ];

  return (
    <div className="min-h-screen grid-bg">
      <AppTopbar title="Dashboard" />
      <div className="space-y-8 p-6">
        <DashboardStatCards stats={stats} />
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white/90">Recent Sessions</h2>
          </div>
          <div className="overflow-hidden rounded-xl glass">
            {data.sessions.sessions.length ? data.sessions.sessions.map((item) => <SessionRow key={item.id} session={item} />) : <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">No active sessions yet</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

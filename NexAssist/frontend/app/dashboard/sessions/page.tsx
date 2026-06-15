import { redirect } from "next/navigation";

import { AppTopbar } from "@/components/app-topbar";
import { SessionList } from "@/components/session-list";
import { getCompanies, getSession, getSessions } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { SessionListItem } from "@/lib/types/api";
import type { DiagnosticState } from "@/lib/types/diagnostic";

interface SessionStats {
  total: number;
  active: number;
  resolved: number;
  avgConfidence: number;
}

interface SessionsData {
  sessions: SessionListItem[];
  stats: SessionStats;
}

function isDiagnosticState(value: unknown): value is DiagnosticState {
  return typeof value === "object" && value !== null && "confidence" in value;
}

async function loadSessions(token: string): Promise<SessionsData> {
  try {
    const companies = await getCompanies(token);
    const companyId = companies.companies[0]?.id;
    if (!companyId) return { sessions: [], stats: { total: 0, active: 0, resolved: 0, avgConfidence: 0 } };
    const response = await getSessions({ company_id: companyId, limit: 50 }, token);
    const details = await Promise.all(response.sessions.map((session) => getSession(session.id, token).catch(() => null)));
    const confidences = details.map((detail) => detail && isDiagnosticState(detail.diagnostic_state) ? detail.diagnostic_state.confidence : null).filter((value): value is number => typeof value === "number");
    const avgConfidence = confidences.length ? confidences.reduce((total, value) => total + value, 0) / confidences.length : 0;
    return {
      sessions: response.sessions,
      stats: {
        total: response.total,
        active: response.sessions.filter((session) => session.status === "active").length,
        resolved: response.sessions.filter((session) => session.status === "resolved").length,
        avgConfidence
      }
    };
  } catch {
    return { sessions: [], stats: { total: 0, active: 0, resolved: 0, avgConfidence: 0 } };
  }
}

export default async function SessionsPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/auth/login");
  const dataSet = await loadSessions(data.session.access_token);

  return (
    <div>
      <AppTopbar title="Sessions" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Total", value: String(dataSet.stats.total) },
            { label: "Active", value: String(dataSet.stats.active) },
            { label: "Resolved", value: String(dataSet.stats.resolved) },
            { label: "Avg Confidence", value: `${Math.round(dataSet.stats.avgConfidence * 100)}%` }
          ].map((card) => (
            <div key={card.label} className="rounded-xl border bg-card p-3">
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
            </div>
          ))}
        </div>
        <SessionList sessions={dataSet.sessions} isLoading={false} />
      </div>
    </div>
  );
}

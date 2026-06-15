import { redirect } from "next/navigation";

import { AppTopbar } from "@/components/app-topbar";
import { DiagnosticStatePanel } from "@/components/diagnostic-state-panel";
import { SupportMessage } from "@/components/support-message";
import { apiFetch, getSession } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { ProductDetailResponse, SessionDetailResponse, SessionMessage } from "@/lib/types/api";
import type { DiagnosticState } from "@/lib/types/diagnostic";
import { formatDate } from "@/lib/utils";

interface SessionDetailPageProps {
  params: {
    sessionId: string;
  };
}

interface SourceSummary {
  title: string;
  count: number;
}

type EvidenceCandidate = {
  title?: unknown;
};

function isDiagnosticState(value: SessionDetailResponse["diagnostic_state"]): value is DiagnosticState {
  return "confidence" in value && "hypotheses" in value;
}

function resolutionMessage(messages: SessionMessage[]): SessionMessage | null {
  return [...messages].reverse().find((message) => message.role === "system" && message.content_type === "state_update") ?? null;
}

function evidenceItems(message: SessionMessage): EvidenceCandidate[] {
  try {
    const parsed = JSON.parse(message.content) as { output?: unknown };
    return Array.isArray(parsed.output) ? parsed.output.filter((item): item is EvidenceCandidate => typeof item === "object" && item !== null) : [];
  } catch {
    return [];
  }
}

function sourceSummary(messages: SessionMessage[]): SourceSummary[] {
  const counts = new Map<string, number>();
  messages.filter((message) => message.role === "tool").forEach((message) => {
    evidenceItems(message).forEach((item) => {
      if (typeof item.title === "string" && item.title.trim()) counts.set(item.title, (counts.get(item.title) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries()).map(([title, count]) => ({ title, count }));
}

async function loadProductName(productId: string | null, token: string): Promise<string | null> {
  if (!productId) return null;
  try {
    const product = await apiFetch<ProductDetailResponse>(`/api/v1/products/${productId}`, undefined, token);
    return product.name;
  } catch {
    return null;
  }
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) redirect("/auth/login");
  const session = await getSession(params.sessionId, data.session.access_token);
  const state = isDiagnosticState(session.diagnostic_state) ? session.diagnostic_state : null;
  const resolvedMessage = resolutionMessage(session.messages);
  const sources = sourceSummary(session.messages);
  const productName = await loadProductName(session.product_id, data.session.access_token);

  return (
    <div>
      <AppTopbar title={session.messages.find((message) => message.role === "user")?.content.slice(0, 48) || "Session Detail"} />
      <div className="space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0 rounded-xl border bg-background">
            {session.status === "resolved" && resolvedMessage ? (
              <div className="border-b border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                <span className="font-medium">Resolved:</span> {resolvedMessage.content} <span className="text-success/80">on {formatDate(resolvedMessage.created_at)}</span>
              </div>
            ) : null}
            {session.status === "escalated" ? (
              <div className="border-b border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
                <span className="font-medium">Escalated:</span> Human support has been requested for this session.
              </div>
            ) : null}
            <div className="space-y-4 p-4">
              <div className="text-sm font-medium text-muted-foreground">{productName ?? "Product support"}</div>
              {session.messages.filter((message) => message.role !== "system").map((message) => (
                <SupportMessage key={message.id} message={message} />
              ))}
            </div>
          </section>
          <div className="min-h-[620px] overflow-hidden rounded-xl border">
            <DiagnosticStatePanel diagnosticState={state} currentPhase={session.current_phase} isStreaming={false} activeToolName={null} />
          </div>
        </div>

        {sources.length ? (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Knowledge sources consulted</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sources.map((source) => (
                <div key={source.title} className="rounded-lg border bg-muted p-3">
                  <div className="truncate text-sm font-medium text-foreground">{source.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{source.count} chunks referenced</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

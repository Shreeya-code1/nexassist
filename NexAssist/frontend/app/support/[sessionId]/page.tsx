"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DiagnosticStatePanel } from "@/components/diagnostic-state-panel";
import { SupportComposer } from "@/components/support-composer";
import { SupportMessage } from "@/components/support-message";
import { apiFetch, resolveSession } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { ProductDetailResponse, SessionMessage } from "@/lib/types/api";
import type { DiagnosticState } from "@/lib/types/diagnostic";
import { useSession, useStreamAgent } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function statusClass(status: string): string {
  if (status === "active") return "bg-blue-500/10 text-blue-600";
  if (status === "resolved") return "bg-green-500/10 text-green-600";
  if (status === "escalated") return "bg-amber-400/10 text-amber-600";
  return "bg-muted text-muted-foreground";
}

function streamingMessage(sessionId: string, content: string): SessionMessage {
  return {
    id: "streaming",
    session_id: sessionId,
    role: "assistant",
    content,
    content_type: "text",
    metadata: {},
    created_at: new Date().toISOString()
  };
}

export default function SupportSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { session, messages, diagnosticState: loadedState, isLoading, mutate } = useSession(sessionId);
  const streamAgent = useStreamAgent();
  const [resolving, setResolving] = useState<boolean>(false);
  const product = useSWR<ProductDetailResponse, Error>(
    session?.product_id ? ["support-product", session.product_id] : null,
    async ([, productId]: readonly [string, string]) => apiFetch<ProductDetailResponse>(`/api/v1/products/${productId}`, undefined, await token()),
    { revalidateOnFocus: false }
  );

  const activeState: DiagnosticState | null = streamAgent.diagnosticState ?? loadedState;
  const currentPhase = streamAgent.currentPhase || session?.current_phase || "intake";
  const displayMessages = useMemo(() => messages.filter((message) => message.role !== "system"), [messages]);
  const latestAssistantMessageId = useMemo(() => [...displayMessages].reverse().find((message) => message.role === "assistant")?.id ?? null, [displayMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, streamAgent.streamingText]);

  async function handleSend(message: string, mediaIds: string[]): Promise<void> {
    await streamAgent.stream(sessionId, message, mediaIds, async () => {
      await mutate();
    });
  }

  async function handleResolve(): Promise<void> {
    if (!session || session.status !== "active") return;
    setResolving(true);
    try {
      await resolveSession(session.id, { resolution_summary: "Resolved by user", final_cause: null }, await token());
      await mutate();
    } finally {
      setResolving(false);
    }
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/support" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{product.data?.name ?? "Product support"}</div>
              {session ? <div className="text-xs text-muted-foreground">{session.id}</div> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass(session.status))}>{session.status}</span> : null}
            <button type="button" disabled={!session || session.status !== "active" || resolving} onClick={() => void handleResolve()} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50">
              {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Resolve
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading session
            </div>
          ) : null}

          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {displayMessages.map((message) => (
              <SupportMessage key={message.id} message={message} evidence={message.id === latestAssistantMessageId ? streamAgent.evidence : []} />
            ))}
            {streamAgent.streamingText ? <SupportMessage message={streamingMessage(sessionId, streamAgent.streamingText)} isStreaming streamingText={streamAgent.streamingText} evidence={streamAgent.evidence} /> : null}
            {streamAgent.error ? <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{streamAgent.error}</div> : null}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t bg-background p-3">
          <div className="mx-auto max-w-4xl">
            <SupportComposer sessionId={sessionId} isStreaming={streamAgent.isStreaming} onSend={handleSend} onMessageSent={() => void mutate()} />
          </div>
        </div>
      </section>

      <div className="hidden lg:block">
        <DiagnosticStatePanel diagnosticState={activeState} currentPhase={currentPhase} isStreaming={streamAgent.isStreaming} activeToolName={streamAgent.activeToolName} />
      </div>
    </main>
  );
}

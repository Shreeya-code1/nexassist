"use client";

import { useCallback, useState } from "react";
import useSWR, { type KeyedMutator } from "swr";

import { API_BASE_URL } from "@/lib/constants";
import { getSession } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { SessionDetailResponse, SessionMessage } from "@/lib/types/api";
import type { AgentStreamEvent, DiagnosticState, EvidenceItem } from "@/lib/types/diagnostic";

type ToolOutput = Record<string, unknown> | Record<string, unknown>[] | string | null;

export interface ToolActivityItem {
  tool_name: string;
  input: Record<string, unknown>;
  output: ToolOutput;
  latency_ms: number | null;
  status: "running" | "completed";
}

export interface UseSessionResult {
  session: SessionDetailResponse | undefined;
  messages: SessionMessage[];
  diagnosticState: DiagnosticState | null;
  isLoading: boolean;
  mutate: KeyedMutator<SessionDetailResponse>;
}

export interface UseStreamAgentResult {
  stream: (sessionId: string, message: string, mediaIds: string[], onComplete?: () => void | Promise<void>) => Promise<void>;
  isStreaming: boolean;
  error: string | null;
  activeToolName: string | null;
  toolActivity: ToolActivityItem[];
  diagnosticState: DiagnosticState | null;
  currentPhase: string;
  streamingText: string;
  evidence: EvidenceItem[];
  reset: () => void;
}

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function isDiagnosticState(value: SessionDetailResponse["diagnostic_state"]): value is DiagnosticState {
  return "confidence" in value && "hypotheses" in value;
}

function parseSsePayload(payload: string): AgentStreamEvent | null {
  if (payload === "[DONE]") return null;
  return JSON.parse(payload) as AgentStreamEvent;
}

export function useSession(sessionId: string | null): UseSessionResult {
  const result = useSWR<SessionDetailResponse, Error>(
    sessionId ? ["session", sessionId] : null,
    async ([, id]: readonly [string, string]) => getSession(id, await token()),
    { revalidateOnFocus: false }
  );

  const diagnosticState = result.data && isDiagnosticState(result.data.diagnostic_state) ? result.data.diagnostic_state : null;

  return {
    session: result.data,
    messages: result.data?.messages ?? [],
    diagnosticState,
    isLoading: result.isLoading,
    mutate: result.mutate
  };
}

export function useStreamAgent(): UseStreamAgentResult {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [toolActivity, setToolActivity] = useState<ToolActivityItem[]>([]);
  const [diagnosticState, setDiagnosticState] = useState<DiagnosticState | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>("intake");
  const [streamingText, setStreamingText] = useState<string>("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  const reset = useCallback((): void => {
    setError(null);
    setActiveToolName(null);
    setToolActivity([]);
    setStreamingText("");
    setEvidence([]);
  }, []);

  const dispatchEvent = useCallback(async (event: AgentStreamEvent, onComplete?: () => void | Promise<void>): Promise<void> => {
    if (event.type === "tool.started") {
      setActiveToolName(event.tool_name);
      setToolActivity((items) => [
        ...items,
        { tool_name: event.tool_name, input: event.input, output: null, latency_ms: null, status: "running" }
      ]);
      return;
    }

    if (event.type === "tool.completed") {
      setActiveToolName(null);
      setToolActivity((items) => {
        const next = [...items];
        const index = [...next].reverse().findIndex((item) => item.tool_name === event.tool_name && item.status === "running");
        const targetIndex = index === -1 ? next.length - 1 : next.length - 1 - index;
        if (targetIndex >= 0) {
          next[targetIndex] = { ...next[targetIndex], output: event.output, latency_ms: event.latency_ms, status: "completed" };
        }
        return next;
      });
      return;
    }

    if (event.type === "state.updated") {
      setDiagnosticState(event.diagnostic_state);
      setCurrentPhase(event.current_phase);
      return;
    }

    if (event.type === "message.delta") {
      setStreamingText((text) => `${text}${event.delta}`);
      return;
    }

    if (event.type === "message.completed") {
      setStreamingText("");
      setEvidence(event.evidence);
      await onComplete?.();
      return;
    }

    setError(event.detail);
  }, []);

  const stream = useCallback(async (sessionId: string, message: string, mediaIds: string[], onComplete?: () => void | Promise<void>): Promise<void> => {
    reset();
    setIsStreaming(true);
    try {
      const accessToken = await token();
      const response = await fetch(`${API_BASE_URL}/api/v1/agent/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ session_id: sessionId, message, media_ids: mediaIds })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({ detail: response.statusText }))) as { detail: string };
        throw new Error(body.detail);
      }

      if (!response.body) {
        throw new Error("Streaming response was empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reading = true;

      while (reading) {
        const { value, done } = await reader.read();
        reading = !done;
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const event = parseSsePayload(line.replace("data: ", "").trim());
          if (event) await dispatchEvent(event, onComplete);
        }
      }
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unable to stream assistant response";
      setError(detail);
    } finally {
      setActiveToolName(null);
      setIsStreaming(false);
    }
  }, [dispatchEvent, reset]);

  return { stream, isStreaming, error, activeToolName, toolActivity, diagnosticState, currentPhase, streamingText, evidence, reset };
}

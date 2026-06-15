export enum DiagnosticPhase {
  INTAKE = "intake",
  INVESTIGATION = "investigation",
  HYPOTHESIS = "hypothesis",
  DIAGNOSIS = "diagnosis",
  RESOLVED = "resolved"
}

export interface Hypothesis {
  cause: string;
  likelihood: "low" | "medium" | "high";
  evidence: string[];
}

export interface EliminatedCause {
  cause: string;
  reason: string;
}

export interface PerformedStep {
  step: string;
  result: string;
  timestamp?: string;
}

export interface RecommendedNextStep {
  instruction: string;
  reason: string;
  risk_level: "low" | "medium" | "high";
}

export interface DiagnosticState {
  id?: string;
  session_id?: string;
  observed_symptoms: string[];
  known_context: Record<string, unknown>;
  hypotheses: Hypothesis[];
  eliminated_causes: EliminatedCause[];
  performed_steps: PerformedStep[];
  recommended_next_step: RecommendedNextStep | null;
  confidence: number;
  state_version?: number;
  created_at?: string;
  updated_at?: string;
}

export type AgentStreamEvent =
  | { type: "message.delta"; delta: string }
  | { type: "tool.started"; tool_name: string; input: Record<string, unknown> }
  | { type: "tool.completed"; tool_name: string; output: Record<string, unknown> | Record<string, unknown>[] | string | null; latency_ms: number }
  | { type: "state.updated"; diagnostic_state: DiagnosticState | null; current_phase: string }
  | { type: "message.completed"; answer: string; evidence: EvidenceItem[] }
  | { type: "error"; detail: string };

export interface EvidenceItem {
  manual_id: string;
  chunk_id: string;
  title: string;
  page_start: number | null;
  page_end: number | null;
  score: number;
}

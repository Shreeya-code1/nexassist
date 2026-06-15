"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

import type { DiagnosticState, Hypothesis } from "@/lib/types/diagnostic";
import { cn, phaseToLabel } from "@/lib/utils";

interface DiagnosticStatePanelProps {
  diagnosticState: DiagnosticState | null;
  currentPhase: string;
  isStreaming: boolean;
  activeToolName: string | null;
}

const phases = ["intake", "investigation", "hypothesis", "diagnosis"] as const;

function confidenceColor(confidence: number): string {
  if (confidence < 0.3) return "bg-zinc-400";
  if (confidence < 0.6) return "bg-amber-400";
  if (confidence < 0.8) return "bg-blue-400";
  return "bg-green-500";
}

function likelihoodClass(likelihood: Hypothesis["likelihood"]): string {
  if (likelihood === "high") return "bg-green-500/10 text-green-600";
  if (likelihood === "medium") return "bg-amber-400/10 text-amber-600";
  return "bg-muted text-muted-foreground";
}

function toolLabel(toolName: string): string {
  if (toolName === "search_manual_evidence") return "Searching manuals...";
  if (toolName === "inspect_uploaded_media") return "Analyzing image...";
  if (toolName === "update_diagnostic_state") return "Updating diagnosis...";
  if (toolName === "escalate_to_human_support") return "Escalating support...";
  return "Working...";
}

export function DiagnosticStatePanel({ diagnosticState, currentPhase, isStreaming, activeToolName }: DiagnosticStatePanelProps) {
  const confidence = diagnosticState?.confidence ?? 0;
  const normalizedPhase = currentPhase.toLowerCase();
  const activeIndex = Math.max(0, phases.findIndex((phase) => phase === normalizedPhase));
  const hypotheses = diagnosticState?.hypotheses ?? [];
  const eliminatedCauses = diagnosticState?.eliminated_causes ?? [];

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l bg-card p-5">
      <div>
        <div className="text-sm font-semibold text-foreground">Diagnostic Phase</div>
        <div className="mt-5 space-y-0">
          {phases.map((phase, index) => {
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;
            return (
              <div key={phase} className="relative flex gap-3 pb-6 last:pb-0">
                {index < phases.length - 1 ? <div className="absolute left-3 top-6 h-full w-px bg-border" /> : null}
                <div className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px]", isActive ? "bg-primary text-primary-foreground" : isComplete ? "bg-primary/30 text-primary" : "border border-border bg-card text-muted-foreground")}>
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : null}
                </div>
                <div className={cn("text-sm", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>{phaseToLabel(phase)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Confidence</span>
          <span className="text-muted-foreground">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div className={cn("h-full rounded-full", confidenceColor(confidence))} animate={{ width: `${Math.max(0, Math.min(100, confidence * 100))}%` }} transition={{ type: "spring", stiffness: 150, damping: 22 }} />
        </div>
      </div>

      {hypotheses.length > 0 ? (
        <div className="mt-7">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Hypotheses</div>
          <div className="mt-3 space-y-3">
            {hypotheses.map((hypothesis) => (
              <motion.div key={hypothesis.cause} layout className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{hypothesis.cause}</div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", likelihoodClass(hypothesis.likelihood))}>{hypothesis.likelihood}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{hypothesis.evidence.length} supporting points</div>
                <div className="mt-3 h-1 rounded-full bg-muted">
                  <motion.div layout className="h-1 rounded-full bg-primary" style={{ width: `${hypothesis.likelihood === "high" ? 90 : hypothesis.likelihood === "medium" ? 58 : 28}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {eliminatedCauses.length > 0 ? (
        <div className="mt-7">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ruled Out</div>
          <div className="mt-3 space-y-2">
            {eliminatedCauses.map((item) => (
              <div key={item.cause} title={item.reason} className="text-sm text-muted-foreground line-through">
                {item.cause}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <AnimatePresence>
          {isStreaming && activeToolName ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {toolLabel(activeToolName)}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </aside>
  );
}

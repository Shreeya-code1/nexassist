"use client";

import { motion } from "framer-motion";

import { EvidencePanel } from "@/components/evidence-panel";
import type { SessionMessage } from "@/lib/types/api";
import type { EvidenceItem } from "@/lib/types/diagnostic";
import { cn, formatDate } from "@/lib/utils";

interface SupportMessageProps {
  message: SessionMessage;
  isStreaming?: boolean;
  streamingText?: string;
  evidence?: EvidenceItem[];
}

function toolLabel(content: string): string {
  const fallback = "Updated diagnostic context";
  try {
    const parsed = JSON.parse(content) as { output?: unknown };
    if (Array.isArray(parsed.output)) return `Searched ${parsed.output.length} manual sections`;
    return fallback;
  } catch {
    return fallback;
  }
}

export function SupportMessage({ message, isStreaming = false, streamingText = "", evidence = [] }: SupportMessageProps) {
  if (message.role === "tool") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
        <div className="rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">{toolLabel(message.content)}</div>
      </motion.div>
    );
  }

  const isUser = message.role === "user";
  const content = isStreaming ? streamingText : message.content;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className={cn("max-w-[70%] px-4 py-3 text-sm leading-6", isUser ? "rounded-2xl rounded-tr-sm bg-primary text-primary-foreground" : "rounded-2xl rounded-tl-sm border bg-card text-foreground")}>
        {content}
        {isStreaming ? <span className="ml-0.5 animate-pulse">|</span> : null}
      </div>
      <div className={cn("mt-1 text-xs text-muted-foreground", isUser ? "mr-1" : "ml-1")}>{formatDate(message.created_at)}</div>
      {!isUser ? <EvidencePanel evidence={evidence} /> : null}
    </motion.div>
  );
}

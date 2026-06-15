"use client";

import type { EvidenceItem } from "@/lib/types/diagnostic";
import { cn } from "@/lib/utils";

type EvidenceCardItem = EvidenceItem & {
  text_preview?: string;
};

interface EvidencePanelProps {
  evidence: EvidenceItem[];
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  if (evidence.length === 0) return null;

  return (
    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
      {evidence.map((item) => {
        const card = item as EvidenceCardItem;
        const preview = card.text_preview ?? "";
        return (
          <div key={card.chunk_id} className="relative min-w-56 rounded-lg border bg-muted p-3">
            <div className="truncate text-xs font-medium text-foreground">{card.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">Page {card.page_start ?? "unknown"}</div>
            {preview ? <div className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">{preview.slice(0, 80)}</div> : null}
            <div className="mt-3 h-1 rounded-full bg-border">
              <div className={cn("h-1 rounded-full bg-primary/40")} style={{ width: `${Math.max(0, Math.min(100, card.score * 100))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

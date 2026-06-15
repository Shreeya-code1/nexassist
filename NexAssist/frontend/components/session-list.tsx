"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FileX } from "lucide-react";

import type { SessionListItem } from "@/lib/types/api";
import { cn, formatRelativeTime, phaseToLabel } from "@/lib/utils";

type Session = SessionListItem;

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onStatusFilter?: (s: string) => void;
  activeFilter?: string;
}

const filters = ["all", "active", "resolved", "escalated", "abandoned"] as const;

const severityClasses: Record<string, string> = {
  unknown: "bg-zinc-500",
  low: "bg-sky-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

const statusClasses: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600",
  resolved: "bg-green-500/10 text-green-600",
  escalated: "bg-amber-400/10 text-amber-600",
  abandoned: "bg-zinc-500/10 text-zinc-600"
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[1.4fr_1fr_.7fr_.8fr_.7fr_.8fr_40px] items-center gap-4 border-b px-4 py-4 last:border-b-0">
          {Array.from({ length: 7 }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </>
  );
}

export function SessionList({ sessions, isLoading, onStatusFilter, activeFilter }: SessionListProps) {
  const router = useRouter();
  const [localFilter, setLocalFilter] = useState<string>(activeFilter ?? "all");
  const currentFilter = activeFilter ?? localFilter;
  const filteredSessions = useMemo(() => currentFilter === "all" ? sessions : sessions.filter((session) => session.status === currentFilter), [currentFilter, sessions]);

  function setFilter(filter: string): void {
    setLocalFilter(filter);
    onStatusFilter?.(filter);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap gap-2 border-b p-3">
        {filters.map((filter) => (
          <button key={filter} type="button" onClick={() => setFilter(filter)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", currentFilter === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {phaseToLabel(filter)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.4fr_1fr_.7fr_.8fr_.7fr_.8fr_40px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Issue</span>
            <span>Product</span>
            <span>Severity</span>
            <span>Phase</span>
            <span>Status</span>
            <span>Last Activity</span>
            <span>→</span>
          </div>
          {isLoading ? <SkeletonRows /> : null}
          {!isLoading && filteredSessions.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center">
              <FileX className="h-10 w-10 text-muted-foreground" />
              <div className="mt-3 text-sm font-medium text-foreground">No sessions found</div>
            </div>
          ) : null}
          {!isLoading && filteredSessions.map((session, index) => (
            <motion.button
              key={session.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: index * 0.04 }}
              onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
              className="grid w-full grid-cols-[1.4fr_1fr_.7fr_.8fr_.7fr_.8fr_40px] items-center gap-4 border-b px-4 py-4 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <span className={cn("truncate", session.title ? "font-medium text-foreground" : "italic text-muted-foreground")}>{session.title ?? "Untitled session"}</span>
              <span className="truncate text-muted-foreground">{session.product_name ?? "Unknown product"}</span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", severityClasses[session.severity] ?? severityClasses.unknown)} />
                {session.severity}
              </span>
              <span><span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{phaseToLabel(session.current_phase)}</span></span>
              <span><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClasses[session.status] ?? statusClasses.abandoned)}>{session.status}</span></span>
              <span className="text-muted-foreground">{formatRelativeTime(session.updated_at)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

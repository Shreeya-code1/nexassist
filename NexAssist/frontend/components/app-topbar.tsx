"use client";

import { Bell, UserCircle, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

interface AppTopbarProps {
  title: string;
}

interface StatCard {
  label: string;
  value: string;
  trend?: boolean;
}

interface DashboardStatCardsProps {
  stats: StatCard[];
}

export function AppTopbar({ title }: AppTopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-black/40 px-6 backdrop-blur-md">
      <h1 className="text-lg font-medium text-white/90">{title}</h1>
      <div className="flex items-center gap-4">
        <button type="button" className="rounded-md p-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white/90">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-glow-sm ring-1 ring-violet-500/40">
          <UserCircle className="h-5 w-5" />
        </div>
      </div>
    </header>
  );
}

export function DashboardStatCards({ stats }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.05 }} className="group relative overflow-hidden rounded-xl p-5 glass transition-all duration-200 hover:glow-border">
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/5 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-3xl font-bold text-gradient">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
            {stat.trend ? <ArrowUpRight className="h-5 w-5 text-cyan-300" /> : null}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

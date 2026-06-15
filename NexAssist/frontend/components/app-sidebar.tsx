"use client";

import type { User } from "@supabase/supabase-js";
import { BookOpen, LayoutDashboard, LogOut, MessageSquare, Package, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn, getInitials } from "@/lib/utils";

interface AppSidebarProps {
  user: User;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/manuals", label: "Manuals", icon: BookOpen },
  { href: "/dashboard/sessions", label: "Sessions", icon: MessageSquare },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const email = user.email ?? "user@nexassist.local";

  async function signOut(): Promise<void> {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/login");
  }

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-white/5 bg-[#030608] text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="font-display text-base font-bold tracking-tight text-gradient-fest">Kairo</div>
        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-[pulse-glow_2s_ease-in-out_infinite]" />
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs font-medium text-cyan-300">Beta</div>
      </div>
      <nav className="flex-1 px-3 py-5">
        <div className="mb-1 px-4 text-xs tracking-widest text-sidebar-foreground/40">WORKSPACE</div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("relative flex items-center gap-3 rounded-md px-4 py-2 text-sm transition-all duration-150 hover:bg-white/5", active ? "border border-violet-500/30 bg-violet-600/20 text-violet-300 shadow-glow-sm" : "text-sidebar-foreground/80")}>
                {active ? <span className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-violet-400" /> : null}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="glass flex items-center gap-3 rounded-xl p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-violet-500/40">{getInitials(email)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-sidebar-foreground/60">{email}</div>
            <button onClick={signOut} type="button" className="mt-2 flex items-center gap-2 rounded-md px-0 py-1 text-xs text-sidebar-foreground/70 transition-colors hover:text-white">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

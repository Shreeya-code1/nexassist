"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Package, Search, Sparkles, Zap, ShieldCheck, Bot } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { DEMO_COMPANY_ID } from "@/lib/constants";
import type { ProductListItem, ProductListResponse } from "@/lib/types/api";

const STATS = [
  { label: "Products supported", value: "120+" },
  { label: "Issues diagnosed", value: "8.4K" },
  { label: "Avg. response time", value: "<10s" },
  { label: "Resolution rate", value: "94%" }
];

const FEATURES = [
  {
    icon: Bot,
    title: "AI Diagnostics",
    description: "Conversational troubleshooting that narrows down root causes in real time."
  },
  {
    icon: Zap,
    title: "Instant Answers",
    description: "No tickets, no waiting. Get step-by-step fixes the moment you ask."
  },
  {
    icon: ShieldCheck,
    title: "Manufacturer Verified",
    description: "Backed by official manuals and product data from supported brands."
  }
];

function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link href={`/support?product=${product.id}`} className="group block rounded-xl p-3 glass transition-all duration-200 hover:scale-[1.02] hover:glow-border">
      <div className="flex aspect-square items-center justify-center rounded-xl bg-white/[0.03] transition-colors group-hover:bg-violet-600/10">
        <Package className="h-8 w-8 text-muted-foreground group-hover:text-cyan-300" />
      </div>
      <div className="mt-3 text-center text-sm font-medium text-white/90">{product.name}</div>
      <div className="mt-1 text-center text-xs text-muted-foreground">{product.category ?? "Other"}</div>
    </Link>
  );
}

export default function LandingPage() {
  const [query, setQuery] = useState<string>("");
  const products = useSWR<ProductListResponse, Error>(
    DEMO_COMPANY_ID ? ["demo-products", DEMO_COMPANY_ID] : null,
    async ([, companyId]: readonly [string, string]) => apiFetch<ProductListResponse>(`/api/v1/products/companies/${companyId}/products`),
    { revalidateOnFocus: false }
  );
  const filteredProducts = useMemo(() => (products.data?.products ?? []).filter((product) => product.name.toLowerCase().includes(query.toLowerCase())), [products.data?.products, query]);

  return (
    <main className="min-h-screen overflow-hidden bg-background font-sans">
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-black/60 px-6 backdrop-blur">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-gradient-fest">Kairo</Link>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-white/55 transition-colors hover:text-white/90">Sign in</Link>
          <Link href="/auth/signup" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/5">Company Portal</Link>
        </div>
      </nav>

      <section className="grid-bg relative flex min-h-[75vh] items-center justify-center px-6 py-20">
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-fest-violet/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-fest-cyan/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fest-pink/15 blur-[110px]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="inline-flex items-center gap-2 rounded-full border-violet-500/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-300 glass">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Product Support
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="mt-6 font-display text-5xl font-bold tracking-tight text-gradient-fest sm:text-6xl md:text-7xl">
            Get expert help for any product
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.2 }} className="mx-auto mt-5 max-w-md text-lg text-white/60">
            Describe your issue. Our AI diagnoses it like a trained technician.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }} className="mt-8 flex justify-center gap-3">
            <Link href="/support" className="btn-fest rounded-full px-8 py-2.5 text-sm font-semibold text-white shadow-glow-fest transition-transform duration-150 hover:scale-[1.03]">Get Support</Link>
            <Link href="/auth/signup" className="rounded-full border border-white/10 bg-white/[0.03] px-8 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/5">For Companies</Link>
          </motion.div>
        </div>
      </section>

      <section className="relative border-y border-white/5 bg-white/[0.02] px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }} className="text-center">
              <div className="font-display text-3xl font-bold text-gradient-fest sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-white/90 sm:text-3xl">Why teams choose Kairo</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.08 }} className="rounded-xl p-6 glass transition-all duration-200 hover:glow-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/20 to-cyan-400/10 text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-semibold text-white/90">{feature.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{feature.description}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-2xl font-semibold text-white/90">Supported Products</h2>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filteredProducts.length === 0 ? <div className="mt-8 rounded-xl p-8 text-center text-sm text-muted-foreground glass">No supported products found</div> : null}
      </section>

      <footer className="relative border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="font-display font-semibold text-gradient-fest">Kairo</div>
          <div>&copy; {new Date().getFullYear()} Kairo. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

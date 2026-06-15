"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" autoComplete="email" required className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} required className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20" />
        {mode === "login" ? <Link href="/auth/login" className="block text-right text-xs text-muted-foreground transition-colors hover:text-foreground">Forgot password?</Link> : null}
        <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <div className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <Link href={mode === "login" ? "/auth/signup" : "/auth/login"} className="font-medium text-primary transition-colors hover:text-primary/80">
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </div>
    </motion.div>
  );
}

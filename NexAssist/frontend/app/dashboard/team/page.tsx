"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppTopbar } from "@/components/app-topbar";
import { useCompany } from "@/hooks/use-company";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { CompanyMemberCreateResponse, CompanyMembersResponse } from "@/lib/types/api";
import type { CompanyMember } from "@/lib/types/product";
import { cn, formatDate, getInitials, phaseToLabel } from "@/lib/utils";

async function token(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const roleClasses: Record<CompanyMember["role"], string> = {
  owner: "bg-purple-500/10 text-purple-600",
  admin: "bg-blue-500/10 text-blue-600",
  support_agent: "bg-teal-500/10 text-teal-600",
  viewer: "bg-zinc-500/10 text-zinc-600"
};

export default function TeamPage() {
  const { companyId } = useCompany();
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<"admin" | "support_agent" | "viewer">("support_agent");
  const [inviting, setInviting] = useState<boolean>(false);
  const members = useSWR<CompanyMembersResponse, Error>(
    companyId ? ["company-members", companyId] : null,
    async ([, id]: readonly [string, string]) => apiFetch<CompanyMembersResponse>(`/api/v1/companies/${id}/members`, undefined, await token()),
    { revalidateOnFocus: false }
  );

  async function invite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!companyId || !email.trim()) return;
    setInviting(true);
    try {
      await apiFetch<CompanyMemberCreateResponse>(`/api/v1/companies/${companyId}/members`, { method: "POST", body: JSON.stringify({ email, role }) }, await token());
      setEmail("");
      toast.success("Invitation sent");
      await members.mutate();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to invite member";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div>
      <AppTopbar title="Team" />
      <div className="space-y-6 p-6">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[52px_1fr_1.4fr_.8fr_.8fr_.7fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span />
            <span>Full name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {members.isLoading ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading members</div>
          ) : null}
          {(members.data?.members ?? []).map((member) => (
            <div key={member.id} className="grid grid-cols-[52px_1fr_1.4fr_.8fr_.8fr_.7fr] items-center gap-4 border-b px-4 py-3 text-sm last:border-b-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{getInitials(member.full_name || member.email)}</div>
              <div className="truncate font-medium text-foreground">{member.full_name || "Invited user"}</div>
              <div className="truncate text-muted-foreground">{member.email}</div>
              <div><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", roleClasses[member.role])}>{phaseToLabel(member.role)}</span></div>
              <div className="text-muted-foreground">{formatDate(member.created_at)}</div>
              <button type="button" disabled={member.role === "owner"} onClick={() => toast("Member removal coming soon")} className="w-fit rounded-md border border-destructive px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground">
                Remove
              </button>
            </div>
          ))}
          {!members.isLoading && (members.data?.members ?? []).length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No members found</div> : null}
        </div>

        <form onSubmit={(event) => void invite(event)} className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Invite Member</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@company.com" className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={role} onChange={(event) => setRole(event.target.value as "admin" | "support_agent" | "viewer")} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="admin">Admin</option>
              <option value="support_agent">Support Agent</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" disabled={inviting} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

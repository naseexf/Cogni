import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarStyle } from "@/lib/avatar-color";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/constants";
import {
  createTeamMember,
  updateMemberRole,
  deleteTeamMember,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  const membersQ = useQuery({
    queryKey: ["settings-members"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        // admin wins if there are multiple rows
        if (r.role === "admin" || !roleMap.get(r.user_id)) roleMap.set(r.user_id, r.role);
      });
      return (profiles ?? []).map((p) => ({ ...p, role: (roleMap.get(p.id) ?? "member") as "admin" | "member" }));
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);

  const updateRoleFn = useServerFn(updateMemberRole);
  const deleteMemberFn = useServerFn(deleteTeamMember);

  const changeRole = async (userId: string, role: "admin" | "member") => {
    try {
      await updateRoleFn({ data: { user_id: userId, role } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["settings-members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update role");
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteMemberFn({ data: { user_id: confirmDel.id } });
      toast.success("Team member removed");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["settings-members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove member");
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        <ShieldAlert className="mr-2 h-4 w-4" /> Admin access required
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage users, roles, and portal preferences."
      />

      <SectionCard
        title="User management"
        className="mb-5"
      >
        <p className="mb-3 text-xs text-muted-foreground">Add or remove team members and change their access level.</p>
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setAddOpen(true)} className="brand-gradient">
            <Plus className="mr-1.5 h-4 w-4" /> Invite team member
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(membersQ.data ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs" style={avatarStyle(p.id)}>
                          {initials(p.full_name || p.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{p.full_name || p.email}</div>
                        {p.title && <div className="text-xs text-muted-foreground">{p.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.email}</td>
                  <td className="p-3">
                    <Select
                      value={p.role}
                      onValueChange={(v) => changeRole(p.id, v as "admin" | "member")}
                      disabled={p.id === user?.id}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    {p.id === user?.id && (
                      <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={p.id === user?.id}
                      onClick={() => setConfirmDel({ id: p.id, name: p.full_name || p.email })}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(membersQ.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <GeneralSettings />


      <InviteDialog open={addOpen} onOpenChange={setAddOpen} onDone={() => qc.invalidateQueries({ queryKey: ["settings-members"] })} />

      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove team member?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove <strong>{confirmDel?.name}</strong> from the portal. They will no longer be able to sign in.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: any) {
  const [f, setF] = useState({ full_name: "", email: "", password: "", title: "", phone: "", role: "member" as "admin" | "member" });
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(createTeamMember);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 2) return toast.error("Enter a name");
    if (!f.email.includes("@")) return toast.error("Enter a valid email");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await createFn({
        data: {
          full_name: f.full_name.trim(),
          email: f.email.trim(),
          password: f.password,
          title: f.title || null,
          phone: f.phone || null,
          role: f.role,
        },
      });
      toast.success("Team member invited");
      onDone();
      onOpenChange(false);
      setF({ full_name: "", email: "", password: "", title: "", phone: "", role: "member" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to invite team member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Full name *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
          <div><Label>Email *</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
          <div><Label>Temporary password *</Label><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required placeholder="Share with them privately" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as "admin" | "member" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Creating…" : "Create account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GeneralSettings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ portal_name: string; timezone: string } | null>(null);

  const settingsQ = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const s = settingsQ.data;
  const values = {
    portal_name: draft?.portal_name ?? s?.portal_name ?? "",
    timezone: draft?.timezone ?? s?.timezone ?? "",
  };
  const dirty = !!s && (values.portal_name !== s.portal_name || values.timezone !== s.timezone);

  type SettingsPatch = { portal_name?: string; timezone?: string; email_notifications?: boolean; weekly_digest?: boolean };
  const patch = async (fields: SettingsPatch) => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update(fields).eq("id", s.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["app-settings"] });
  };

  return (
    <SectionCard title="General">
      <p className="mb-4 text-xs text-muted-foreground">Portal-wide preferences. Changes apply to everyone.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Portal name</Label>
          <Input
            value={values.portal_name}
            onChange={(e) => setDraft({ ...values, portal_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Timezone</Label>
          <Input
            value={values.timezone}
            onChange={(e) => setDraft({ ...values, timezone: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Email notifications</div>
            <div className="text-xs text-muted-foreground">Task assignments and announcements.</div>
          </div>
          <Switch
            checked={!!s?.email_notifications}
            onCheckedChange={(v) => patch({ email_notifications: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Weekly digest</div>
            <div className="text-xs text-muted-foreground">Summary of activity every Monday.</div>
          </div>
          <Switch
            checked={!!s?.weekly_digest}
            onCheckedChange={(v) => patch({ weekly_digest: v })}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          className="brand-gradient"
          disabled={!dirty || saving}
          onClick={() => patch({ portal_name: values.portal_name, timezone: values.timezone })}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
        )}
      </div>
    </SectionCard>
  );
}

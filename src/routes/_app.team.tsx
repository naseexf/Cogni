import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { initials } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarStyle } from "@/lib/avatar-color";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Mail, Phone, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createTeamMember, deleteTeamMember } from "@/lib/team.functions";
import { useAuth } from "@/hooks/use-auth";
import { displayUsername } from "@/lib/username";


export const Route = createFileRoute("/_app/team")({ component: TeamPage });

function TeamPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const removeMemberFn = useServerFn(deleteTeamMember);

  const removeMember = async () => {
    if (!confirmDel) return;
    setRemoving(true);
    try {
      await removeMemberFn({ data: { user_id: confirmDel.id } });
      toast.success("Team member removed");
      setConfirmDel(null);
      await qc.invalidateQueries({ queryKey: ["team-profiles"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const profilesQ = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("full_name")).data ?? [],
  });

  return (
    <>
      <PageHeader
        title="Team Directory"
        description="Everyone on the CogniLearn team."
        actions={
          isAdmin ? (
            <Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Add team member</Button>
          ) : null
        }
      />


      {(profilesQ.data ?? []).length === 0 ? (
        <EmptyState icon={Users} title="No team members yet" description="Add your first team member to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(profilesQ.data ?? []).map((p) => {
            return (
              <div key={p.id} className="group relative rounded-lg border bg-card p-4">
                {isAdmin && p.id !== user?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${p.full_name || p.email}`}
                    className="absolute right-2 top-2 h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => setConfirmDel({ id: p.id, name: p.full_name || p.email })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback style={avatarStyle(p.id)}>{initials(p.full_name || p.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{p.full_name || p.email}</p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{p.title || "Team member"}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /><span className="truncate">{displayUsername(p.email)}</span></div>
                  {p.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{p.phone}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove {confirmDel?.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes <strong>{confirmDel?.name}</strong> from the portal. They lose access immediately and are signed out on their device.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={removing} onClick={removeMember}>
              {removing ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddMemberDialog({ open, onOpenChange }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", username: "", password: "", title: "", phone: "", role: "member" as "admin" | "member" });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(createTeamMember);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 2) return toast.error("Enter a name");
    if (!f.username.trim()) return toast.error("Enter a username");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await createFn({
        data: {
          full_name: f.full_name.trim(),
          username: f.username.trim().toLowerCase(),
          password: f.password,
          title: f.title || null,
          phone: f.phone || null,
          role: f.role,
        },
      });
      toast.success("Team member added");
      qc.invalidateQueries({ queryKey: ["team-profiles"] });
      qc.invalidateQueries({ queryKey: ["team-roles"] });
      onOpenChange(false);
      setF({ full_name: "", username: "", password: "", title: "", phone: "", role: "member" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create team member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Full name *</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
          <div>
            <Label>Username *</Label>
            <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="e.g. anas" autoComplete="off" required />
          </div>
          <div>
            <Label>Temporary password *</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} className="pr-10" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title / role</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">They sign in with this username and temporary password — ask them to change it after their first sign-in.</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Creating…" : "Create account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


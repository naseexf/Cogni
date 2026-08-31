import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { fmtRelative, initials } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarStyle } from "@/lib/avatar-color";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Megaphone, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const listQ = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false })).data ?? [],
  });
  const profilesQ = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name")).data ?? [],
  });

  const nameOf = (uid: string | null) => profilesQ.data?.find((p) => p.id === uid)?.full_name ?? "Team";

  const togglePin = async (id: string, pinned: boolean) => {
    const { error } = await supabase.from("announcements").update({ pinned: !pinned }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Team-wide updates and notes."
        actions={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New announcement</Button>}
      />

      {(listQ.data ?? []).length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet"
          description="Post your first team update."
          action={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New announcement</Button>} />
      ) : (
        <ul className="space-y-3">
          {(listQ.data ?? []).map((a) => (
            <li key={a.id} className={`rounded-lg border bg-card p-4 ${a.pinned ? "border-primary/50 bg-primary/5" : ""}`}>
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs" style={avatarStyle(a.author_id)}>{initials(nameOf(a.author_id))}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{nameOf(a.author_id)}</span>
                    {a.pinned && <Badge variant="secondary" className="text-[10px]"><Pin className="mr-1 h-3 w-3" />Pinned</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{fmtRelative(a.created_at)}</span>
                  </div>
                  {a.title && <p className="mt-1 font-medium">{a.title}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
                  {(user?.id === a.author_id || isAdmin) && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => togglePin(a.id, a.pinned)}>
                        <Pin className="mr-1 h-3 w-3" />{a.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                        <Trash2 className="mr-1 h-3 w-3 text-destructive" />Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnnouncementDialog open={addOpen} onOpenChange={setAddOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />
    </>
  );
}

function AnnouncementDialog({ open, onOpenChange, onSaved }: any) {
  const { user } = useAuth();
  const [f, setF] = useState({ title: "", body: "", pinned: false });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.body.trim().length < 2) return toast.error("Add some content");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: f.title || null,
      body: f.body.trim(),
      pinned: f.pinned,
      author_id: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    onSaved(); onOpenChange(false);
    setF({ title: "", body: "", pinned: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Title (optional)</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Body *</Label><Textarea rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />
            Pin to top
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Posting…" : "Post"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Network, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/org")({ component: OrgPage });

interface Node { id: string; label: string; role_title: string | null; parent_id: string | null; person_id: string | null; }

function OrgPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const orgQ = useQuery({
    queryKey: ["org-nodes"],
    queryFn: async () => (await supabase.from("org_nodes").select("*").order("position")).data ?? [],
  });
  const profilesQ = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email,title")).data ?? [],
  });

  const nodes = (orgQ.data ?? []) as Node[];
  const root = nodes.find((n) => !n.parent_id);
  const childrenOf = (id: string) => nodes.filter((n) => n.parent_id === id);

  const remove = async (id: string) => {
    if (!confirm("Delete this node and its children?")) return;
    const { error } = await supabase.from("org_nodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["org-nodes"] });
  };

  const renderNode = (n: Node): React.ReactNode => {
    const kids = childrenOf(n.id);
    const person = profilesQ.data?.find((p) => p.id === n.person_id);
    return (
      <div key={n.id} className="flex flex-col items-center">
        <div className="group relative min-w-40 max-w-56 rounded-lg border bg-card px-4 py-3 text-center shadow-sm">
          <p className="font-medium">{n.label}</p>
          {n.role_title && <p className="text-xs text-muted-foreground">{n.role_title}</p>}
          {person && <p className="mt-1 text-xs text-primary">{person.full_name}</p>}
          {isAdmin && (
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button className="rounded p-1 hover:bg-accent" onClick={() => { setParentForNew(n.id); setAddOpen(true); }} title="Add child">
                <Plus className="h-3 w-3" />
              </button>
              <button className="rounded p-1 hover:bg-accent" onClick={() => remove(n.id)} title="Delete">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          )}
        </div>
        {kids.length > 0 && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="relative flex flex-wrap justify-center gap-6 pt-0">
              <div className="absolute left-0 right-0 top-0 h-px bg-border" />
              {kids.map((k) => (
                <div key={k.id} className="flex flex-col items-center pt-6">
                  <div className="absolute top-0 h-6 w-px bg-border" style={{ transform: "translateY(-24px)" }} />
                  {renderNode(k)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Org Chart"
        description="How the team is structured."
        actions={isAdmin ? (
          <Button onClick={() => { setParentForNew(null); setAddOpen(true); }} className="brand-gradient">
            <Plus className="mr-1.5 h-4 w-4" />{root ? "Add node" : "Create root"}
          </Button>
        ) : null}
      />

      {!root ? (
        <EmptyState icon={Network} title="No org chart yet"
          description="Set up the hierarchy starting from the top."
          action={isAdmin && <Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Create root node</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card p-8">
          <div className="mx-auto flex justify-center">{renderNode(root)}</div>
        </div>
      )}

      <NodeDialog open={addOpen} onOpenChange={setAddOpen} parentId={parentForNew}
        profiles={profilesQ.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["org-nodes"] })} />
    </>
  );
}

function NodeDialog({ open, onOpenChange, parentId, profiles, onSaved }: any) {
  const [f, setF] = useState({ label: "", role_title: "", person_id: "" });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.label.trim().length < 2) return toast.error("Enter a label");
    setBusy(true);
    const { error } = await supabase.from("org_nodes").insert({
      label: f.label.trim(),
      role_title: f.role_title || null,
      parent_id: parentId,
      person_id: f.person_id || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Node added");
    onSaved(); onOpenChange(false);
    setF({ label: "", role_title: "", person_id: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{parentId ? "Add child node" : "Add root node"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Label *</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} required placeholder="e.g. CogniLearn Division" /></div>
          <div><Label>Role / title</Label><Input value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="e.g. Stakeholder Engagement Executive" /></div>
          <div><Label>Assigned person</Label>
            <Select value={f.person_id} onValueChange={(v) => setF({ ...f, person_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

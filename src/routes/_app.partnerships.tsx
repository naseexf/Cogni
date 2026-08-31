import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { STAGES, fmtRelative } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Handshake, Search, Download, X, Pencil, Trash2, Check } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/partnerships")({ component: PartnershipsPage });

function PartnershipsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: partnerships = [], isLoading } = useQuery({
    queryKey: ["partnerships"],
    queryFn: async () => (await supabase.from("partnerships").select("*").order("updated_at", { ascending: false })).data ?? [],
  });

  const filtered = partnerships.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.contact_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (p.tags ?? []).some((t: string) => t.toLowerCase().includes(q.toLowerCase()))
  );

  const setStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("partnerships").update({ stage: stage as any, last_activity_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Stage updated");
    qc.invalidateQueries({ queryKey: ["partnerships"] });
  };

  return (
    <>
      <PageHeader
        title="Partnership Pipeline"
        description="Track every college partnership from prospecting to signed."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full min-w-48 pl-9" />
            </div>
            <Button variant="outline" onClick={() => exportToExcel(
              filtered.map((p: any) => ({
                Name: p.name, Stage: p.stage, Contact: p.contact_name ?? "",
                Phone: p.contact_phone ?? "", Email: p.contact_email ?? "",
                Location: p.location ?? "", Tags: (p.tags ?? []).join(", "),
                Notes: p.notes ?? "", "Last activity": p.last_activity_at ?? "",
                Created: p.created_at ?? "",
              })),
              "partnerships",
            )}><Download className="mr-1.5 h-4 w-4" />Export</Button>
            <Button onClick={() => setAddOpen(true)} className="brand-gradient">
              <Plus className="mr-1.5 h-4 w-4" /> New partnership
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Handshake} title="No partnerships yet"
              description="Add your first college to start tracking the pipeline."
              action={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Add partnership</Button>}
            />
          ) : (
            <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(240px,1fr))` }}>
              {STAGES.map((s) => {
                const items = filtered.filter((p) => p.stage === s.key);
                return (
                  <div
                    key={s.key}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2","ring-primary/50"); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("ring-2","ring-primary/50")}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("ring-2","ring-primary/50");
                      const id = e.dataTransfer.getData("text/partnership-id");
                      const from = e.dataTransfer.getData("text/from-stage");
                      if (id && from !== s.key) setStage(id, s.key);
                    }}
                    className="rounded-lg border bg-muted/30 p-3 transition-shadow"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-8">
                      {items.map((p) => (
                        <button
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/partnership-id", p.id);
                            e.dataTransfer.setData("text/from-stage", p.stage);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => setSelectedId(p.id)}
                          className="w-full cursor-grab rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/50 active:cursor-grabbing"
                        >
                          <div className="font-medium leading-tight">{p.name}</div>
                          {p.contact_name && <div className="mt-1 text-xs text-muted-foreground">{p.contact_name}{p.contact_role ? ` · ${p.contact_role}` : ""}</div>}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(p.tags ?? []).slice(0, 3).map((t: string) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">Updated {fmtRelative(p.last_activity_at)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState icon={Handshake} title="Nothing found" description="Try clearing filters or add a partnership." />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3">College</th><th className="p-3">Stage</th><th className="p-3">Contact</th><th className="p-3">Next action</th><th className="p-3">Updated</th></tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} onClick={() => setSelectedId(p.id)} className="cursor-pointer border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3"><Badge variant="outline">{STAGES.find((s) => s.key === p.stage)?.label}</Badge></td>
                      <td className="p-3 text-muted-foreground">{p.contact_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.next_action || "—"}</td>
                      <td className="p-3 text-muted-foreground">{fmtRelative(p.last_activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PartnershipDialog open={addOpen} onOpenChange={setAddOpen} />
      <PartnershipDetail id={selectedId} onOpenChange={(v) => !v && setSelectedId(null)} onStage={setStage} />
    </>
  );
}

function PartnershipDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", stage: "prospecting", contact_name: "", contact_role: "", contact_email: "", contact_phone: "", next_action: "", tags: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (f.name.trim().length < 2) return setErr("Enter a college name");
    setBusy(true);
    const { error } = await supabase.from("partnerships").insert({
      name: f.name.trim(),
      stage: f.stage as any,
      contact_name: f.contact_name || null,
      contact_role: f.contact_role || null,
      contact_email: f.contact_email || null,
      contact_phone: f.contact_phone || null,
      next_action: f.next_action || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      created_by: user?.id,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Partnership added");
    qc.invalidateQueries({ queryKey: ["partnerships"] });
    onOpenChange(false);
    setF({ name: "", stage: "prospecting", contact_name: "", contact_role: "", contact_email: "", contact_phone: "", next_action: "", tags: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New partnership</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>College name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Stage</Label>
              <Select value={f.stage} onValueChange={(v) => setF({ ...f, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tags (comma separated)</Label><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="TBI, Priority" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact name</Label><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
            <div><Label>Contact role</Label><Input value={f.contact_role} onChange={(e) => setF({ ...f, contact_role: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact email</Label><Input type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div>
            <div><Label>Contact phone</Label><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></div>
          </div>
          <div><Label>Next action</Label><Textarea value={f.next_action} onChange={(e) => setF({ ...f, next_action: e.target.value })} rows={2} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PartnershipDetail({ id, onOpenChange, onStage }: { id: string | null; onOpenChange: (v: boolean) => void; onStage: (id: string, s: string) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [note, setNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [editContact, setEditContact] = useState(false);
  const [cf, setCf] = useState({ contact_name: "", contact_role: "", contact_email: "", contact_phone: "", next_action: "" });
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const p = useQuery({
    queryKey: ["partnership", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("partnerships").select("*").eq("id", id!).maybeSingle()).data,
  });
  const notesQ = useQuery({
    queryKey: ["partnership-notes", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("partnership_notes").select("*").eq("partnership_id", id!).order("created_at", { ascending: false })).data ?? [],
  });
  const tasksQ = useQuery({
    queryKey: ["partnership-tasks", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("tasks").select("id,title,status").eq("partnership_id", id!).order("created_at", { ascending: false })).data ?? [],
  });
  const docsQ = useQuery({
    queryKey: ["partnership-docs", id],
    enabled: !!id,
    queryFn: async () => (await supabase.from("documents").select("id,title,doc_type").eq("partnership_id", id!)).data ?? [],
  });
  const initQ = useQuery({
    queryKey: ["initiatives-lite"],
    queryFn: async () => (await supabase.from("initiatives").select("id,name").order("created_at")).data ?? [],
  });

  const invalidatePart = () => qc.invalidateQueries({ queryKey: ["partnerships"] });

  const bump = async () => {
    if (id) await supabase.from("partnerships").update({ last_activity_at: new Date().toISOString() }).eq("id", id);
  };

  const addNote = async () => {
    if (!note.trim() || !id) return;
    const { error } = await supabase.from("partnership_notes").insert({ partnership_id: id, body: note.trim(), author_id: user?.id });
    if (error) return toast.error(error.message);
    await bump();
    setNote("");
    toast.success("Note added");
    notesQ.refetch();
    invalidatePart();
  };

  const deleteNote = async (noteId: string) => {
    if (!window.confirm("Delete this note?")) return;
    const { error } = await supabase.from("partnership_notes").delete().eq("id", noteId);
    if (error) return toast.error(error.message);
    notesQ.refetch();
  };

  const saveTags = async (tags: string[]) => {
    if (!id) return;
    const { error } = await supabase.from("partnerships").update({ tags, last_activity_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    p.refetch();
    invalidatePart();
  };

  const removeTag = (t: string) => {
    const tags = (p.data?.tags ?? []).filter((x: string) => x !== t);
    saveTags(tags);
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    const existing = p.data?.tags ?? [];
    if (existing.includes(t)) { setNewTag(""); return; }
    saveTags([...existing, t]);
    setNewTag("");
  };

  const startEditContact = () => {
    setCf({
      contact_name: p.data?.contact_name ?? "",
      contact_role: p.data?.contact_role ?? "",
      contact_email: p.data?.contact_email ?? "",
      contact_phone: p.data?.contact_phone ?? "",
      next_action: p.data?.next_action ?? "",
    });
    setEditContact(true);
  };

  const saveContact = async () => {
    if (!id) return;
    const { error } = await supabase.from("partnerships").update({
      contact_name: cf.contact_name || null,
      contact_role: cf.contact_role || null,
      contact_email: cf.contact_email || null,
      contact_phone: cf.contact_phone || null,
      next_action: cf.next_action || null,
      last_activity_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEditContact(false);
    p.refetch();
    invalidatePart();
  };

  const renamePartnership = async () => {
    if (!id) return;
    const next = window.prompt("Rename college", p.data?.name ?? "");
    if (!next || !next.trim() || next.trim() === p.data?.name) return;
    const { error } = await supabase.from("partnerships").update({ name: next.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    p.refetch();
    invalidatePart();
  };

  const deletePartnership = async () => {
    if (!id) return;
    if (!window.confirm(`Delete "${p.data?.name}" and all its notes? Linked tasks/documents remain but will be unlinked.`)) return;
    const { error } = await supabase.from("partnerships").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidatePart();
    onOpenChange(false);
  };

  const renameTask = async (taskId: string, current: string) => {
    const next = window.prompt("Rename task", current);
    if (!next || !next.trim() || next.trim() === current) return;
    const { error } = await supabase.from("tasks").update({ title: next.trim() }).eq("id", taskId);
    if (error) return toast.error(error.message);
    tasksQ.refetch();
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const deleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return toast.error(error.message);
    tasksQ.refetch();
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const unlinkTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").update({ partnership_id: null }).eq("id", taskId);
    if (error) return toast.error(error.message);
    tasksQ.refetch();
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const addLinkedTask = async () => {
    if (!id || !newTaskTitle.trim()) return;
    const initId = initQ.data?.[0]?.id;
    if (!initId) return toast.error("Create an initiative first");
    const { error } = await supabase.from("tasks").insert({
      title: newTaskTitle.trim(),
      initiative_id: initId,
      partnership_id: id,
      priority: "medium",
      status: "todo",
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewTaskTitle("");
    tasksQ.refetch();
    qc.invalidateQueries({ queryKey: ["tasks"] });
    await bump();
    invalidatePart();
  };

  const renameDoc = async (docId: string, current: string) => {
    const next = window.prompt("Rename document", current);
    if (!next || !next.trim() || next.trim() === current) return;
    const { error } = await supabase.from("documents").update({ title: next.trim() }).eq("id", docId);
    if (error) return toast.error(error.message);
    docsQ.refetch();
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const unlinkDoc = async (docId: string) => {
    const { error } = await supabase.from("documents").update({ partnership_id: null }).eq("id", docId);
    if (error) return toast.error(error.message);
    docsQ.refetch();
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  if (!id) return null;
  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{p.data?.name}</span>
            <button type="button" onClick={renamePartnership} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Rename">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={deletePartnership} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete partnership">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        {p.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs">Stage</Label>
              <Select value={p.data.stage} onValueChange={(v) => onStage(id, v)}>
                <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              {(p.data.tags ?? []).map((t: string) => (
                <Badge key={t} variant="outline" className="group/tag gap-1 pr-1">
                  <span>{t}</span>
                  <button type="button" onClick={() => removeTag(t)} className="rounded-sm text-muted-foreground opacity-60 hover:bg-destructive/10 hover:text-destructive hover:opacity-100" title="Remove tag">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag…"
                  className="h-7 w-28 text-xs"
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={addTag} disabled={!newTag.trim()}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>

            {editContact ? (
              <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
                <div><Label className="text-xs">Contact name</Label><Input value={cf.contact_name} onChange={(e) => setCf({ ...cf, contact_name: e.target.value })} /></div>
                <div><Label className="text-xs">Role</Label><Input value={cf.contact_role} onChange={(e) => setCf({ ...cf, contact_role: e.target.value })} /></div>
                <div><Label className="text-xs">Email</Label><Input type="email" value={cf.contact_email} onChange={(e) => setCf({ ...cf, contact_email: e.target.value })} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={cf.contact_phone} onChange={(e) => setCf({ ...cf, contact_phone: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label className="text-xs">Next action</Label><Textarea value={cf.next_action} onChange={(e) => setCf({ ...cf, next_action: e.target.value })} rows={2} /></div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditContact(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveContact}><Check className="mr-1 h-3.5 w-3.5" />Save</Button>
                </div>
              </div>
            ) : (
              <div className="group relative grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                <button type="button" onClick={startEditContact} className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" title="Edit details">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <div><span className="text-muted-foreground">Contact: </span>{p.data.contact_name || "—"}{p.data.contact_role ? ` (${p.data.contact_role})` : ""}</div>
                <div><span className="text-muted-foreground">Email: </span>{p.data.contact_email || "—"}</div>
                <div><span className="text-muted-foreground">Phone: </span>{p.data.contact_phone || "—"}</div>
                <div><span className="text-muted-foreground">Next action: </span>{p.data.next_action || "—"}</div>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Activity</Label>
              <div className="mt-2 space-y-2">
                <Textarea placeholder="Add a dated note…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                <Button size="sm" onClick={addNote} disabled={!note.trim()}>Add note</Button>
              </div>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {(notesQ.data ?? []).map((n) => (
                  <li key={n.id} className="group flex items-start gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p>{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{fmtRelative(n.created_at)}</p>
                    </div>
                    <button type="button" onClick={() => deleteNote(n.id)} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100" title="Delete note">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {(notesQ.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Linked tasks</Label>
                <ul className="mt-2 space-y-1 text-sm">
                  {(tasksQ.data ?? []).map((t) => (
                    <li key={t.id} className="group flex items-center gap-1 rounded border px-2 py-1">
                      <span className={cn("min-w-0 flex-1 truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                      <div className="flex flex-none gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => renameTask(t.id, t.title)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Rename">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => unlinkTask(t.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Unlink from partnership">
                          <X className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => deleteTask(t.id, t.title)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete task">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {(tasksQ.data ?? []).length === 0 && <li className="text-xs text-muted-foreground">None</li>}
                </ul>
                <div className="mt-2 flex gap-1">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLinkedTask(); } }}
                    placeholder="New task for this college…"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" onClick={addLinkedTask} disabled={!newTaskTitle.trim()}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Linked documents</Label>
                <ul className="mt-2 space-y-1 text-sm">
                  {(docsQ.data ?? []).map((d: any) => (
                    <li key={d.id} className="group flex items-center gap-1 rounded border px-2 py-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (d.storage_path) {
                            const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60 * 10);
                            if (error || !data) { toast.error(error?.message ?? "Failed to open"); return; }
                            window.open(data.signedUrl, "_blank");
                          } else if (d.file_url) {
                            window.open(d.file_url, "_blank");
                          } else {
                            navigate({ to: "/documents" });
                          }
                        }}
                        className="min-w-0 flex-1 truncate text-left hover:text-primary hover:underline"
                        title="Open document"
                      >
                        {d.title}
                      </button>
                      <div className="flex flex-none gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => renameDoc(d.id, d.title)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Rename">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => unlinkDoc(d.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Unlink">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}

                  {(docsQ.data ?? []).length === 0 && <li className="text-xs text-muted-foreground">None</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { TASK_STATUSES, TASK_PRIORITIES, fmtDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ListChecks, Download, Check, Pencil, Trash2 } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks")({ component: TasksPage });

function TasksPage() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [activeInit, setActiveInit] = useState<string | "my" | "overdue" | "common" | null>(null);
  const [addTask, setAddTask] = useState(false);
  const [addInit, setAddInit] = useState(false);

  const initQ = useQuery({
    queryKey: ["initiatives"],
    queryFn: async () => (await supabase.from("initiatives").select("*").order("created_at")).data ?? [],
  });

  const tasksQ = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("position").order("created_at")).data ?? [],
  });

  const profilesQ = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email")).data ?? [],
  });

  const partsQ = useQuery({
    queryKey: ["partnerships-lite"],
    queryFn: async () => (await supabase.from("partnerships").select("id,name")).data ?? [],
  });

  const initiatives = initQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  const current = activeInit ?? (initiatives[0]?.id ?? null);

  const visibleTasks = useMemo(() => {
    if (activeInit === "my") return tasks.filter((t) => t.assignee_id === user?.id);
    if (activeInit === "common") return tasks.filter((t) => !t.assignee_id);
    if (activeInit === "overdue") {
      const today = new Date().toISOString().slice(0, 10);
      return tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done");
    }
    return tasks.filter((t) => t.initiative_id === current);
  }, [tasks, activeInit, current, user]);


  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const renameTask = async (id: string, currentTitle: string) => {
    const next = window.prompt("Rename task", currentTitle);
    if (!next || next.trim() === "" || next.trim() === currentTitle) return;
    const { error } = await supabase.from("tasks").update({ title: next.trim() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Renamed"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
  };

  const deleteTask = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Task deleted"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
  };

  const assignTask = async (id: string, assignee_id: string | null) => {
    const { error } = await supabase.from("tasks").update({ assignee_id }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(assignee_id ? "Assigned" : "Unassigned"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
  };



  return (
    <>
      <PageHeader
        title="Tasks & Phases"
        description="Kanban boards grouped by initiative."
        actions={
          <>
            <Button variant="outline" onClick={() => {
              const initName = (id: string | null) => initiatives.find((i: any) => i.id === id)?.name ?? "";
              const personName = (id: string | null) => {
                const p = (profilesQ.data ?? []).find((x: any) => x.id === id);
                return p?.full_name || p?.email || "";
              };
              exportToExcel(
                visibleTasks.map((t: any) => ({
                  Title: t.title, Initiative: initName(t.initiative_id),
                  Status: t.status, Priority: t.priority,
                  Assignee: personName(t.assignee_id),
                  "Due date": t.due_date ?? "",
                  Description: t.description ?? "",
                  Created: t.created_at ?? "",
                })),
                "tasks",
              );
            }}><Download className="mr-1.5 h-4 w-4" />Export</Button>
            <Button variant="outline" onClick={() => setAddInit(true)}><Plus className="mr-1.5 h-4 w-4" />Initiative</Button>
            <Button className="brand-gradient" onClick={() => setAddTask(true)} disabled={initiatives.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" />New task
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={activeInit === "my" ? "default" : "outline"} size="sm" onClick={() => setActiveInit("my")}>My tasks</Button>
        <Button variant={activeInit === "common" ? "default" : "outline"} size="sm" onClick={() => setActiveInit("common")}>Common</Button>
        <Button variant={activeInit === "overdue" ? "destructive" : "outline"} size="sm" onClick={() => setActiveInit("overdue")}>Overdue</Button>
        <div className="mx-2 h-8 w-px bg-border" />
        {initiatives.map((i) => (
          <Button key={i.id} variant={current === i.id && activeInit !== "my" && activeInit !== "overdue" && activeInit !== "common" ? "default" : "outline"} size="sm"
            onClick={() => setActiveInit(i.id)}>
            {i.name}
          </Button>
        ))}
      </div>


      {initiatives.length === 0 ? (
        <EmptyState icon={ListChecks} title="No initiatives yet"
          description="Group tasks into initiatives like 'KMCT Proposal' or 'AWH Operations'."
          action={<Button onClick={() => setAddInit(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Create initiative</Button>} />
      ) : (
        <div className="grid gap-4 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${TASK_STATUSES.length}, minmax(260px,1fr))` }}>
          {TASK_STATUSES.map((col) => {
            const items = visibleTasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-lg border bg-muted/30 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) setStatus(id, col.key);
                }}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((t) => {
                    const prio = TASK_PRIORITIES.find((p) => p.key === t.priority);
                    const assignee = profilesQ.data?.find((p) => p.id === t.assignee_id);
                    return (
                      <div key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                        className="group cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStatus(t.id, t.status === "done" ? "todo" : "done"); }}
                            title={t.status === "done" ? "Mark as todo" : "Mark as done"}
                            className={cn(
                              "mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-sm border transition-colors",
                              t.status === "done" ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary",
                            )}
                          >
                            {t.status === "done" && <Check className="h-3 w-3" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={cn("text-sm font-medium leading-tight", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</div>
                            {t.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</div>}
                          </div>
                          <div className="flex flex-none gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" onClick={(e) => { e.stopPropagation(); renameTask(t.id, t.title); }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Rename">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteTask(t.id, t.title); }}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", prio?.color)}>{prio?.label}</span>
                          {t.due_date && <span className="text-[10px] text-muted-foreground">Due {fmtDate(t.due_date)}</span>}
                          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                            {isAdmin ? (
                              <Select value={t.assignee_id ?? "__none"} onValueChange={(v) => assignTask(t.id, v === "__none" ? null : v)}>
                                <SelectTrigger className="h-6 w-auto min-w-24 gap-1 border-none bg-transparent px-1.5 text-[10px] text-muted-foreground hover:bg-muted">
                                  <SelectValue placeholder="Assign…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">Unassigned</SelectItem>
                                  {(profilesQ.data ?? []).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              assignee ? <span className="text-[10px] text-muted-foreground">{assignee.full_name?.split(" ")[0]}</span> : <span className="text-[10px] italic text-muted-foreground">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                    );

                  })}
                  {items.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Drop tasks here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InitiativeDialog open={addInit} onOpenChange={setAddInit} />
      <TaskDialog
        open={addTask}
        onOpenChange={setAddTask}
        initiativeId={typeof current === "string" ? current : (initiatives[0]?.id ?? null)}
        initiatives={initiatives}
        profiles={profilesQ.data ?? []}
        partnerships={partsQ.data ?? []}
      />
    </>
  );
}

function InitiativeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter a name");
    setBusy(true);
    const { error } = await supabase.from("initiatives").insert({ name: name.trim(), description: desc || null, created_by: user?.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["initiatives"] });
    onOpenChange(false); setName(""); setDesc("");
    toast.success("Initiative created");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New initiative</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ open, onOpenChange, initiativeId, initiatives, profiles, partnerships }: any) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState({ title: "", description: "", initiative_id: initiativeId ?? "", assignee_id: "", due_date: "", priority: "medium", status: "todo", partnership_id: "" });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 2) return toast.error("Enter a title");
    if (!f.initiative_id) return toast.error("Pick an initiative");
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      title: f.title.trim(),
      description: f.description || null,
      initiative_id: f.initiative_id,
      assignee_id: f.assignee_id || null,
      due_date: f.due_date || null,
      priority: f.priority as any,
      status: f.status as any,
      partnership_id: f.partnership_id || null,
      created_by: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onOpenChange(false);
    setF({ title: "", description: "", initiative_id: initiativeId ?? "", assignee_id: "", due_date: "", priority: "medium", status: "todo", partnership_id: "" });
    toast.success("Task created");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Initiative</Label>
              <Select value={f.initiative_id} onValueChange={(v) => setF({ ...f, initiative_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{initiatives.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assignee</Label>
              <Select value={f.assignee_id} onValueChange={(v) => setF({ ...f, assignee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Due</Label><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
            <div><Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Linked partnership</Label>
            <Select value={f.partnership_id} onValueChange={(v) => setF({ ...f, partnership_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{partnerships.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

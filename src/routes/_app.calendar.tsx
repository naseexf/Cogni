import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { EVENT_TYPES, fmtDate, fmtDateTime } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarDays, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [addOpen, setAddOpen] = useState(false);
  const [initialDate, setInitialDate] = useState<string | null>(null);

  const eventsQ = useQuery({
    queryKey: ["events", cursor.getFullYear(), cursor.getMonth()],
    queryFn: async () => {
      const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString();
      const { data } = await supabase.from("events").select("*").gte("starts_at", start).lte("starts_at", end).order("starts_at");
      return data ?? [];
    },
  });

  const partsQ = useQuery({
    queryKey: ["partnerships-lite"],
    queryFn: async () => (await supabase.from("partnerships").select("id,name")).data ?? [],
  });

  const events = eventsQ.data ?? [];

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const startDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: startDay + daysInMonth }, (_, i) =>
    i < startDay ? null : new Date(cursor.getFullYear(), cursor.getMonth(), i - startDay + 1));

  const eventsByDate = useMemo(() => {
    const m: Record<string, typeof events> = {};
    events.forEach((e) => {
      const k = new Date(e.starts_at).toISOString().slice(0, 10);
      (m[k] = m[k] || []).push(e);
    });
    return m;
  }, [events]);

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 20),
    [events]
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Sessions, deadlines, college visits and internal meetings."
        actions={
          <Button className="brand-gradient" onClick={() => { setInitialDate(null); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />New event
          </Button>
        }
      />

      <Tabs defaultValue="month">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{monthLabel}</h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {cells.map((d, i) => {
              const k = d?.toISOString().slice(0, 10);
              const dayEvents = k ? eventsByDate[k] ?? [] : [];
              const today = k === new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={i}
                  onClick={() => { if (d) { setInitialDate(k!); setAddOpen(true); } }}
                  className={cn(
                    "min-h-24 bg-card p-1.5 text-left transition-colors hover:bg-muted/50",
                    !d && "bg-muted/20 pointer-events-none",
                    today && "ring-2 ring-inset ring-primary/50",
                  )}
                >
                  {d && (
                    <>
                      <div className={cn("text-xs font-medium", today && "text-primary")}>{d.getDate()}</div>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const t = EVENT_TYPES.find((x) => x.key === e.event_type);
                          return (
                            <div key={e.id} className="truncate rounded px-1 text-[10px]" style={{ background: `${t?.color}20`, color: t?.color }}>
                              {e.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing coming up" description="Add sessions, deadlines and visits to see them here."
              action={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New event</Button>} />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => {
                const t = EVENT_TYPES.find((x) => x.key === e.event_type);
                return (
                  <li key={e.id} className="flex items-start gap-3 rounded-md border bg-card p-4">
                    <div className="w-24 shrink-0 text-xs text-muted-foreground">{fmtDate(e.starts_at)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(e.starts_at)} · {e.location || "TBD"}</p>
                      {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
                    </div>
                    <Badge variant="outline" style={{ borderColor: t?.color, color: t?.color }}>{t?.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <EventDialog open={addOpen} onOpenChange={setAddOpen} defaultDate={initialDate} partnerships={partsQ.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["events"] })} />
    </>
  );
}

function EventDialog({ open, onOpenChange, defaultDate, partnerships, onSaved }: any) {
  const { user } = useAuth();
  const [f, setF] = useState<any>({ title: "", description: "", starts_at: "", location: "", event_type: "internal", partnership_id: "" });
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    if (defaultDate) setF((p: any) => ({ ...p, starts_at: `${defaultDate}T10:00` }));
  }, [defaultDate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 2) return toast.error("Enter a title");
    if (!f.starts_at) return toast.error("Pick a date/time");
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title: f.title.trim(),
      description: f.description || null,
      starts_at: new Date(f.starts_at).toISOString(),
      location: f.location || null,
      event_type: f.event_type,
      partnership_id: f.partnership_id || null,
      owner_id: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Event added");
    onSaved();
    onOpenChange(false);
    setF({ title: "", description: "", starts_at: "", location: "", event_type: "internal", partnership_id: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date & time *</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} required /></div>
            <div><Label>Type</Label>
              <Select value={f.event_type} onValueChange={(v) => setF({ ...f, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Room, address, or 'online'" /></div>
          <div><Label>Linked partnership</Label>
            <Select value={f.partnership_id} onValueChange={(v) => setF({ ...f, partnership_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{partnerships.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

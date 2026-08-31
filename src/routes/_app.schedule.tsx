import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarRange, ChevronDown, ChevronRight, Plus, Trash2, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — CogniLearn Portal" },
      { name: "description", content: "Week-by-week Experienceship program schedule for the CogniLearn team." },
      { property: "og:title", content: "Schedule — CogniLearn Portal" },
      { property: "og:description", content: "Week-by-week Experienceship program schedule for the CogniLearn team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

const DEFAULT_TEMPLATE = "Standard One-Month Experienceship";

type DayRow = {
  id: string;
  template_name: string;
  week_number: number;
  day_number: number;
  day_type: string;
  title: string | null;
  activities: string[];
  resource_person: string;
  sort_order: number;
  updated_at: string;
};

function SchedulePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [template, setTemplate] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const daysQ = useQuery({
    queryKey: ["schedule-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_days")
        .select("*")
        .order("week_number")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as DayRow[];
    },
  });

  const rows = daysQ.data ?? [];

  const templates = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      const prev = m.get(r.template_name);
      if (!prev || r.updated_at > prev) m.set(r.template_name, r.updated_at);
    });
    return [...m.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([name]) => name);
  }, [rows]);

  useEffect(() => {
    if (!template && templates.length) setTemplate(templates[0]);
  }, [templates, template]);

  const active = template ?? templates[0] ?? DEFAULT_TEMPLATE;
  const scoped = rows.filter((r) => r.template_name === active);

  const weeks = useMemo(() => {
    const m = new Map<number, DayRow[]>();
    scoped.forEach((r) => {
      const arr = m.get(r.week_number) ?? [];
      arr.push(r);
      m.set(r.week_number, arr);
    });
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, days]) => ({ week, days: [...days].sort((a, b) => a.sort_order - b.sort_order) }));
  }, [scoped]);

  const patch = async (id: string, values: Partial<DayRow>) => {
    // optimistic update so inline edits never flicker or reset the card
    qc.setQueryData(["schedule-days"], (old: DayRow[] | undefined) =>
      (old ?? []).map((r) => (r.id === id ? { ...r, ...values } : r)),
    );
    const { error } = await supabase
      .from("schedule_days")
      .update({ ...values, updated_by: user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["schedule-days"] });
    }
  };

  const addWeek = async () => {
    const nextWeek = (scoped.reduce((max, r) => Math.max(max, r.week_number), 0) || 0) + 1;
    const startDay = (scoped.reduce((max, r) => Math.max(max, r.day_number), 0) || 0) + 1;
    const payload = Array.from({ length: 5 }, (_, i) => ({
      template_name: active,
      week_number: nextWeek,
      day_number: startDay + i,
      day_type: "Weekday",
      title: null,
      activities: [] as string[],
      resource_person: "",
      sort_order: i + 1,
      updated_by: user?.id ?? null,
    }));
    const { error } = await supabase.from("schedule_days").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`Week ${nextWeek} added`);
    qc.invalidateQueries({ queryKey: ["schedule-days"] });
  };

  const addDay = async (week: number) => {
    const inWeek = scoped.filter((r) => r.week_number === week);
    const { error } = await supabase.from("schedule_days").insert({
      template_name: active,
      week_number: week,
      day_number: (scoped.reduce((max, r) => Math.max(max, r.day_number), 0) || 0) + 1,
      day_type: "Weekday",
      title: null,
      activities: [] as string[],
      resource_person: "",
      sort_order: (inWeek.reduce((max, r) => Math.max(max, r.sort_order), 0) || 0) + 1,
      updated_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["schedule-days"] });
  };

  const deleteDay = async (id: string) => {
    const { error } = await supabase.from("schedule_days").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["schedule-days"] });
  };

  const deleteWeek = async (week: number) => {
    if (!confirm(`Delete Week ${week} and all its days?`)) return;
    const { error } = await supabase
      .from("schedule_days").delete().eq("template_name", active).eq("week_number", week);
    if (error) { toast.error(error.message); return; }
    toast.success("Week deleted");
    qc.invalidateQueries({ queryKey: ["schedule-days"] });
  };

  return (
    <div>
      <PageHeader
        title="Task schedule"
        description="Week-by-week plan for the Experienceship program. Click any field to edit it."
        actions={
          <div className="flex items-center gap-2">
            {templates.length > 1 && (
              <Select value={active} onValueChange={setTemplate}>
                <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={addWeek} className="brand-gradient">
              <Plus className="mr-2 h-4 w-4" /> Add week
            </Button>
          </div>
        }
      />

      {daysQ.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : weeks.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No schedule yet"
          description="Create your first week and fill in the daily plan for the Experienceship program."
          action={<Button onClick={addWeek} className="brand-gradient"><Plus className="mr-2 h-4 w-4" /> Add week</Button>}
        />
      ) : (
        <div className="space-y-4">
          {weeks.map((w) => {
            const open = !collapsed[w.week];
            return (
              <div key={w.week} className="rounded-lg border bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setCollapsed((c) => ({ ...c, [w.week]: open }))}
                  >
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="truncate font-display text-sm font-semibold uppercase tracking-wide">Week {w.week}</span>
                    <span className="text-xs text-muted-foreground">{w.days.length} days</span>
                  </button>
                  <Button variant="outline" size="sm" onClick={() => addDay(w.week)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add task
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete week" onClick={() => deleteWeek(w.week)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {open && (
                  <div className="grid grid-cols-1 items-start gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {w.days.map((d) => <DayCard key={d.id} day={d} patch={patch} onDelete={() => deleteDay(d.id)} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineText({
  value, onSave, placeholder, className, inputClassName, multilineHint,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  multilineHint?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onSave(next);
  };

  if (editing) {
    return (
      <Input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        className={cn("h-7 px-2 py-1 text-sm", inputClassName)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={multilineHint ? "Click to edit" : undefined}
      className={cn(
        "w-full rounded px-1 py-0.5 text-left transition-colors hover:bg-accent/60",
        !value && "text-muted-foreground",
        className,
      )}
    >
      {value || placeholder}
    </button>
  );
}

function DayCard({ day, patch, onDelete }: { day: DayRow; patch: (id: string, v: Partial<DayRow>) => void; onDelete: () => void }) {
  const weekend = false;
  const [adding, setAdding] = useState(false);

  const setActivity = (i: number, v: string) => {
    const next = [...day.activities];
    if (!v) next.splice(i, 1); else next[i] = v;
    patch(day.id, { activities: next });
  };
  const removeActivity = (i: number) =>
    patch(day.id, { activities: day.activities.filter((_, j) => j !== i) });

  return (
    <Card className="group p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Day {day.day_number}
        </span>
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => { if (confirm(`Delete Day ${day.day_number}?`)) onDelete(); }}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      <div className="mt-1.5">
        <InlineText
          value={day.title ?? ""}
          placeholder={weekend ? "Weekend Task" : "Untitled"}
          onSave={(v) => patch(day.id, { title: v || null })}
          className={cn("font-semibold leading-snug", weekend ? "text-xs text-muted-foreground" : "text-sm")}
        />
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <User className="h-3 w-3 shrink-0" />
        <InlineText
          value={day.resource_person ?? ""}
          placeholder="Add resource person"
          onSave={(v) => patch(day.id, { resource_person: v })}
          className="truncate text-xs"
        />
      </div>

      {!weekend && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {day.activities.map((a, i) => (
            <li key={i} className="group flex items-start gap-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <InlineText
                value={a}
                placeholder="Bullet point"
                onSave={(v) => setActivity(i, v)}
                className="text-xs"
              />
              <button
                type="button"
                aria-label="Remove bullet"
                onClick={() => removeActivity(i)}
                className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </li>
          ))}
          <li>
            {adding ? (
              <InlineTextAdd
                onDone={(v) => {
                  setAdding(false);
                  if (v) patch(day.id, { activities: [...day.activities, v] });
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </li>
        </ul>
      )}
    </Card>
  );
}

function InlineTextAdd({ onDone }: { onDone: (v: string) => void }) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <Input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onDone(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onDone(draft.trim()); }
        if (e.key === "Escape") onDone("");
      }}
      placeholder="Bullet point"
      className="h-7 px-2 py-1 text-xs"
    />
  );
}

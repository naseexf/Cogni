import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { TASK_STATUSES, fmtDate } from "@/lib/constants";
import { BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/gantt")({ component: GanttPage });

const DAY = 24 * 60 * 60 * 1000;

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted-foreground/60",
  in_progress: "bg-[color:var(--brand-teal)]",
  blocked: "bg-destructive/70",
  done: "bg-[color:var(--brand-blue)]",
};

function GanttPage() {
  const [initFilter, setInitFilter] = useState<string>("all");

  const tasksQ = useQuery({
    queryKey: ["tasks", "gantt"],
    queryFn: async () =>
      (await supabase.from("tasks").select("*").order("created_at")).data ?? [],
  });
  const initsQ = useQuery({
    queryKey: ["initiatives"],
    queryFn: async () =>
      (await supabase.from("initiatives").select("*").order("created_at")).data ?? [],
  });

  const tasks = tasksQ.data ?? [];
  const initiatives = initsQ.data ?? [];

  const rows = useMemo(() => {
    return tasks
      .filter((t: any) => (initFilter === "all" ? true : t.initiative_id === initFilter))
      .map((t: any) => {
        const start = new Date(t.created_at);
        const end = t.due_date ? new Date(t.due_date) : new Date(start.getTime() + 7 * DAY);
        return { task: t, start, end: end < start ? new Date(start.getTime() + DAY) : end };
      });
  }, [tasks, initFilter]);

  const range = useMemo(() => {
    if (!rows.length) return null;
    const min = Math.min(...rows.map((r) => r.start.getTime()));
    const max = Math.max(...rows.map((r) => r.end.getTime()));
    const start = new Date(min - 2 * DAY);
    const end = new Date(max + 2 * DAY);
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY));
    return { start, end, total };
  }, [rows]);

  const monthTicks = useMemo(() => {
    if (!range) return [];
    const ticks: { label: string; offsetPct: number }[] = [];
    const d = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (d <= range.end) {
      const offset = (d.getTime() - range.start.getTime()) / DAY;
      const pct = (offset / range.total) * 100;
      if (pct >= 0 && pct <= 100) {
        ticks.push({
          label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
          offsetPct: pct,
        });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [range]);

  const todayPct = useMemo(() => {
    if (!range) return null;
    const now = Date.now();
    if (now < range.start.getTime() || now > range.end.getTime()) return null;
    return ((now - range.start.getTime()) / DAY / range.total) * 100;
  }, [range]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gantt Chart"
        description="Timeline view of tasks across initiatives, from creation to due date."
        actions={
          <div className="w-56">
            <Select value={initFilter} onValueChange={setInitFilter}>
              <SelectTrigger><SelectValue placeholder="All initiatives" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All initiatives</SelectItem>
                {initiatives.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {!rows.length || !range ? (
        <EmptyState
          icon={BarChart3}
          title="No tasks to plot"
          description="Add tasks with due dates from the Tasks & Phases page to see them on the timeline."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[minmax(220px,280px)_1fr]">
            <div className="border-b border-r bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Task
            </div>
            <div className="relative border-b bg-muted/30">
              <div className="relative h-8">
                {monthTicks.map((t, i) => (
                  <div key={i} className="absolute top-0 h-full border-l border-border/60 pl-1 text-[11px] text-muted-foreground"
                       style={{ left: `${t.offsetPct}%` }}>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {rows.map(({ task, start, end }) => {
              const leftPct = ((start.getTime() - range.start.getTime()) / DAY / range.total) * 100;
              const widthPct = Math.max(
                1.5,
                ((end.getTime() - start.getTime()) / DAY / range.total) * 100,
              );
              const status = String(task.status ?? "todo");
              const statusLabel =
                TASK_STATUSES.find((s) => s.key === status)?.label ?? status;
              return (
                <div key={task.id} className="contents">
                  <div className="border-b border-r px-4 py-3">
                    <div className="truncate text-sm font-medium">{task.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {statusLabel} · Due {fmtDate(task.due_date)}
                    </div>
                  </div>
                  <div className="relative border-b">
                    <div className="relative h-14">
                      {todayPct != null && (
                        <div className="absolute top-0 z-10 h-full w-px bg-[color:var(--brand-teal)]/70"
                             style={{ left: `${todayPct}%` }} />
                      )}
                      <div
                        className={cn(
                          "absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 text-[11px] font-medium text-white shadow-sm",
                          STATUS_COLOR[status] ?? "bg-muted-foreground/60",
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${task.title} — ${fmtDate(start)} → ${fmtDate(end)}`}
                      >
                        <div className="flex h-full items-center truncate">
                          {fmtDate(start)} → {fmtDate(end)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
            {TASK_STATUSES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-sm", STATUS_COLOR[s.key])} />
                {s.label}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="h-3 w-px bg-[color:var(--brand-teal)]" />
              Today
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

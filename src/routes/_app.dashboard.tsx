import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES, fmtDate, fmtRelative } from "@/lib/constants";
import { ArrowRight, Handshake, ListChecks, CalendarDays, FolderOpen, Megaphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();

  const profileQ = useQuery({
    queryKey: ["me-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const tasksQ = useQuery({
    queryKey: ["my-open-tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("tasks")
        .select("id,title,due_date,priority,status,initiative_id")
        .eq("assignee_id", user!.id).neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false }).limit(6);
      return data ?? [];
    },
  });

  const eventsQ = useQuery({
    queryKey: ["week-events"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 7 * 86400_000).toISOString();
      const { data } = await supabase.from("events").select("*").gte("starts_at", now).lte("starts_at", end).order("starts_at").limit(6);
      return data ?? [];
    },
  });

  const partsQ = useQuery({
    queryKey: ["active-partnerships"],
    queryFn: async () => (await supabase.from("partnerships").select("*").order("last_activity_at", { ascending: false })).data ?? [],
  });

  const announceQ = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(4)).data ?? [],
  });

  const docsQ = useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => (await supabase.from("documents").select("*").order("updated_at", { ascending: false }).limit(5)).data ?? [],
  });

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const first = (profileQ.data?.full_name || "").split(" ")[0] || "there";

  const toggleTask = async (id: string, done: boolean) => {
    const { error } = await supabase.from("tasks").update({ status: done ? "done" : "todo" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(done ? "Marked done" : "Reopened"); tasksQ.refetch(); }
  };

  return (
    <>
      <PageHeader
        title={`${greet()}, ${first}`}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="This week" action={<Link to="/calendar" className="text-xs text-primary hover:underline">View calendar</Link>}>
          {eventsQ.isLoading ? <Skeleton className="h-24" /> :
            eventsQ.data && eventsQ.data.length > 0 ? (
              <ul className="space-y-3">
                {eventsQ.data.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md brand-gradient text-primary-foreground">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(ev.starts_at)} · {ev.location || "TBD"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nothing scheduled this week.</p>
          }
        </SectionCard>

        <SectionCard title="My tasks" action={<Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>}>
          {tasksQ.isLoading ? <Skeleton className="h-24" /> :
            tasksQ.data && tasksQ.data.length > 0 ? (
              <ul className="space-y-2">
                {tasksQ.data.map((t) => (
                  <li key={t.id} className="flex items-start gap-3">
                    <Checkbox
                      className="mt-0.5"
                      onCheckedChange={(v) => toggleTask(t.id, !!v)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"} · {t.priority}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">You're all caught up.</p>
          }
        </SectionCard>

        <SectionCard title="Announcements" action={<Link to="/announcements" className="text-xs text-primary hover:underline">View all</Link>}>
          {announceQ.isLoading ? <Skeleton className="h-24" /> :
            announceQ.data && announceQ.data.length > 0 ? (
              <ul className="space-y-3">
                {announceQ.data.map((a) => (
                  <li key={a.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm font-medium">{a.title || "Update"} {a.pinned && <Badge variant="secondary" className="ml-1 text-[10px]">Pinned</Badge>}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{fmtRelative(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No announcements yet.</p>
          }
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Partnership pipeline" action={<Link to="/partnerships" className="text-xs text-primary hover:underline">Open pipeline</Link>}>
          {partsQ.isLoading ? <Skeleton className="h-24" /> :
            partsQ.data && partsQ.data.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {partsQ.data.slice(0, 6).map((p) => {
                  const stage = STAGES.find((s) => s.key === p.stage);
                  return (
                    <Link key={p.id} to="/partnerships" className="group rounded-md border bg-card p-4 transition-colors hover:border-primary/50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium">{p.name}</p>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{stage?.label ?? p.stage}</Badge>
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.next_action || "No next action set"}</p>
                    </Link>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No partnerships yet.</p>
          }
        </SectionCard>
      </div>

      <div className="mt-5">
        <SectionCard title="Recent documents" action={<Link to="/documents" className="text-xs text-primary hover:underline">View all</Link>}>
          {docsQ.isLoading ? <Skeleton className="h-16" /> :
            docsQ.data && docsQ.data.length > 0 ? (
              <ul className="divide-y">
                {docsQ.data.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{d.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtRelative(d.updated_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No documents yet.</p>
          }
        </SectionCard>
      </div>
    </>
  );
}

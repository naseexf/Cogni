import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Search as SearchIcon, Handshake, ListChecks, FolderOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>) => z.object({ q: z.string().default("") }).parse(s),
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = q.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      // Escape PostgREST filter special chars so the user's text is treated as literal ilike input.
      const escaped = term.replace(/[,()"'*\\.]/g, (c: string) => `\\${c}`);
      const like = `%${escaped}%`;
      const [parts, tasks, docsTitle, docsContent, interns] = await Promise.all([
        supabase.from("partnerships").select("id,name,stage,contact_name").ilike("name", like).limit(20),
        supabase.from("tasks").select("id,title,status").ilike("title", like).limit(20),
        supabase.from("documents").select("id,title,doc_type").ilike("title", like).limit(20),
        supabase.from("documents").select("id,title,doc_type").ilike("content_text", like).limit(20),
        supabase.from("interns").select("id,full_name,college,batch").ilike("full_name", like).limit(20),
      ]);
      const docMap = new Map<string, any>();
      for (const d of [...(docsTitle.data ?? []), ...(docsContent.data ?? [])]) docMap.set(d.id, d);
      const docs = { data: Array.from(docMap.values()).slice(0, 20) };
      return {
        partnerships: parts.data ?? [], tasks: tasks.data ?? [],
        documents: docs.data ?? [], interns: interns.data ?? [],
      };
    },
  });

  const total = data ? (data.partnerships.length + data.tasks.length + data.documents.length + data.interns.length) : 0;

  return (
    <>
      <PageHeader title={`Search: "${term}"`} description={term ? `${total} result${total === 1 ? "" : "s"}` : "Type a query in the top bar"} />
      {!term ? (
        <EmptyState icon={SearchIcon} title="Start typing" description="Search across partnerships, tasks, documents and interns." />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : total === 0 ? (
        <EmptyState icon={SearchIcon} title="No results" description="Try a different keyword." />
      ) : (
        <div className="space-y-6">
          {data!.partnerships.length > 0 && (
            <Section title="Partnerships" icon={Handshake}>
              {data!.partnerships.map((p) => (
                <Link key={p.id} to="/partnerships" className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.contact_name || "No contact"} · <Badge variant="outline">{p.stage}</Badge></div>
                </Link>
              ))}
            </Section>
          )}
          {data!.tasks.length > 0 && (
            <Section title="Tasks" icon={ListChecks}>
              {data!.tasks.map((t) => (
                <Link key={t.id} to="/tasks" className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="font-medium">{t.title}</div>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </Link>
              ))}
            </Section>
          )}
          {data!.documents.length > 0 && (
            <Section title="Documents" icon={FolderOpen}>
              {data!.documents.map((d) => (
                <Link key={d.id} to="/documents" className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.doc_type}</div>
                </Link>
              ))}
            </Section>
          )}
          {data!.interns.length > 0 && (
            <Section title="Interns" icon={GraduationCap}>
              {data!.interns.map((i) => (
                <Link key={i.id} to="/fees" className="block rounded-md border p-3 hover:bg-muted/50">
                  <div className="font-medium">{i.full_name}</div>
                  <div className="text-xs text-muted-foreground">{i.college || "—"} · {i.batch || "—"}</div>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />{title}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

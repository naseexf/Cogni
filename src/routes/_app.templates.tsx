import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { TEMPLATE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileStack, Copy, FileText, Pencil, Trash2, Paperclip, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates")({ component: TemplatesPage });

const BUCKET = "documents";

function TemplatesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const tplQ = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await supabase.from("templates").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    if (error || !data) return toast.error(error?.message ?? "Failed to open file");
    window.open(data.signedUrl, "_blank");
  };

  const useTemplate = async (t: any) => {
    const { error } = await supabase.from("documents").insert({
      title: `${t.name} — draft`,
      doc_type: "other" as any,
      content_text: t.body,
      uploaded_by: user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Draft created in Documents");
    navigate({ to: "/documents" });
  };

  const renameTemplate = async (t: any) => {
    const next = window.prompt("Rename template", t.name);
    if (!next || next.trim().length < 2 || next.trim() === t.name) return;
    const { error } = await supabase.from("templates").update({ name: next.trim() }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  const deleteTemplate = async (t: any) => {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    if (t.storage_path) await supabase.storage.from(BUCKET).remove([t.storage_path]);
    const { error } = await supabase.from("templates").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <>
      <PageHeader
        title="Templates"
        description="Brochures, slide decks, posters, write-ups and reusable message frameworks."
        actions={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New template</Button>}
      />

      {(tplQ.data ?? []).length === 0 ? (
        <EmptyState icon={FileStack} title="No templates yet"
          description="Add a brochure, slide deck, poster or a reusable write-up."
          action={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New template</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(tplQ.data ?? []).map((t: any) => (
            <div key={t.id} className="group relative rounded-lg border bg-card p-4">
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {t.storage_path && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openFile(t.storage_path)} title="Open file">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameTemplate(t)} title="Rename">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTemplate(t)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-start justify-between gap-2 pr-20">
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{TEMPLATE_TYPES.find((x) => x.key === t.template_type)?.label ?? t.template_type}</Badge>
                </div>
                {(t.file_mime ?? "").startsWith("image/") ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              </div>
              {t.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
              {t.file_name && (
                <button onClick={() => openFile(t.storage_path)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
                  <Paperclip className="h-3 w-3" />{t.file_name}
                </button>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(t)}>Preview</Button>
                {t.body ? (
                  <Button size="sm" className="brand-gradient" onClick={() => useTemplate(t)}>Use template</Button>
                ) : t.storage_path ? (
                  <Button size="sm" className="brand-gradient" onClick={() => openFile(t.storage_path)}>Open file</Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["templates"] })} />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              {selected.file_name && (
                <Button variant="outline" className="w-full" onClick={() => openFile(selected.storage_path)}>
                  <Paperclip className="mr-1.5 h-4 w-4" />Open {selected.file_name}
                </Button>
              )}
              {selected.body && (
                <>
                  <div className="relative">
                    <Button size="sm" variant="ghost" className="absolute right-2 top-2"
                      onClick={() => { navigator.clipboard.writeText(selected.body); toast.success("Copied"); }}>
                      <Copy className="mr-1 h-3 w-3" />Copy
                    </Button>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{selected.body}</pre>
                  </div>
                  <Button className="w-full brand-gradient" onClick={() => useTemplate(selected)}>Use this template</Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TemplateDialog({ open, onOpenChange, onSaved }: any) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", template_type: "brochure", description: "", body: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.error("Enter a name");
    if (!file && f.body.trim().length < 5) return toast.error("Add a file or a template body");
    setBusy(true);

    let storage_path: string | null = null;
    if (file) {
      const path = `templates/${user?.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
      storage_path = path;
    }

    const { error } = await supabase.from("templates").insert({
      name: f.name.trim(),
      template_type: f.template_type as any,
      description: f.description || null,
      body: f.body.trim() || null,
      storage_path,
      file_name: file?.name ?? null,
      file_mime: file?.type ?? null,
      file_size: file?.size ?? null,
      created_by: user?.id,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    onSaved(); onOpenChange(false);
    setF({ name: "", template_type: "brochure", description: "", body: "" });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={f.template_type} onValueChange={(v) => setF({ ...f, template_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          </div>
          <div>
            <Label>File (PDF, PPT, image or any file)</Label>
            <Input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,image/*,*/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>}
          </div>
          <div><Label>Body (optional if a file is attached)</Label><Textarea rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Overview&#10;Experienceship Track&#10;..." /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

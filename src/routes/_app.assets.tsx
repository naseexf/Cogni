import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { ASSET_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Palette, Copy, ImageIcon, Pencil, Trash2, Download, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assets")({ component: AssetsPage });

const BUCKET = "documents";

function AssetsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const assetsQ = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await supabase.from("assets").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  // Sign URLs for image files in storage so they render as thumbnails
  useMemo(() => {
    (async () => {
      const list = assetsQ.data ?? [];
      const need = list.filter((a: any) => a.storage_path && (a.file_mime ?? "").startsWith("image/") && !previewUrls[a.id]);
      if (!need.length) return;
      const updates: Record<string, string> = {};
      await Promise.all(need.map(async (a: any) => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 60 * 30);
        if (data?.signedUrl) updates[a.id] = data.signedUrl;
      }));
      if (Object.keys(updates).length) setPreviewUrls((p) => ({ ...p, ...updates }));
    })();
  }, [assetsQ.data]);

  const filtered = useMemo(() => (assetsQ.data ?? []).filter((a) => {
    if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
    if (!q) return true;
    return a.title.toLowerCase().includes(q.toLowerCase()) || (a.tags ?? []).some((t: string) => t.toLowerCase().includes(q.toLowerCase()));
  }), [assetsQ.data, typeFilter, q]);

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    window.open(data.signedUrl, "_blank");
  };

  const renameAsset = async (a: any) => {
    const name = window.prompt("Rename asset", a.title);
    if (!name || name.trim() === a.title) return;
    const { error } = await supabase.from("assets").update({ title: name.trim(), updated_at: new Date().toISOString() }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  const deleteAsset = async (a: any) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    if (a.storage_path) await supabase.storage.from(BUCKET).remove([a.storage_path]);
    const { error } = await supabase.from("assets").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  return (
    <>
      <PageHeader
        title="Brand & Asset Library"
        description="Posters, logos, business cards and reusable creative pieces."
        actions={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />New asset</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-64" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Palette} title="No assets yet"
          description="Save posters, logos, and business cards for the team."
          action={<Button onClick={() => setAddOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Add asset</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => {
            const t = ASSET_TYPES.find((x) => x.key === a.asset_type);
            const isImage = (a.file_mime ?? "").startsWith("image/");
            const thumb = a.image_url || (isImage ? previewUrls[a.id] : undefined);
            return (
              <div key={a.id} className="group relative overflow-hidden rounded-lg border bg-card">
                <div className="aspect-video bg-muted">
                  {thumb ? (
                    <img src={thumb} alt={a.title} className="h-full w-full object-cover" />
                  ) : a.storage_path ? (
                    <button onClick={() => openFile(a.storage_path!)} className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
                      <FileText className="h-8 w-8" />
                      <span className="text-[10px] uppercase tracking-wide">{(a.file_mime ?? "file").split("/")[1] ?? "file"}</span>
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {a.storage_path && (
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => openFile(a.storage_path!)} title="Open file">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => renameAsset(a)} title="Rename">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAsset(a)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium">{a.title}</p>
                    <Badge variant="outline" className="text-[10px]">{t?.label}</Badge>
                  </div>
                  {a.associated_with && <p className="mt-1 text-xs text-muted-foreground">{a.associated_with}</p>}
                  {a.file_name && (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">📎 {a.file_name}</p>
                  )}
                  {a.content_text && (
                    <>
                      <pre className="mt-2 line-clamp-3 whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px]">{a.content_text}</pre>
                      <Button size="sm" variant="ghost" className="mt-1 h-7 w-full"
                        onClick={() => { navigator.clipboard.writeText(a.content_text ?? ""); toast.success("Copied"); }}>
                        <Copy className="mr-1 h-3 w-3" />Copy
                      </Button>
                    </>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(a.tags ?? []).slice(0, 3).map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AssetDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["assets"] })} />
    </>
  );
}

function AssetDialog({ open, onOpenChange, onSaved }: any) {
  const { user } = useAuth();
  const [f, setF] = useState({ title: "", asset_type: "poster", image_url: "", content_text: "", associated_with: "", tags: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 2) return toast.error("Enter a title");
    setBusy(true);
    let storage_path: string | null = null;
    let file_mime: string | null = null;
    let file_name: string | null = null;
    if (file) {
      const path = `assets/${user?.id ?? "anon"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (up.error) { setBusy(false); return toast.error(up.error.message); }
      storage_path = path;
      file_mime = file.type || null;
      file_name = file.name;
    }
    const { error } = await supabase.from("assets").insert({
      title: f.title.trim(),
      asset_type: f.asset_type as any,
      image_url: f.image_url || null,
      content_text: f.content_text || null,
      associated_with: f.associated_with || null,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      created_by: user?.id,
      storage_path,
      file_mime,
      file_name,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Asset saved");
    onSaved(); onOpenChange(false);
    setF({ title: "", asset_type: "poster", image_url: "", content_text: "", associated_with: "", tags: "" });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New asset</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={f.asset_type} onValueChange={(v) => setF({ ...f, asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Associated with</Label><Input value={f.associated_with} onChange={(e) => setF({ ...f, associated_with: e.target.value })} placeholder="Event / college" /></div>
          </div>
          <div>
            <Label>Upload file (PDF, PNG, JPG, or any file)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="mt-1 text-xs text-muted-foreground"><Upload className="mr-1 inline h-3 w-3" />{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <div><Label>Or image URL (optional)</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Description / notes</Label><Textarea rows={4} value={f.content_text} onChange={(e) => setF({ ...f, content_text: e.target.value })} /></div>
          <div><Label>Tags (comma separated)</Label><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

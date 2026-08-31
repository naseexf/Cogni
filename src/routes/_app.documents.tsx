import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/page-header";
import { fmtRelative } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Folder,
  FolderPlus,
  Upload,
  ChevronRight,
  Home,
  Pencil,
  Trash2,
  Download,
  FileText,
  FileType2,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  ArrowUpDown,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documents")({ component: DocumentsPage });

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  section: "common" | "calicut" | "tvm";
  is_root: boolean;
  created_at: string;
  updated_at: string;
};

type DocRow = {
  id: string;
  title: string;
  doc_type: string;
  folder_id: string | null;
  partnership_id: string | null;
  tags: string[] | null;
  storage_path: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  content_text: string | null;
  created_at: string;
  updated_at: string;
};

const SECTION_STYLES: Record<string, { folder: string; badge: string; label: string }> = {
  common: {
    folder: "text-slate-400",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
    label: "Common",
  },
  calicut: {
    folder: "text-teal-500",
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/20",
    label: "Calicut",
  },
  tvm: {
    folder: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20",
    label: "TVM",
  },
};

function extOf(name: string | null | undefined) {
  if (!name) return "";
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

function fileKind(doc: DocRow): "pdf" | "word" | "excel" | "image" | "other" {
  const e = extOf(doc.storage_path || doc.title);
  const mt = (doc.mime_type || "").toLowerCase();
  if (e === "pdf" || mt.includes("pdf")) return "pdf";
  if (["doc", "docx"].includes(e) || mt.includes("word")) return "word";
  if (["xls", "xlsx", "csv"].includes(e) || mt.includes("sheet") || mt.includes("excel")) return "excel";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e) || mt.startsWith("image/")) return "image";
  return "other";
}

function FileTypeIcon({ kind, className }: { kind: ReturnType<typeof fileKind>; className?: string }) {
  const cls = className ?? "h-5 w-5";
  if (kind === "pdf") return <FileText className={`${cls} text-red-500`} />;
  if (kind === "word") return <FileType2 className={`${cls} text-blue-500`} />;
  if (kind === "excel") return <FileSpreadsheet className={`${cls} text-emerald-500`} />;
  if (kind === "image") return <FileImage className={`${cls} text-fuchsia-500`} />;
  return <FileIcon className={`${cls} text-muted-foreground`} />;
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [currentId, setCurrentId] = useState<string | null>(null); // null = root/home
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [newMenu, setNewMenu] = useState<"folder" | "file" | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocRow | null>(null);

  const foldersQ = useQuery({
    queryKey: ["doc-folders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_folders")
        .select("*")
        .order("name");
      return (data ?? []) as FolderRow[];
    },
  });

  const docsQ = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .order("updated_at", { ascending: false });
      return (data ?? []) as DocRow[];
    },
  });

  const folders = foldersQ.data ?? [];
  const docs = docsQ.data ?? [];

  // Build lookups
  const folderById = useMemo(() => {
    const m = new Map<string, FolderRow>();
    folders.forEach((f) => m.set(f.id, f));
    return m;
  }, [folders]);

  const childrenOf = useCallback(
    (id: string | null) => folders.filter((f) => f.parent_id === id),
    [folders],
  );
  const filesIn = useCallback(
    (id: string | null) => docs.filter((d) => (d.folder_id ?? null) === id),
    [docs],
  );

  // Section of a folder (walk up to root)
  const sectionOf = useCallback(
    (folderId: string | null): "common" | "calicut" | "tvm" | null => {
      if (!folderId) return null;
      let cur = folderById.get(folderId);
      while (cur) {
        if (cur.is_root) return cur.section;
        cur = cur.parent_id ? folderById.get(cur.parent_id) : undefined;
      }
      return null;
    },
    [folderById],
  );

  // Breadcrumb path
  const breadcrumb = useMemo(() => {
    const path: FolderRow[] = [];
    let cur = currentId ? folderById.get(currentId) : undefined;
    while (cur) {
      path.unshift(cur);
      cur = cur.parent_id ? folderById.get(cur.parent_id) : undefined;
    }
    return path;
  }, [currentId, folderById]);

  const currentSection = currentId ? sectionOf(currentId) : null;

  // Compute path label for search results
  const pathOf = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return "Home";
      const parts: string[] = [];
      let cur = folderById.get(folderId);
      while (cur) {
        parts.unshift(cur.name);
        cur = cur.parent_id ? folderById.get(cur.parent_id) : undefined;
      }
      return ["Home", ...parts].join(" / ");
    },
    [folderById],
  );

  // Search / filter results
  const searching = q.trim().length > 0 || typeFilter !== "all";

  const visibleFolders = useMemo(() => {
    if (searching && scope === "all") {
      const s = q.toLowerCase();
      return folders
        .filter((f) => !f.is_root || s === "" ? true : f.name.toLowerCase().includes(s))
        .filter((f) => !s || f.name.toLowerCase().includes(s))
        .filter((f) => typeFilter === "all"); // folders only when no type filter
    }
    const list = childrenOf(currentId);
    if (!q) return list.sort((a, b) => a.name.localeCompare(b.name));
    const s = q.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name));
  }, [searching, scope, folders, childrenOf, currentId, q, typeFilter]);

  const visibleFiles = useMemo(() => {
    const base = searching && scope === "all" ? docs : filesIn(currentId);
    const s = q.trim().toLowerCase();
    return base
      .filter((d) => {
        if (typeFilter !== "all" && fileKind(d) !== typeFilter) return false;
        if (!s) return true;
        return (
          d.title.toLowerCase().includes(s) ||
          (d.content_text ?? "").toLowerCase().includes(s) ||
          (d.tags ?? []).some((t) => t.toLowerCase().includes(s))
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [searching, scope, docs, filesIn, currentId, q, typeFilter]);

  const isRootView = currentId === null;
  const showingSearchResults = searching && scope === "all";

  const createFolder = async (name: string) => {
    // Only allowed inside a section (not at root — root folders are fixed)
    if (isRootView) {
      toast.error("Open Common, Calicut or TVM first to create a folder inside it.");
      return;
    }
    const section = currentSection!;
    const { error } = await supabase.from("document_folders").insert({
      name: name.trim(),
      parent_id: currentId,
      section,
      is_root: false,
      created_by: user?.id ?? null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Folder created");
    qc.invalidateQueries({ queryKey: ["doc-folders"] });
  };

  const uploadFileHere = async (file: File) => {
    if (isRootView) {
      toast.error("Open Common, Calicut or TVM first to upload a file.");
      return;
    }
    const path = `${user?.id ?? "anon"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("documents").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (up.error) return toast.error(up.error.message);
    const { error } = await supabase.from("documents").insert({
      title: file.name,
      doc_type: "other",
      folder_id: currentId,
      tags: [],
      storage_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: user?.id ?? null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("File uploaded");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const renameFolder = async (f: FolderRow) => {
    if (f.is_root) return toast.error("Root folders cannot be renamed");
    const name = window.prompt("Rename folder", f.name);
    if (!name || name.trim() === f.name) return;
    const { error } = await supabase
      .from("document_folders")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["doc-folders"] });
  };

  const deleteFolder = async (f: FolderRow) => {
    if (f.is_root) return toast.error("Root folders cannot be deleted");
    if (!window.confirm(`Delete folder "${f.name}" and everything inside it?`)) return;
    // Collect all descendant folder ids
    const descendants = new Set<string>([f.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const fld of folders) {
        if (fld.parent_id && descendants.has(fld.parent_id) && !descendants.has(fld.id)) {
          descendants.add(fld.id);
          changed = true;
        }
      }
    }
    // Delete files in all descendant folders (storage + rows)
    const filesToDelete = docs.filter((d) => d.folder_id && descendants.has(d.folder_id));
    const paths = filesToDelete.map((d) => d.storage_path).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("documents").remove(paths);
    if (filesToDelete.length)
      await supabase.from("documents").delete().in("id", filesToDelete.map((d) => d.id));
    // Delete folder (CASCADE handles subfolders)
    const { error } = await supabase.from("document_folders").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Folder deleted");
    qc.invalidateQueries({ queryKey: ["doc-folders"] });
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const renameFile = async (d: DocRow) => {
    const name = window.prompt("Rename file", d.title);
    if (!name || name.trim() === d.title) return;
    const { error } = await supabase
      .from("documents")
      .update({ title: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const deleteFile = async (d: DocRow) => {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    if (d.storage_path) await supabase.storage.from("documents").remove([d.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  // Drag & drop upload on the content area
  const [dragOver, setDragOver] = useState(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isRootView) {
      toast.error("Open Common, Calicut or TVM first to upload files.");
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) await uploadFileHere(f);
  };

  return (
    <>
      <PageHeader
        title="Documents & Reports"
        description="Nested file storage for the CogniLearn team — organized by section."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="brand-gradient">
                <Plus className="mr-1.5 h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setNewMenu("folder")} disabled={isRootView}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNewMenu("file")} disabled={isRootView}>
                <Upload className="mr-2 h-4 w-4" />
                Upload file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentId(null)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </button>
        {breadcrumb.map((f, i) => (
          <div key={f.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => setCurrentId(f.id)}
              className={`rounded px-2 py-1 hover:bg-muted ${
                i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {f.name}
            </button>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filenames, tags, content…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All file types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="word">Word</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={(v: any) => setScope(v)}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current folder only</SelectItem>
            <SelectItem value="all">Search everywhere</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Root view: 3 fixed section folders */}
      {isRootView && !showingSearchResults ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["common", "calicut", "tvm"].map((sec) => {
            const f = folders.find((x) => x.is_root && x.section === sec);
            if (!f) return null;
            const styles = SECTION_STYLES[sec];
            const kids = childrenOf(f.id).length;
            const kidFiles = filesIn(f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setCurrentId(f.id)}
                className="group rounded-lg border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Folder className={`h-10 w-10 ${styles.folder}`} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{f.name}</p>
                      <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
                        Root
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {kids} folders · {kidFiles} files
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {fmtRelative(f.updated_at)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isRootView) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-lg border-2 border-dashed p-2 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-transparent"
          }`}
        >
          {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-lg border bg-card p-10 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {showingSearchResults ? "No matches found" : "This folder is empty"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {showingSearchResults
                    ? "Try a different search or clear filters."
                    : "Add your first subfolder or upload a file to get started."}
                </p>
              </div>
              {!showingSearchResults && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setNewMenu("folder")}>
                    <FolderPlus className="mr-1.5 h-4 w-4" />
                    New folder
                  </Button>
                  <Button className="brand-gradient" onClick={() => setNewMenu("file")}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Upload file
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFolders.map((f) => {
                const sec = sectionOf(f.id) ?? "common";
                const styles = SECTION_STYLES[sec];
                const kids = childrenOf(f.id).length;
                const kidFiles = filesIn(f.id).length;
                return (
                  <div
                    key={f.id}
                    className="group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <button
                      onClick={() => {
                        setCurrentId(f.id);
                        setQ("");
                        setScope("current");
                      }}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <Folder className={`h-8 w-8 shrink-0 ${styles.folder}`} strokeWidth={1.5} />
                      <div className="min-w-0 flex-1 pr-16">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {kids + kidFiles} item{kids + kidFiles === 1 ? "" : "s"} ·{" "}
                          {fmtRelative(f.updated_at)}
                        </p>
                        {showingSearchResults && (
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {pathOf(f.parent_id)}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => renameFolder(f)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteFolder(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {visibleFiles.map((d) => {
                const kind = fileKind(d);
                const sec = sectionOf(d.folder_id);
                const styles = sec ? SECTION_STYLES[sec] : null;
                return (
                  <div
                    key={d.id}
                    className="group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <button
                      onClick={() => setSelectedDoc(d)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                        <FileTypeIcon kind={kind} />
                      </div>
                      <div className="min-w-0 flex-1 pr-16">
                        <p className="truncate font-medium">{d.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {kind === "other" ? extOf(d.storage_path || d.title) || "file" : kind}
                          </Badge>
                          {d.file_size ? <span>{fmtSize(d.file_size)}</span> : null}
                          <span>· {fmtRelative(d.updated_at)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {styles && showingSearchResults && (
                            <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
                              {styles.label}
                            </Badge>
                          )}
                          {(d.tags ?? []).slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                        {showingSearchResults && (
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {pathOf(d.folder_id)}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => renameFile(d)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteFile(d)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Folder dialog */}
      <NewFolderDialog
        open={newMenu === "folder"}
        onOpenChange={(v) => !v && setNewMenu(null)}
        onCreate={(name) => {
          createFolder(name);
          setNewMenu(null);
        }}
      />

      {/* Upload File dialog */}
      <UploadFileDialog
        open={newMenu === "file"}
        onOpenChange={(v) => !v && setNewMenu(null)}
        onUpload={async (files) => {
          for (const f of files) await uploadFileHere(f);
          setNewMenu(null);
        }}
      />

      {/* File preview panel */}
      <FilePreviewDialog
        doc={selectedDoc}
        onOpenChange={(v) => !v && setSelectedDoc(null)}
        pathLabel={selectedDoc ? pathOf(selectedDoc.folder_id) : ""}
      />
    </>
  );
}

function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setName("");
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 1) return;
            onCreate(name.trim());
            setName("");
          }}
          className="space-y-3"
        >
          <div>
            <Label>Folder name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. June Batch"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="brand-gradient" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadFileDialog({
  open,
  onOpenChange,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true);
    await onUpload(files);
    setBusy(false);
    setFiles([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setFiles([]);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const fs = Array.from(e.dataTransfer.files);
              if (fs.length) setFiles((prev) => [...prev, ...fs]);
            }}
            className={`rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
            }`}
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground">Drag &amp; drop files here, or</p>
            <label className="mt-2 inline-flex">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? []);
                  if (fs.length) setFiles((prev) => [...prev, ...fs]);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>Browse files</span>
              </Button>
            </label>
          </div>
          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-auto text-sm">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                  <span className="truncate">{f.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {fmtSize(f.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="brand-gradient" disabled={!files.length || busy}>
              {busy ? "Uploading…" : `Upload ${files.length || ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FilePreviewDialog({
  doc,
  onOpenChange,
  pathLabel,
}: {
  doc: DocRow | null;
  onOpenChange: (v: boolean) => void;
  pathLabel: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useMemo(() => {
    setPreviewUrl(null);
  }, [doc?.id]);

  if (!doc) return null;
  const kind = fileKind(doc);

  const loadPreview = async () => {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60 * 30);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    setPreviewUrl(data.signedUrl);
  };

  const openInNewTab = async () => {
    if (!doc.storage_path) return;
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60 * 10);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTypeIcon kind={kind} />
            <span className="truncate">{doc.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="uppercase">
              {kind === "other" ? extOf(doc.storage_path || doc.title) || "file" : kind}
            </Badge>
            {doc.file_size ? <span>{fmtSize(doc.file_size)}</span> : null}
            <span>· Updated {fmtRelative(doc.updated_at)}</span>
            <span className="ml-auto truncate">{pathLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {kind === "pdf" && !previewUrl && (
              <Button size="sm" variant="outline" onClick={loadPreview}>
                Preview inline
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={openInNewTab}>
              <Download className="mr-1 h-3 w-3" />
              {kind === "pdf" ? "Open in new tab" : "Download"}
            </Button>
          </div>
          {previewUrl && kind === "pdf" && (
            <iframe
              src={previewUrl}
              title={doc.title}
              className="h-[520px] w-full rounded-md border bg-muted"
            />
          )}
          {kind === "image" && doc.storage_path && (
            <ImagePreview storagePath={doc.storage_path} title={doc.title} />
          )}
          {doc.content_text && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
              {doc.content_text}
            </pre>
          )}
          {(doc.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(doc.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImagePreview({ storagePath, title }: { storagePath: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useMemo(() => {
    (async () => {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 60 * 30);
      if (data) setUrl(data.signedUrl);
    })();
  }, [storagePath]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title}
      className="max-h-[520px] w-full rounded-md border object-contain bg-muted"
    />
  );
}

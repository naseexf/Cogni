import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtDateTime, initials } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarStyle } from "@/lib/avatar-color";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Hash, Plus, Send, Paperclip, Reply, Trash2, Pencil, X, Users, FileText, Download, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { markChatRead } from "@/hooks/use-unread-chat";


export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Team Chat — CogniLearn Portal" },
      { name: "description", content: "Internal CogniLearn team chat: channels, direct messages, file sharing and replies." },
      { property: "og:title", content: "Team Chat — CogniLearn Portal" },
      { property: "og:description", content: "Internal CogniLearn team chat: channels, direct messages, file sharing and replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Channel = {
  id: string; name: string; description: string | null; is_dm: boolean; created_by: string | null;
};
type Message = {
  id: string; channel_id: string; author_id: string | null; body: string | null;
  reply_to_id: string | null; storage_path: string | null; file_name: string | null;
  file_mime: string | null; file_size: number | null; edited_at: string | null; created_at: string;
};

function fmtSize(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ChatPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Channel | null>(null);

  const deleteChannel = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("chat_channels").delete().eq("id", pendingDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (activeId === pendingDelete.id) setActiveId(null);
    setPendingDelete(null);
    await qc.invalidateQueries({ queryKey: ["chat-channels"] });
    await qc.invalidateQueries({ queryKey: ["chat-dm-members"] });
  };


  const channelsQ = useQuery({
    queryKey: ["chat-channels"],
    queryFn: async () =>
      ((await supabase.from("chat_channels").select("*").order("created_at")).data ?? []) as Channel[],
  });
  const profilesQ = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email")).data ?? [],
  });
  const dmMembersQ = useQuery({
    queryKey: ["chat-dm-members"],
    queryFn: async () => (await supabase.from("chat_channel_members").select("channel_id,user_id")).data ?? [],
  });

  const channels = (channelsQ.data ?? []).filter((c) => !c.is_dm);
  const dms = (channelsQ.data ?? []).filter((c) => c.is_dm);

  useEffect(() => {
    if (!activeId && channels.length) setActiveId(channels[0].id);
  }, [channels, activeId]);

  const nameOf = (uid?: string | null) =>
    profilesQ.data?.find((p) => p.id === uid)?.full_name ?? "Unknown";

  const dmLabel = (c: Channel) => {
    const others = (dmMembersQ.data ?? []).filter((m) => m.channel_id === c.id && m.user_id !== user?.id);
    return others.map((o) => nameOf(o.user_id)).join(", ") || "Direct message";
  };

  const dmPeerId = (c: Channel) =>
    (dmMembersQ.data ?? []).find((m) => m.channel_id === c.id && m.user_id !== user?.id)?.user_id ?? null;


  const startDm = async (otherId: string) => {
    if (!user) return;
    const mine = (dmMembersQ.data ?? []).filter((m) => m.user_id === user.id).map((m) => m.channel_id);
    const existing = (dmMembersQ.data ?? []).find((m) => m.user_id === otherId && mine.includes(m.channel_id));
    if (existing) { setActiveId(existing.channel_id); return; }
    const { data, error } = await supabase
      .from("chat_channels")
      .insert({ name: "dm", is_dm: true, created_by: user.id })
      .select("id").single();
    if (error || !data) return toast.error(error?.message ?? "Could not start chat");
    const { error: mErr } = await supabase.from("chat_channel_members").insert([
      { channel_id: data.id, user_id: user.id },
      { channel_id: data.id, user_id: otherId },
    ]);
    if (mErr) return toast.error(mErr.message);
    await qc.invalidateQueries({ queryKey: ["chat-channels"] });
    await qc.invalidateQueries({ queryKey: ["chat-dm-members"] });
    setActiveId(data.id);
  };

  const active = (channelsQ.data ?? []).find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Channel rail */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border bg-card md:flex">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-display text-sm font-semibold">Team Chat</div>
          <Button size="icon" variant="ghost" aria-label="New channel" onClick={() => setNewChannelOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="sidebar-scroll flex-1 overflow-y-auto p-2">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Channels</div>
          <ul className="mb-4 space-y-0.5">
            {channels.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left text-sm",
                    activeId === c.id ? "bg-accent font-medium" : "hover:bg-accent/60"
                  )}
                >
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                </button>
                <button
                  aria-label={`Delete channel ${c.name}`}
                  onClick={() => setPendingDelete(c)}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Direct messages</div>
          <ul className="space-y-0.5">
            {dms.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-left text-sm",
                    activeId === c.id ? "bg-accent font-medium" : "hover:bg-accent/60"
                  )}
                >
                  <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]" style={avatarStyle(dmPeerId(c) ?? c.id)}>{initials(dmLabel(c))}</AvatarFallback></Avatar>
                  <span className="truncate">{dmLabel(c)}</span>
                </button>
                <button
                  aria-label="Delete conversation"
                  onClick={() => setPendingDelete(c)}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t pt-2">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Team</div>
            <ul className="space-y-0.5">
              {(profilesQ.data ?? []).filter((p) => p.id !== user?.id).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => startDm(p.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span className="truncate">{p.full_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card">
        {active ? (
          <Conversation
            key={active.id}
            channel={active}
            title={active.is_dm ? dmLabel(active) : `#${active.name}`}
            nameOf={nameOf}
            canModerate={isAdmin}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p className="text-sm">Pick a channel to start chatting.</p>
            <Button className="brand-gradient" onClick={() => setNewChannelOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />New channel
            </Button>
          </div>
        )}
      </section>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {pendingDelete?.is_dm ? "conversation" : `#${pendingDelete?.name}`}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All messages and attachments in it will be permanently removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteChannel}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <NewChannelDialog
        open={newChannelOpen}
        onOpenChange={setNewChannelOpen}
        onCreated={(id) => { qc.invalidateQueries({ queryKey: ["chat-channels"] }); setActiveId(id); }}
      />
    </div>
  );
}

function Conversation({
  channel, title, nameOf, canModerate,
}: { channel: Channel; title: string; nameOf: (id?: string | null) => string; canModerate: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgsQ = useQuery({
    queryKey: ["chat-messages", channel.id],
    queryFn: async () =>
      ((await supabase.from("chat_messages").select("*").eq("channel_id", channel.id).order("created_at")).data ?? []) as Message[],
  });

  useEffect(() => {
    const ch = supabase
      .channel(`chat:${channel.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channel.id}` },
        () => qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel.id, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    markChatRead();
  }, [msgsQ.data?.length]);


  const byId = useMemo(() => {
    const m = new Map<string, Message>();
    (msgsQ.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [msgsQ.data]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: channel.id, author_id: user.id, body: text.trim(), reply_to_id: replyTo?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] });
  };

  const upload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    const path = `${channel.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: channel.id, author_id: user.id, body: text.trim() || null, reply_to_id: replyTo?.id ?? null,
      storage_path: path, file_name: file.name, file_mime: file.type || null, file_size: file.size,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] });
  };

  const openFile = async (m: Message) => {
    if (!m.storage_path) return;
    const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(m.storage_path, 3600);
    if (error || !data) return toast.error(error?.message ?? "Could not open file");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (m: Message) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("chat_messages")
      .update({ body: editText.trim(), edited_at: new Date().toISOString() })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["chat-messages", channel.id] });
  };

  return (
    <>
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <div className="font-display text-sm font-semibold">{title}</div>
        {channel.description && <span className="truncate text-xs text-muted-foreground">{channel.description}</span>}
      </header>

      <div
        className="sidebar-scroll flex-1 space-y-3 overflow-y-auto p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
      >
        {(msgsQ.data ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
        )}
        {(msgsQ.data ?? []).map((m) => {
          const mine = m.author_id === user?.id;
          const parent = m.reply_to_id ? byId.get(m.reply_to_id) : null;
          return (
            <div key={m.id} className={cn("group flex gap-3", mine && "flex-row-reverse")}>
              <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px]" style={avatarStyle(m.author_id)}>{initials(nameOf(m.author_id))}</AvatarFallback>
              </Avatar>
              <div className={cn("flex min-w-0 max-w-[75%] flex-col", mine && "items-end")}>
                <div className={cn("flex items-baseline gap-2", mine && "flex-row-reverse")}>
                  <span className="text-sm font-medium">{mine ? "You" : nameOf(m.author_id)}</span>
                  <span className="text-[11px] text-muted-foreground">{fmtDateTime(m.created_at)}</span>
                  {m.edited_at && <span className="text-[11px] text-muted-foreground">(edited)</span>}
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Reply" onClick={() => setReplyTo(m)}>
                      <Reply className="h-3.5 w-3.5" />
                    </Button>
                    {mine && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Edit"
                        onClick={() => { setEditing(m); setEditText(m.body ?? ""); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(mine || canModerate) && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label="Delete" onClick={() => remove(m)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-1 rounded-2xl px-3 py-2",
                    mine
                      ? "rounded-tr-sm bg-[color:var(--brand-teal)]/15 text-foreground"
                      : "rounded-tl-sm bg-muted"
                  )}
                >
                  {parent && (
                    <div className="mb-1 border-l-2 border-[color:var(--brand-teal)] pl-2 text-xs text-muted-foreground">
                      <span className="font-medium">{nameOf(parent.author_id)}</span>{" "}
                      <span className="line-clamp-1">{parent.body ?? parent.file_name}</span>
                    </div>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
                  {m.storage_path && (
                    <button
                      onClick={() => openFile(m)}
                      className="mt-1 flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4 text-[color:var(--brand-teal)]" />
                      <span className="truncate">{m.file_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{fmtSize(m.file_size)}</Badge>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
            <Reply className="h-3.5 w-3.5" />
            <span className="truncate">Replying to {nameOf(replyTo.author_id)}: {replyTo.body ?? replyTo.file_name}</span>
            <button className="ml-auto" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
          <Button variant="outline" size="icon" aria-label="Attach file" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${title}`}
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
          />
          <Button className="brand-gradient" size="icon" aria-label="Send" disabled={busy || !text.trim()} onClick={send}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit message</DialogTitle></DialogHeader>
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="brand-gradient" onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewChannelDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (name.length < 2) return toast.error("Enter a channel name");
    setBusy(true);
    const { data, error } = await supabase.from("chat_channels")
      .insert({ name, description: f.description || null, is_dm: false, created_by: user?.id })
      .select("id").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not create channel");
    toast.success("Channel created");
    setF({ name: "", description: "" });
    onOpenChange(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New channel</DialogTitle></DialogHeader>
        <form onSubmit={create} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cn">Name</Label>
            <Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. partnerships" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cd">Description</Label>
            <Input id="cd" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What is this channel about?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="brand-gradient" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

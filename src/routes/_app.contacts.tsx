import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { fmtDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Contact as ContactIcon, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contacts")({ component: ContactsPage });

type ContactRow = {
  id: string;
  name: string;
  designation: string | null;
  partnership_id: string | null;
  college: string | null;
  phone: string | null;
  email: string | null;
  last_contacted: string | null;
  notes: string | null;
};

function ContactsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const contactsQ = useQuery({
    queryKey: ["contacts"],
    queryFn: async () =>
      (await supabase.from("contacts").select("*").order("name")).data ?? [],
  });

  const partnershipsQ = useQuery({
    queryKey: ["partnerships-lite"],
    queryFn: async () =>
      (await supabase.from("partnerships").select("id,name").order("name")).data ?? [],
  });

  const partnerMap = useMemo(() => {
    const m = new Map<string, string>();
    (partnershipsQ.data ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [partnershipsQ.data]);

  const contacts = (contactsQ.data ?? []) as ContactRow[];

  const collegeOptions = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      const name = c.partnership_id ? partnerMap.get(c.partnership_id) : c.college;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [contacts, partnerMap]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      const college = c.partnership_id ? partnerMap.get(c.partnership_id) : c.college;
      if (collegeFilter !== "all" && college !== collegeFilter) return false;
      if (!needle) return true;
      return [c.name, c.designation, college, c.email, c.phone]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [contacts, partnerMap, collegeFilter, q]);

  const removeContact = async (id: string) => {
    if (!confirm("Remove this contact?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contact removed");
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at partner colleges — professors, coordinators, admin staff."
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="brand-gradient">
            <Plus className="mr-1.5 h-4 w-4" /> Add contact
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone…"
          className="max-w-xs"
        />
        <Select value={collegeFilter} onValueChange={setCollegeFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="College" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colleges</SelectItem>
            {collegeOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ContactIcon}
          title="No contacts yet"
          description="Add professors, coordinators, and admin staff at partner colleges to keep every relationship in one place."
          action={
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="brand-gradient">
              <Plus className="mr-1.5 h-4 w-4" /> Add contact
            </Button>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Designation</th>
                <th className="p-3">College</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Last contacted</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const college = c.partnership_id ? partnerMap.get(c.partnership_id) : c.college;
                return (
                  <tr key={c.id} className="group border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.designation || "—"}</td>
                    <td className="p-3 text-muted-foreground">{college || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                      {!c.email && !c.phone && "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtDate(c.last_contacted)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true); }} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeContact(c.id)} aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        partnerships={partnershipsQ.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["contacts"] })}
      />
    </>
  );
}

function ContactDialog({ open, onOpenChange, editing, partnerships, onSaved }: any) {
  const empty = {
    name: "", designation: "", partnership_id: "", college: "",
    phone: "", email: "", last_contacted: "", notes: "",
  };
  const [f, setF] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setF(editing ? {
        name: editing.name || "",
        designation: editing.designation || "",
        partnership_id: editing.partnership_id || "",
        college: editing.college || "",
        phone: editing.phone || "",
        email: editing.email || "",
        last_contacted: editing.last_contacted || "",
        notes: editing.notes || "",
      } : empty);
    }
  }, [open, editing]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.error("Enter a name");
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      designation: f.designation || null,
      partnership_id: f.partnership_id || null,
      college: f.partnership_id ? null : (f.college || null),
      phone: f.phone || null,
      email: f.email || null,
      last_contacted: f.last_contacted || null,
      notes: f.notes || null,
    };
    const q = editing
      ? supabase.from("contacts").update(payload).eq("id", editing.id)
      : supabase.from("contacts").insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Contact updated" : "Contact added");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Designation / Role</Label><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} placeholder="e.g. HoD, TPO, Coordinator" /></div>
            <div>
              <Label>College (partnership)</Label>
              <Select value={f.partnership_id || "none"} onValueChange={(v) => setF({ ...f, partnership_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Link to partnership" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {partnerships.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!f.partnership_id && (
            <div><Label>College name (if not linked)</Label><Input value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><Label>Last contacted</Label><Input type="date" value={f.last_contacted} onChange={(e) => setF({ ...f, last_contacted: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

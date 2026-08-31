import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { fmtDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Trash2, Pencil, Download, ChevronRight, ChevronDown } from "lucide-react";
import { exportStyledSheet } from "@/lib/export-excel-styled";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/fees")({ component: FeesPage });

const LOCATIONS = ["Calicut", "Trivandrum"] as const;
const YEARS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "2026 passout", "2027 passout", "2028 passout", "2029 passout"] as const;
const MODES = [
  { key: "daily", label: "Daily" },
  { key: "duty_leave", label: "Duty leave" },
] as const;
const modeLabel = (m?: string | null) => MODES.find((x) => x.key === m)?.label ?? "Daily";

type FeeRecord = {
  id: string;
  batch: string;
  location: string;
  student_name: string;
  phone: string | null;
  email: string | null;
  college: string | null;
  year_of_study: string | null;
  attendance_mode: string | null;
  amount: number;
  paid: boolean;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
};

type Batch = { id: string; name: string; location: string };

const fmtMoney = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function FeesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [paidFilter, setPaidFilter] = useState<string>("all");
  const [locFilter, setLocFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [batchOpen, setBatchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBatch, setExportBatch] = useState<string>("__all");
  const [addFor, setAddFor] = useState<Batch | null>(null);
  const [editing, setEditing] = useState<FeeRecord | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});


  const feesQ = useQuery({
    queryKey: ["fee_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_records" as any).select("*").order("student_name");
      if (error) throw error;
      return (data ?? []) as unknown as FeeRecord[];
    },
  });

  const batchesQ = useQuery({
    queryKey: ["fee_batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_batches" as any).select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Batch[];
    },
  });

  const fees = feesQ.data ?? [];
  const batches = batchesQ.data ?? [];

  const colleges = useMemo(
    () => Array.from(new Set(fees.map((f) => (f.college ?? "").trim()).filter(Boolean))).sort(),
    [fees],
  );
  const years = useMemo(() => {
    const used = fees.map((f) => (f.year_of_study ?? "").trim()).filter(Boolean);
    return Array.from(new Set([...YEARS, ...used]));
  }, [fees]);

  const matches = (f: FeeRecord) => {
    if (paidFilter === "paid" && !f.paid) return false;
    if (paidFilter === "unpaid" && f.paid) return false;
    if (yearFilter !== "all" && (f.year_of_study ?? "") !== yearFilter) return false;
    if (collegeFilter !== "all" && (f.college ?? "") !== collegeFilter) return false;
    if (modeFilter !== "all" && (f.attendance_mode ?? "daily") !== modeFilter) return false;
    if (q && !f.student_name.toLowerCase().includes(q.toLowerCase()) && !(f.college ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  };

  const sections = useMemo(() => {
    return batches
      .filter((b) => locFilter === "all" || b.location === locFilter)
      .map((b) => {
        const rows = fees.filter((f) => f.batch === b.name && f.location === b.location && matches(f));
        const all = fees.filter((f) => f.batch === b.name && f.location === b.location);
        const paid = all.filter((f) => f.paid);
        return {
          batch: b,
          rows,
          total: all.length,
          paidCount: paid.length,
          collected: paid.reduce((a, f) => a + Number(f.amount), 0),
          pending: all.filter((f) => !f.paid).reduce((a, f) => a + Number(f.amount), 0),
        };
      });
  }, [batches, fees, q, paidFilter, locFilter, yearFilter, collegeFilter, modeFilter]);


  const togglePaid = async (row: FeeRecord) => {
    const nextPaid = !row.paid;
    const { error } = await supabase.from("fee_records" as any).update({
      paid: nextPaid,
      paid_date: nextPaid ? new Date().toISOString().slice(0, 10) : null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["fee_records"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this fee record?")) return;
    const { error } = await supabase.from("fee_records" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["fee_records"] });
  };

  const deleteBatch = async (b: Batch, count: number) => {
    if (count > 0) return toast.error("Remove the students in this batch first");
    if (!confirm(`Delete batch "${b.name}"?`)) return;
    const { error } = await supabase.from("fee_batches" as any).delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Batch deleted");
    qc.invalidateQueries({ queryKey: ["fee_batches"] });
  };

  const parseNotes = (notes: string | null) => {
    const out = { status: "", registered: "", approved: "", attended: "", started: "" };
    if (!notes) return out;
    for (const part of notes.split("|").map((p) => p.trim()).filter(Boolean)) {
      const m = part.match(/^(Status|Registered|Approved|Attended)\s*:\s*(.*)$/i);
      if (m) {
        const key = m[1].toLowerCase() as "status" | "registered" | "approved" | "attended";
        out[key] = m[2].trim();
        continue;
      }
      const s = part.match(/^Started\s+(.*)$/i);
      if (s) out.started = s[1].trim();
    }
    return out;
  };

  const runExport = async (batchKey: string) => {
    const rows = fees
      .filter((f) => batchKey === "__all" || `${f.batch}||${f.location}` === batchKey)
      .map((f) => {
        const n = parseNotes(f.notes);
        return {
          batch: f.batch,
          location: f.location,
          student: f.student_name,
          phone: f.phone ?? "",
          email: f.email ?? "",
          college: f.college ?? "",
          year: f.year_of_study ?? "",
          attendance: modeLabel(f.attendance_mode),
          amount: Number(f.amount),
          paid: f.paid ? "Yes" : "No",
          paid_on: f.paid_date ?? "",
          method: f.payment_method ?? "",
          status: n.status,
          registered: n.registered,
          approved: n.approved,
          attended: n.attended,
          started: n.started,
        };
      });

    if (rows.length === 0) return toast.error("No records to export for that batch");

    await exportStyledSheet(
      [
        { header: "Batch", key: "batch", width: 22 },
        { header: "Location", key: "location", width: 14 },
        { header: "Student", key: "student", width: 26 },
        { header: "Phone", key: "phone", width: 16 },
        { header: "Email", key: "email", width: 28 },
        { header: "College", key: "college", width: 30 },
        { header: "Year", key: "year", width: 14 },
        { header: "Attendance", key: "attendance", width: 14 },
        { header: "Amount", key: "amount", width: 12 },
        { header: "Paid", key: "paid", width: 8 },
        { header: "Paid On", key: "paid_on", width: 14 },
        { header: "Method", key: "method", width: 14 },
        { header: "Status", key: "status", width: 14 },
        { header: "Registered", key: "registered", width: 12 },
        { header: "Approved", key: "approved", width: 12 },
        { header: "Attended", key: "attended", width: 12 },
        { header: "Started Date", key: "started", width: 20 },
      ],
      rows,
      batchKey === "__all" ? "fee-tracker-all-batches" : `fee-tracker-${batchKey.replace("||", "-")}`.replace(/\s+/g, "-").toLowerCase(),
      "Fee records",
    );
    setExportOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Fee Tracker"
        description="Each batch is its own section. Create a batch, then add students inside it."
        actions={<>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="mr-1.5 h-4 w-4" />Export</Button>
          <Button onClick={() => setBatchOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Add batch</Button>
        </>}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Export fee records</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Batch</Label>
            <Select value={exportBatch} onValueChange={setExportBatch}>
              <SelectTrigger><SelectValue placeholder="Choose a batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All batches</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={`${b.name}||${b.location}`}>{b.name} — {b.location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button className="brand-gradient" onClick={() => runExport(exportBatch)}>
              <Download className="mr-1.5 h-4 w-4" />Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student / college…" className="w-64" />
        <Select value={locFilter} onValueChange={setLocFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Year of study" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={collegeFilter} onValueChange={setCollegeFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="College" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colleges</SelectItem>
            {colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Attendance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attendance</SelectItem>
            {MODES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paidFilter} onValueChange={setPaidFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {sections.length === 0 ? (
        <EmptyState icon={Wallet} title="No batches yet"
          description="Create a batch first — students are added inside a batch."
          action={<Button onClick={() => setBatchOpen(true)} className="brand-gradient"><Plus className="mr-1.5 h-4 w-4" />Add batch</Button>} />
      ) : (
        <div className="space-y-4">
          {sections.map((s) => {
            const pct = s.total ? Math.round((s.paidCount / s.total) * 100) : 0;
            const open = !collapsed[s.batch.id];
            return (
              <Card key={s.batch.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 p-3">
                  <button className="flex items-center gap-2 text-left" onClick={() => setCollapsed((c) => ({ ...c, [s.batch.id]: open }))}>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{s.batch.name}</span>
                    <Badge variant="outline" className="text-[10px]">{s.batch.location}</Badge>
                  </button>
                  <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{s.paidCount}/{s.total} paid · {pct}%</span>
                    <span>Collected: {fmtMoney(s.collected)}</span>
                    <span>Pending: {fmtMoney(s.pending)}</span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setAddFor(s.batch)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Add student
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete batch" onClick={() => deleteBatch(s.batch, s.total)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {open && (
                  s.rows.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {s.total === 0 ? "No students in this batch yet." : "No students match the current filters."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Student</th>
                            <th className="p-3">College</th>
                            <th className="p-3">Year</th>
                            <th className="p-3">Attendance</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Paid on</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.map((f) => (
                            <tr key={f.id} className="border-t">
                              <td className="p-3"><Checkbox checked={f.paid} onCheckedChange={() => togglePaid(f)} /></td>
                              <td className="p-3 font-medium">
                                {f.student_name}
                                {f.paid ? <Badge variant="secondary" className="ml-2 text-[10px]">Paid</Badge>
                                        : <Badge variant="outline" className="ml-2 text-[10px]">Unpaid</Badge>}
                              </td>
                              <td className="p-3 text-muted-foreground">{f.college || "—"}</td>
                              <td className="p-3 text-muted-foreground">{f.year_of_study || "—"}</td>
                              <td className="p-3"><Badge variant="outline" className="text-[10px]">{modeLabel(f.attendance_mode)}</Badge></td>
                              <td className="p-3 text-muted-foreground">{f.phone || "—"}</td>
                              <td className="p-3">{fmtMoney(Number(f.amount))}</td>
                              <td className="p-3 text-muted-foreground">{fmtDate(f.paid_date)}</td>

                              <td className="p-3 text-right">
                                <Button size="icon" variant="ghost" onClick={() => setEditing(f)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => remove(f.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NewBatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["fee_batches"] })}
      />

      <FeeDialog
        open={!!addFor || !!editing}
        onOpenChange={(v) => { if (!v) { setAddFor(null); setEditing(null); } }}
        record={editing}
        batch={addFor}
        onSaved={() => qc.invalidateQueries({ queryKey: ["fee_records"] })}
      />
    </>
  );
}

function NewBatchDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState<string>("Calicut");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = name.trim();
    if (!batch) return toast.error("Enter a batch name");
    setBusy(true);
    const { error } = await supabase.from("fee_batches" as any).insert({ name: batch, location, created_by: user?.id });
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That batch already exists" : error.message);
    toast.success("Batch created");
    setName("");
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New batch</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Batch name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. August 2026" required /></div>
          <div><Label>Location *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">The batch gets its own section — add students from inside it.</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Creating…" : "Create batch"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeeDialog({ open, onOpenChange, record, batch, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: FeeRecord | null;
  batch?: Batch | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const empty = { student_name: "", phone: "", email: "", college: "", year_of_study: "", attendance_mode: "daily", amount: "", paid: false, paid_date: "", payment_method: "", notes: "" };
  const [f, setF] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    if (open) {
      if (record) {
        setF({
          student_name: record.student_name,
          phone: record.phone ?? "", email: record.email ?? "", college: record.college ?? "",
          year_of_study: record.year_of_study ?? "", attendance_mode: record.attendance_mode ?? "daily",
          amount: String(record.amount ?? ""), paid: record.paid, paid_date: record.paid_date ?? "",
          payment_method: record.payment_method ?? "", notes: record.notes ?? "",
        });
      } else {
        setF({ ...empty });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id, batch?.id]);


  const target = record ? { batch: record.batch, location: record.location } : { batch: batch?.name ?? "", location: batch?.location ?? "" };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.student_name.trim().length < 2) return toast.error("Enter a student name");
    if (!target.batch) return toast.error("Missing batch");
    setBusy(true);
    const payload = {
      batch: target.batch,
      location: target.location,
      student_name: f.student_name.trim(),
      phone: f.phone || null,
      email: f.email || null,
      college: f.college || null,
      year_of_study: f.year_of_study || null,
      attendance_mode: f.attendance_mode || "daily",

      amount: Number(f.amount) || 0,
      paid: !!f.paid,
      paid_date: f.paid && f.paid_date ? f.paid_date : (f.paid ? new Date().toISOString().slice(0, 10) : null),
      payment_method: f.payment_method || null,
      notes: f.notes || null,
    };
    const { error } = record
      ? await supabase.from("fee_records" as any).update(payload).eq("id", record.id)
      : await supabase.from("fee_records" as any).insert({ ...payload, created_by: user?.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(record ? "Updated" : "Student added");
    onSaved(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Edit fee record" : `Add student — ${target.batch} (${target.location})`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Student name *</Label><Input value={f.student_name} onChange={(e) => setF({ ...f, student_name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><Label>College</Label><Input value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Year / Passout</Label>
              <Select value={f.year_of_study || "none"} onValueChange={(v) => setF({ ...f, year_of_study: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Attendance</Label>
              <Select value={f.attendance_mode || "daily"} onValueChange={(v) => setF({ ...f, attendance_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (₹)</Label><Input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div><Label>Payment method</Label><Input value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })} placeholder="UPI / Bank / Cash" /></div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="paid" checked={f.paid} onCheckedChange={(v) => setF({ ...f, paid: !!v })} />
            <Label htmlFor="paid" className="cursor-pointer">Paid</Label>
          </div>
          {f.paid && (
            <div><Label>Paid on</Label><Input type="date" value={f.paid_date} onChange={(e) => setF({ ...f, paid_date: e.target.value })} /></div>
          )}
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="brand-gradient">{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

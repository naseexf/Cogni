export const STAGES = [
  { key: "prospecting", label: "Prospecting" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "under_review", label: "Under Review" },
  { key: "negotiation", label: "Negotiation" },
  { key: "signed_active", label: "Signed / Active" },
  { key: "on_hold", label: "On Hold" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"];

export const TASK_STATUSES = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
] as const;
export type TaskStatusKey = (typeof TASK_STATUSES)[number]["key"];

export const TASK_PRIORITIES = [
  { key: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { key: "medium", label: "Medium", color: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]" },
  { key: "high", label: "High", color: "bg-destructive/15 text-destructive" },
] as const;

export const EVENT_TYPES = [
  { key: "session", label: "Session", color: "oklch(0.72 0.12 178)" },
  { key: "deadline", label: "Deadline", color: "oklch(0.65 0.2 25)" },
  { key: "internal", label: "Internal", color: "oklch(0.62 0.12 225)" },
  { key: "college_visit", label: "College Visit", color: "oklch(0.7 0.14 155)" },
] as const;
export type EventTypeKey = (typeof EVENT_TYPES)[number]["key"];

export const DOC_TYPES = [
  { key: "proposal", label: "Proposal" },
  { key: "event_report", label: "Event Report" },
  { key: "promotional", label: "Promotional Material" },
  { key: "internal_note", label: "Internal Note" },
  { key: "other", label: "Other" },
] as const;

export const INTERN_STATUSES = [
  { key: "applied", label: "Not Started" },
  { key: "active", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
] as const;

export const ASSET_TYPES = [
  { key: "poster", label: "Poster" },
  { key: "logo", label: "Logo" },
  { key: "business_card", label: "Business Card" },
  { key: "whatsapp_template", label: "WhatsApp Template" },
  { key: "other", label: "Other" },
] as const;

export const TEMPLATE_TYPES = [
  { key: "brochure", label: "Brochure" },
  { key: "slides", label: "PPT Slides" },
  { key: "write_up", label: "Write Up" },
  { key: "poster", label: "Poster" },
  { key: "visiting_card", label: "Visiting Card" },
  { key: "proposal", label: "Proposal" },
  { key: "event_report", label: "Event Report" },
  { key: "business_card", label: "Business Card" },
  { key: "other", label: "Other (any file)" },
] as const;

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
export function fmtRelative(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const day = 24 * 3600 * 1000;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return fmtDate(date);
}
export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

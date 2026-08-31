import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Handshake, ListChecks, CalendarDays, FolderOpen, BarChart3,
  Palette, FileStack, Users, Network, Megaphone, Search, LogOut, Menu, X, Bell,
  UserCog, KeyRound, UserPlus, Wallet, Contact, Settings as SettingsIcon, MessageSquare, CalendarRange,
} from "lucide-react";
import { CogniLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarStyle } from "@/lib/avatar-color";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cognilearnLogoUrl } from "@/lib/logo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUnreadChat } from "@/hooks/use-unread-chat";
import { displayUsername } from "@/lib/username";


type NavItem = { to: string; label: string; icon: any; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/partnerships", label: "Partnership Pipeline", icon: Handshake },
  { to: "/contacts", label: "Contacts", icon: Contact },
  { to: "/tasks", label: "Tasks & Phases", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/schedule", label: "Task schedule", icon: CalendarRange },
  { to: "/documents", label: "Documents & Reports", icon: FolderOpen },
  { to: "/gantt", label: "Gantt Chart", icon: BarChart3 },
  { to: "/fees", label: "Fee Tracker", icon: Wallet },
  { to: "/assets", label: "Brand & Assets", icon: Palette },
  { to: "/templates", label: "Templates", icon: FileStack },
  { to: "/team", label: "Team Directory", icon: Users },
  { to: "/org", label: "Org Chart", icon: Network },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/chat", label: "Team Chat", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: SettingsIcon, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();
  const unread = useUnreadChat();
  const nav = NAV.filter((n) => !n.adminOnly || isAdmin);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);


  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <img src={cognilearnLogoUrl} className="hidden" alt="" aria-hidden />
          <SidebarBrand />
          <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {nav.map((n) => {
              const active = location.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-[color:var(--brand-teal)]")} />
                    <span className="truncate">{n.label}</span>
                    {n.to === "/chat" && unread > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--brand-teal)] px-1.5 text-[10px] font-semibold text-black">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>

                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/50">
          JHF IT Innovations
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <CogniLogo showWordmark={false} className="[&_img]:h-9 [&_img]:w-9" />
      <div className="font-display text-base font-semibold tracking-tight text-white">
        Cogni<span className="text-[color:var(--brand-teal)]">Learn</span>
      </div>
    </Link>
  );
}

function TopBar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "";
  const initials = (profile?.full_name || user?.email || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } as any });
  };

  const openEdit = () => {
    setNameDraft(profile?.full_name || "");
    setEditOpen(true);
  };

  const saveName = async () => {
    if (!user) return;
    const name = nameDraft.trim();
    if (!name) { toast.error("Enter a name"); return; }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSavingName(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Name updated");
    setEditOpen(false);
    qc.invalidateQueries({ queryKey: ["me-profile", user.id] });
    qc.invalidateQueries({ queryKey: ["profiles"] });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <button className="md:hidden" onClick={onOpenMobile} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <form onSubmit={doSearch} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks, docs, partnerships…"
          className="pl-9"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs" style={avatarStyle(user?.id)}>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <div className="text-sm font-medium leading-none">{displayName}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {role === "admin" ? <Badge variant="secondary" className="h-4 px-1 text-[10px]">Admin</Badge> : "Member"}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="truncate">{displayName}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{displayUsername(user?.email)}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEdit(); }}>
              <UserCog className="mr-2 h-4 w-4" /> Edit display name
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setPw({ next: "", confirm: "" }); setPwOpen(true); }}>
              <KeyRound className="mr-2 h-4 w-4" /> Change password
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/team" })}>
              <UserPlus className="mr-2 h-4 w-4" /> Team directory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit display name</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveName} disabled={savingName} className="brand-gradient">
              {savingName ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pw1">New password</Label>
              <Input id="pw1" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input id="pw2" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button
              className="brand-gradient"
              disabled={savingPw}
              onClick={async () => {
                if (pw.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                if (pw.next !== pw.confirm) { toast.error("Passwords do not match"); return; }
                setSavingPw(true);
                const { error } = await supabase.auth.updateUser({ password: pw.next });
                setSavingPw(false);
                if (error) { toast.error(error.message); return; }
                toast.success("Password updated");
                setPwOpen(false);
              }}
            >
              {savingPw ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CogniLogo } from "@/components/brand/logo";
import { Eye, EyeOff } from "lucide-react";
import { toLoginEmail } from "@/lib/username";



import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden flex-col justify-between p-10 md:flex" style={{ background: "linear-gradient(160deg, oklch(0.22 0.035 235), oklch(0.28 0.06 210))" }}>
          <CogniLogo className="text-white [&_span]:text-white [&_span_span]:text-white/90" />
          <div className="flex-1" />

          <div className="text-white">

            <h1 className="font-display text-4xl font-semibold leading-tight">
              The CogniLearn <br />operating portal.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/70">
              Partnerships, tasks, interns and every moving piece of the Experienceship program —
              in one focused workspace for the team.
            </p>
            <p className="mt-8 text-xs uppercase tracking-widest text-white/50">
              An initiative of JHF IT Innovations Pvt. Ltd.
            </p>
          </div>
        </div>

        {/* Right form */}
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-sm border-border/60 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-center md:hidden">
              <CogniLogo />
            </div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="forgot"><ForgotForm /></TabsContent>
            </Tabs>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Internal use only. Contact an Admin to be added to the team.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (username.trim().length < 2) return setErr("Enter your username");
    if (!password) return setErr("Enter your password");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: toLoginEmail(username),
      password,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="si-user">Username</Label>
        <Input id="si-user" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pw">Password</Label>
        <div className="relative">
          <Input id="si-pw" type={showPw ? "text" : "password"} autoComplete="current-password" className="pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="w-full brand-gradient">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}



function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const eR = emailSchema.safeParse(email);
    if (!eR.success) return setErr(eR.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(eR.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg("Check your inbox for the reset link.");
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fp-email">Work email</Label>
        <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-[color:var(--success)]">{msg}</p>}
      <Button type="submit" disabled={busy} className="w-full brand-gradient">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

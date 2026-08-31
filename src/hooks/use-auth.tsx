import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "member" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id);
          const roles = data?.map((r) => r.role) ?? [];
          setRole(roles.includes("admin") ? "admin" : roles.includes("member") ? "member" : "member");
        }, 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const { data: rd } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        const roles = rd?.map((r) => r.role) ?? [];
        setRole(roles.includes("admin") ? "admin" : "member");
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Revocation watcher: if the account was removed by an admin, sign out immediately.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      const revoked =
        (error && (error.status === 401 || error.status === 403 || /user.*not.*found/i.test(error.message))) ||
        (!error && !data.user);
      if (revoked) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") window.location.href = "/auth";
      }
    };
    const id = window.setInterval(check, 60_000);
    const onFocus = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    void check();
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id]);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        loading,
        isAdmin: role === "admin",
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

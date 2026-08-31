import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const KEY = "cogni:chat-last-read";

export function getChatLastRead(): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  return localStorage.getItem(KEY) ?? new Date(0).toISOString();
}

export function markChatRead() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, new Date().toISOString());
  window.dispatchEvent(new Event("cogni:chat-read"));
}

export function useUnreadChat() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["chat-unread", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const since = getChatLastRead();
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since)
        .neq("author_id", user!.id);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ["chat-unread", user.id] });
    window.addEventListener("cogni:chat-read", refresh);
    const ch = supabase
      .channel("chat-unread-watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("cogni:chat-read", refresh);
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return q.data ?? 0;
}

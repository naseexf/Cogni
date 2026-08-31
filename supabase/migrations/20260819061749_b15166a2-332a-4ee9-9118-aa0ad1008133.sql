CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_dm boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channels TO authenticated;
GRANT ALL ON public.chat_channels TO service_role;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channel_members TO authenticated;
GRANT ALL ON public.chat_channel_members TO service_role;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text,
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  storage_path text,
  file_name text,
  file_mime text,
  file_size bigint,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_channel_created_idx ON public.chat_messages (channel_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_chat_channel(_channel_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = _channel_id
      AND public.is_team_member(_user_id)
      AND (
        c.is_dm = false
        OR EXISTS (SELECT 1 FROM public.chat_channel_members m WHERE m.channel_id = c.id AND m.user_id = _user_id)
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_chat_channel(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_chat_channel(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_chat_channel(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "chat_channels_select" ON public.chat_channels FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()) AND (is_dm = false OR EXISTS (SELECT 1 FROM public.chat_channel_members m WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid())));
CREATE POLICY "chat_channels_insert" ON public.chat_channels FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "chat_channels_update" ON public.chat_channels FOR UPDATE TO authenticated
USING (public.is_team_member(auth.uid()) AND is_dm = false) WITH CHECK (public.is_team_member(auth.uid()) AND is_dm = false);
CREATE POLICY "chat_channels_delete" ON public.chat_channels FOR DELETE TO authenticated
USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

CREATE POLICY "chat_members_select" ON public.chat_channel_members FOR SELECT TO authenticated
USING (public.is_team_member(auth.uid()));
CREATE POLICY "chat_members_insert" ON public.chat_channel_members FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "chat_members_delete" ON public.chat_channel_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT TO authenticated
USING (public.can_access_chat_channel(channel_id, auth.uid()));
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_access_chat_channel(channel_id, auth.uid()));
CREATE POLICY "chat_messages_update" ON public.chat_messages FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "chat_messages_delete" ON public.chat_messages FOR DELETE TO authenticated
USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

CREATE TRIGGER update_chat_channels_updated_at BEFORE UPDATE ON public.chat_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files' AND public.is_team_member(auth.uid()));
CREATE POLICY "chat_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND public.is_team_member(auth.uid()) AND owner = auth.uid());
CREATE POLICY "chat_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-files' AND owner = auth.uid());

INSERT INTO public.chat_channels (name, description, is_dm) VALUES
  ('general', 'Team-wide discussion', false),
  ('random', 'Anything goes', false);
CREATE OR REPLACE FUNCTION public.can_access_chat_channel(_channel_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
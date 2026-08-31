DROP POLICY IF EXISTS chat_channels_select ON public.chat_channels;
CREATE POLICY chat_channels_select ON public.chat_channels
FOR SELECT TO authenticated
USING (
  public.is_team_member(auth.uid())
  AND (
    is_dm = false
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_channel_members m
      WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid()
    )
  )
);
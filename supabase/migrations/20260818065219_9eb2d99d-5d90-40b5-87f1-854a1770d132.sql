
-- 1) Helper: verifies the caller is a registered team member (has a profile row)
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;

-- 2) Replace always-true write policies with team-member scoped ones
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'announcements','assets','contacts','document_versions','documents','events',
    'initiatives','interns','org_nodes','partnership_notes','partnerships',
    'task_comments','templates'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated team full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Team members can read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Team members can delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()))', t);
  END LOOP;
END $$;

-- fee_records
DROP POLICY IF EXISTS "Team can view fee records" ON public.fee_records;
DROP POLICY IF EXISTS "Team can insert fee records" ON public.fee_records;
DROP POLICY IF EXISTS "Team can update fee records" ON public.fee_records;
DROP POLICY IF EXISTS "Team can delete fee records" ON public.fee_records;
CREATE POLICY "Team members can read fee records" ON public.fee_records FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert fee records" ON public.fee_records FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update fee records" ON public.fee_records FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete fee records" ON public.fee_records FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));

-- document_folders: tighten writes to team members too (keep root protection)
DROP POLICY IF EXISTS "Authenticated can read folders" ON public.document_folders;
DROP POLICY IF EXISTS "Authenticated can insert non-root folders" ON public.document_folders;
DROP POLICY IF EXISTS "Authenticated can update non-root folders" ON public.document_folders;
DROP POLICY IF EXISTS "Authenticated can delete non-root folders" ON public.document_folders;
CREATE POLICY "Team members can read folders" ON public.document_folders FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert non-root folders" ON public.document_folders FOR INSERT TO authenticated WITH CHECK (is_root = false AND public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update non-root folders" ON public.document_folders FOR UPDATE TO authenticated USING (is_root = false AND public.is_team_member(auth.uid())) WITH CHECK (is_root = false AND public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete non-root folders" ON public.document_folders FOR DELETE TO authenticated USING (is_root = false AND public.is_team_member(auth.uid()));

-- 3) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

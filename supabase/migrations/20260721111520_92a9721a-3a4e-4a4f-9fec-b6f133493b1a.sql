
-- Helper: drop every existing policy on a table, then add a single "authenticated can do everything" policy.
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'announcements','assets','document_versions','documents','events',
    'initiatives','interns','org_nodes','partnership_notes','partnerships',
    'profiles','task_comments','tasks','templates','user_roles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated team full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

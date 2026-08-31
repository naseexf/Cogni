
-- 1) New signups default to 'member', and auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Tasks RLS
DROP POLICY IF EXISTS "Authenticated team full access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_all_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own_or_admin" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own_or_admin" ON public.tasks;

CREATE POLICY "tasks_select_all_authenticated"
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "tasks_insert_authenticated"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tasks_update_own_or_admin"
ON public.tasks FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "tasks_delete_own_or_admin"
ON public.tasks FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- 3) user_roles RLS: read by all authenticated, writes admin-only
DROP POLICY IF EXISTS "Authenticated team full access" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_write" ON public.user_roles;

CREATE POLICY "user_roles_select_authenticated"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_roles_admin_write"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4) Profiles RLS: self-edit; admin edits anyone; everyone signed in can read
DROP POLICY IF EXISTS "Authenticated team full access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_self_or_admin"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- 5) Backfill: existing profiles without a role get 'member'
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'member'::app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 6) Grant admin to naseef
INSERT INTO public.user_roles (user_id, role)
VALUES ('27d11d4f-3c97-4dbc-a187-085ef7719bbb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;


-- Tighten user_roles SELECT: users see own role; admins see all
DROP POLICY IF EXISTS "team reads roles" ON public.user_roles;
CREATE POLICY "users read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Tighten profiles SELECT: self or admin (removes team-wide PII exposure)
DROP POLICY IF EXISTS "team reads profiles" ON public.profiles;
CREATE POLICY "users read own profile or admin reads all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Tighten interns SELECT: admin only (PII: email, phone)
DROP POLICY IF EXISTS "team reads interns" ON public.interns;
CREATE POLICY "admins read interns" ON public.interns
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Tighten partnerships SELECT: admin only (contact PII)
DROP POLICY IF EXISTS "team reads partnerships" ON public.partnerships;
CREATE POLICY "admins read partnerships" ON public.partnerships
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Revoke EXECUTE on SECURITY DEFINER functions from signed-in users.
-- RLS policy evaluation does not require EXECUTE grants, so has_role/is_admin
-- continue to work inside policies while no longer being callable via RPC.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

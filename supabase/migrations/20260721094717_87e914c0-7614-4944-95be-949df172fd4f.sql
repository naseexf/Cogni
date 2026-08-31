
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.partnership_stage AS ENUM ('prospecting','proposal_sent','under_review','negotiation','signed_active','on_hold');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','in_review','done');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high');
CREATE TYPE public.event_type AS ENUM ('session','deadline','internal','college_visit');
CREATE TYPE public.doc_type AS ENUM ('proposal','event_report','promotional','lovable_prompt','internal_note','other');
CREATE TYPE public.intern_status AS ENUM ('applied','active','completed','dropped');
CREATE TYPE public.asset_type AS ENUM ('poster','logo','business_card','lovable_prompt','whatsapp_template','other');
CREATE TYPE public.template_type AS ENUM ('proposal','event_report','whatsapp','business_card','other');

-- ============ UPDATE TIMESTAMP FN ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

-- Admin can manage roles
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Admin manage profiles (delete)
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ HANDLE NEW USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'member'::public.app_role END);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PARTNERSHIPS ============
CREATE TABLE public.partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage public.partnership_stage NOT NULL DEFAULT 'prospecting',
  contact_name TEXT,
  contact_role TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  next_action TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnerships TO authenticated;
GRANT ALL ON public.partnerships TO service_role;
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads partnerships" ON public.partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts partnerships" ON public.partnerships FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates partnerships" ON public.partnerships FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins delete partnerships" ON public.partnerships FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_partnerships_updated BEFORE UPDATE ON public.partnerships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.partnership_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_notes TO authenticated;
GRANT ALL ON public.partnership_notes TO service_role;
ALTER TABLE public.partnership_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads pnotes" ON public.partnership_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts pnotes" ON public.partnership_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author updates pnotes" ON public.partnership_notes FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE POLICY "admin deletes pnotes" ON public.partnership_notes FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));

-- ============ INITIATIVES / TASKS ============
CREATE TABLE public.initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.initiatives TO authenticated;
GRANT ALL ON public.initiatives TO service_role;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads initiatives" ON public.initiatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts initiatives" ON public.initiatives FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates initiatives" ON public.initiatives FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin deletes initiatives" ON public.initiatives FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_initiatives_updated BEFORE UPDATE ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  partnership_id UUID REFERENCES public.partnerships(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "owner or admin deletes tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = created_by OR auth.uid() = assignee_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads tcomments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts tcomments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author deletes tcomments" ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));

-- ============ EVENTS ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  event_type public.event_type NOT NULL DEFAULT 'internal',
  partnership_id UUID REFERENCES public.partnerships(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "owner or admin deletes events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  doc_type public.doc_type NOT NULL DEFAULT 'other',
  partnership_id UUID REFERENCES public.partnerships(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  file_url TEXT,
  content_text TEXT,
  version_note TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads docs" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owner or admin updates docs" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));
CREATE POLICY "owner or admin deletes docs" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_note TEXT NOT NULL,
  content_snapshot TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads dversions" ON public.document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts dversions" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- ============ INTERNS ============
CREATE TABLE public.interns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  college TEXT,
  batch TEXT,
  status public.intern_status NOT NULL DEFAULT 'applied',
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interns TO authenticated;
GRANT ALL ON public.interns TO service_role;
ALTER TABLE public.interns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads interns" ON public.interns FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts interns" ON public.interns FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates interns" ON public.interns FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin deletes interns" ON public.interns FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_interns_updated BEFORE UPDATE ON public.interns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ASSETS ============
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  asset_type public.asset_type NOT NULL DEFAULT 'other',
  image_url TEXT,
  content_text TEXT,
  associated_with TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates assets" ON public.assets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "owner or admin deletes assets" ON public.assets FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEMPLATES ============
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type public.template_type NOT NULL DEFAULT 'other',
  description TEXT,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads templates" ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts templates" ON public.templates FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team updates templates" ON public.templates FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin deletes templates" ON public.templates FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORG NODES ============
CREATE TABLE public.org_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  role_title TEXT,
  parent_id UUID REFERENCES public.org_nodes(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_nodes TO authenticated;
GRANT ALL ON public.org_nodes TO service_role;
ALTER TABLE public.org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads org" ON public.org_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages org" ON public.org_nodes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.org_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "team inserts announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author or admin updates announcements" ON public.announcements FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE POLICY "author or admin deletes announcements" ON public.announcements FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

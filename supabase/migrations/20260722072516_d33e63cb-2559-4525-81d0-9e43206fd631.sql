
CREATE TABLE public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('common','calicut','tvm')),
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_folders TO authenticated;
GRANT ALL ON public.document_folders TO service_role;

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read folders" ON public.document_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert non-root folders" ON public.document_folders FOR INSERT TO authenticated WITH CHECK (is_root = false);
CREATE POLICY "Authenticated can update non-root folders" ON public.document_folders FOR UPDATE TO authenticated USING (is_root = false) WITH CHECK (is_root = false);
CREATE POLICY "Authenticated can delete non-root folders" ON public.document_folders FOR DELETE TO authenticated USING (is_root = false);

CREATE TRIGGER update_document_folders_updated_at BEFORE UPDATE ON public.document_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.document_folders (name, parent_id, section, is_root) VALUES
  ('Common', NULL, 'common', true),
  ('Calicut', NULL, 'calicut', true),
  ('TVM', NULL, 'tvm', true);

ALTER TABLE public.documents ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN file_size BIGINT;
ALTER TABLE public.documents ADD COLUMN mime_type TEXT;

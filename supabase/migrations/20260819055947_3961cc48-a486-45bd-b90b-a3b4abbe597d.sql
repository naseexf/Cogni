ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'brochure';
ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'slides';
ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'write_up';
ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'poster';
ALTER TYPE public.template_type ADD VALUE IF NOT EXISTS 'visiting_card';

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ALTER COLUMN body DROP NOT NULL;
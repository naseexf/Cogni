CREATE TABLE public.schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL DEFAULT 'Standard One-Month Experienceship',
  week_label text NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  date date,
  day_name text NOT NULL,
  title text,
  activities text[] NOT NULL DEFAULT '{}',
  is_weekend boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_days TO authenticated;
GRANT ALL ON public.schedule_days TO service_role;

ALTER TABLE public.schedule_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_days_select" ON public.schedule_days FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "schedule_days_insert" ON public.schedule_days FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "schedule_days_update" ON public.schedule_days FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "schedule_days_delete" ON public.schedule_days FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_schedule_days_updated BEFORE UPDATE ON public.schedule_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_schedule_days_template ON public.schedule_days (template_name, week_number, sort_order);
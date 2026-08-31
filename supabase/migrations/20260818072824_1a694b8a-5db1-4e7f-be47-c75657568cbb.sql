CREATE TABLE public.fee_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, location)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_batches TO authenticated;
GRANT ALL ON public.fee_batches TO service_role;

ALTER TABLE public.fee_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view batches" ON public.fee_batches FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team can add batches" ON public.fee_batches FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team can edit batches" ON public.fee_batches FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid())) WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team can delete batches" ON public.fee_batches FOR DELETE TO authenticated USING (public.is_team_member(auth.uid()));

CREATE TRIGGER trg_fee_batches_updated BEFORE UPDATE ON public.fee_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.fee_batches (name, location)
SELECT DISTINCT batch, location FROM public.fee_records
ON CONFLICT DO NOTHING;
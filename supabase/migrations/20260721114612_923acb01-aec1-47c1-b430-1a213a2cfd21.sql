
CREATE TABLE public.fee_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch TEXT NOT NULL,
  location TEXT NOT NULL,
  student_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  college TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_records TO authenticated;
GRANT ALL ON public.fee_records TO service_role;

ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view fee records" ON public.fee_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can insert fee records" ON public.fee_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can update fee records" ON public.fee_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Team can delete fee records" ON public.fee_records FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_fee_records_updated_at BEFORE UPDATE ON public.fee_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX fee_records_batch_loc_idx ON public.fee_records (batch, location);

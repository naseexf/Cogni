ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS year_of_study text,
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'daily';
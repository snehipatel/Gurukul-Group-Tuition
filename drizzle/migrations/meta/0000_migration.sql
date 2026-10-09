CREATE TABLE public.app_records (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
GRANT ALL ON public.app_records TO service_role;
ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
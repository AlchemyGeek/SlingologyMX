-- Aircraft-scoped API keys for external integration ingest
CREATE TABLE public.aircraft_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_id uuid NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text NOT NULL DEFAULT 'Integration',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aircraft_api_keys TO authenticated;
GRANT ALL ON public.aircraft_api_keys TO service_role;

ALTER TABLE public.aircraft_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aircraft owners can manage their API keys"
  ON public.aircraft_api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aircraft
      WHERE public.aircraft.id = public.aircraft_api_keys.aircraft_id
        AND public.aircraft.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.aircraft
      WHERE public.aircraft.id = public.aircraft_api_keys.aircraft_id
        AND public.aircraft.user_id = auth.uid()
    )
  );

CREATE INDEX idx_aircraft_api_keys_key_hash ON public.aircraft_api_keys(key_hash);
CREATE INDEX idx_aircraft_api_keys_aircraft_id ON public.aircraft_api_keys(aircraft_id);

-- Trigger to keep updated_at current
CREATE TRIGGER update_aircraft_api_keys_updated_at
  BEFORE UPDATE ON public.aircraft_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add external_id to transactions for idempotent ingest
ALTER TABLE public.transactions
  ADD COLUMN external_id text;

CREATE UNIQUE INDEX idx_transactions_external_id_per_aircraft
  ON public.transactions(aircraft_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_transactions_source_tags ON public.transactions(source, tags);

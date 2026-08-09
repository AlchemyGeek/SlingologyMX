DELETE FROM public.transactions WHERE external_id = 'diag_test_1';
UPDATE public.aircraft_api_keys SET revoked_at = now() WHERE label = 'Temp Diagnostic';
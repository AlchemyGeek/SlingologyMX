ALTER TABLE public.directives ALTER COLUMN terminating_action_summary TYPE character varying(1000);
ALTER TABLE public.directives ALTER COLUMN title TYPE character varying(500);
ALTER TABLE public.community_service_bulletins ALTER COLUMN terminating_action_summary TYPE character varying(1000);
ALTER TABLE public.community_service_bulletins ALTER COLUMN title TYPE character varying(500);
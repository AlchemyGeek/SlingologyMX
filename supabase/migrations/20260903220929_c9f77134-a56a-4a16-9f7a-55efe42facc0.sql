-- Restore table-level privileges revoked by earlier broad REVOKE migration.
-- RLS policies already restrict access to authenticated users; these grants
-- re-enable the Data API to reach the tables at all.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_service_bulletins TO authenticated;
GRANT ALL ON public.community_service_bulletins TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_sb_feedback TO authenticated;
GRANT ALL ON public.community_sb_feedback TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_sb_usage TO authenticated;
GRANT ALL ON public.community_sb_usage TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_sb_update_notifications TO authenticated;
GRANT ALL ON public.community_sb_update_notifications TO service_role;
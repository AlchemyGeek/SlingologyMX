-- Backfill directive_history with existing directives as "Create" entries
INSERT INTO public.directive_history (user_id, directive_id, directive_code, directive_title, action_type, created_at)
SELECT user_id, id, directive_code, title, 'Create', created_at
FROM public.directives
WHERE NOT EXISTS (
  SELECT 1 FROM public.directive_history dh 
  WHERE dh.directive_id = directives.id AND dh.action_type = 'Create'
);
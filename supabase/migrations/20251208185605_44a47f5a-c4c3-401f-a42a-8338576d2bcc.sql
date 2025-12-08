-- Add unique constraint on directive_code per user
ALTER TABLE public.directives 
ADD CONSTRAINT directives_user_directive_code_unique UNIQUE (user_id, directive_code);
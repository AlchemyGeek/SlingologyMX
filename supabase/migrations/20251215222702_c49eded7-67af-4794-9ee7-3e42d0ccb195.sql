-- First update any Proposed records to Active before we can remove it from UI
UPDATE public.directives SET directive_status = 'Active' WHERE directive_status = 'Proposed';

-- Rename the enum value from Cancelled to Withdrawn
ALTER TYPE public.directive_status RENAME VALUE 'Cancelled' TO 'Withdrawn';
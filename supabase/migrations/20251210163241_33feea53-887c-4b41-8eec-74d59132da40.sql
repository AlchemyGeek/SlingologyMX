-- Add new values to the bug_category enum
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Authentication';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Notifications';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Maintenance Logs';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Directives';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Subscriptions';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Calendar';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Counters';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Profile';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'UI/Display';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Performance';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Data';
ALTER TYPE public.bug_category ADD VALUE IF NOT EXISTS 'Other';
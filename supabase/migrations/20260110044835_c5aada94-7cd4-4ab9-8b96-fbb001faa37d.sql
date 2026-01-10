-- Add new bug categories for Insights and Financial Records
ALTER TYPE bug_category ADD VALUE IF NOT EXISTS 'Insights';
ALTER TYPE bug_category ADD VALUE IF NOT EXISTS 'Financial Records';
-- Step 1: Add new enum value 'Resolved' to directive_status
ALTER TYPE directive_status ADD VALUE IF NOT EXISTS 'Resolved';
-- Add 'Maintenance' to transaction_source enum
ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'Maintenance';
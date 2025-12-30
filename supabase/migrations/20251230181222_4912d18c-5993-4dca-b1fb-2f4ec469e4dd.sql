-- Add new enum values to subscription_type
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Facilities & Storage';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Insurance';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Navigation, Charts & Flight Planning';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Avionics Data & Services';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Maintenance, Compliance & Records';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Training, Proficiency & Safety';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Memberships & Associations';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Publications & Media';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Operations & Administration';
ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'Hardware-Related Services';
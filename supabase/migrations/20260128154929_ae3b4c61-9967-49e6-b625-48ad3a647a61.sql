-- Add 'Obligatory' to directive_severity enum between 'Mandatory' and 'Recommended'
ALTER TYPE directive_severity ADD VALUE 'Obligatory' AFTER 'Mandatory';
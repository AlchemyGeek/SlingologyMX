ALTER TABLE aircraft
  ADD COLUMN airframe_tt_mode text NOT NULL DEFAULT 'tach',
  ADD COLUMN engine_tt_mode text NOT NULL DEFAULT 'tach',
  ADD COLUMN prop_tt_mode text NOT NULL DEFAULT 'tach';
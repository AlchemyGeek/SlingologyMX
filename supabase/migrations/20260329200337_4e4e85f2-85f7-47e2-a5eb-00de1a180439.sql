ALTER TABLE aircraft
  ADD COLUMN initial_hobbs numeric DEFAULT NULL,
  ADD COLUMN initial_tach numeric DEFAULT NULL,
  ADD COLUMN initial_airframe_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_engine_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_prop_total_time numeric DEFAULT NULL;
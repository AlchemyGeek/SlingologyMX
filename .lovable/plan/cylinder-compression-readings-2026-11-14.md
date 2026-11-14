# Cylinder Compression Readings

## What you'll get
- **Aircraft profile (My Aircraft):** new "Number of cylinders" choice (2, 4 or 6; default 4) and "Low compression warning below" (default 60/80, editable).
- **Maintenance record:** a new "Cylinder Compression" section directly under Directive Compliance with a "Record compression" switch. When on, one box per cylinder (Cyl 1...N), each entered as a whole number 0-80 shown as `XX/80`.
  - Readings below the warning value are highlighted with a warning badge.
  - Saving requires every cylinder to be filled once the switch is on.
- **Maintenance record view:** readings shown as `72/80, 74/80, ...` with low ones flagged.
- **Compression history:** in the aircraft profile, a "Compression history" table listing each maintenance record with readings (date, Tach, each cylinder), newest first, low readings flagged, clicking a row opens the record.
- Changing cylinder count later keeps past records exactly as saved (snapshot rule).

## Technical details
- Migration: `aircraft.cylinder_count smallint NOT NULL DEFAULT 4` (check in 2,4,6), `aircraft.compression_warning_threshold smallint NOT NULL DEFAULT 60` (0-80); `maintenance_logs.cylinder_compressions jsonb NULL` (array of ints 0-80, length = cylinder count at entry). Existing grants/RLS cover these columns.
- `AircraftContext` loads new fields; `AircraftManagement.tsx` add/edit dialog fields.
- New `src/components/CylinderCompressionInput.tsx` used in `MaintenanceLogForm.tsx` after `MaintenanceDirectiveCompliance`; display in maintenance detail; new `CompressionHistory` component in profile.
- Helper `src/lib/compression.ts` (validate 0-80 integer, format `XX/80`, isLow) with vitest tests.
- Export/import: schema 2.2 (migration 2.1→2.2 defaults cylinder_count 4, threshold 60, compressions null); update FUNCTIONAL_SPEC.md.

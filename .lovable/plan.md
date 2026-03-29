


# Counter Tracking Mode Configuration — IMPLEMENTED

## Summary

Add per-aircraft configuration for how each TT counter (Airframe TT, Engine TT, Prop TT) is tracked: linked to Hobbs, linked to Tach (default), or Manual. When linked, TT counters auto-increment by the same delta as the linked counter. When Manual, users enter TT values independently.

Status: ✅ Completed

---

# Aircraft Counter Initial Values — IMPLEMENTED

## Summary

Per-aircraft "acquisition counters" — the counter values when the aircraft was acquired. Financial insights subtract these initial values to calculate owner-specific usage hours, while reserves use absolute (total lifecycle) values. Initial values are set in the aircraft profile and protected by an "I UNDERSTAND" confirmation for changes after first set.

## Changes Made

- **Database**: Added 5 columns (`initial_hobbs`, `initial_tach`, `initial_airframe_total_time`, `initial_engine_total_time`, `initial_prop_total_time`) to `aircraft` table
- **AircraftContext**: Extended `Aircraft` type with initial_* fields
- **AircraftManagement**: Collapsible "Acquisition Counters" section with "I UNDERSTAND" confirmation for changes
- **counterInterpolation**: Added `getOwnerHours()` helper
- **BatchCounterEditDialog**: Enforces minimum value validation against initial values
- **AircraftCountersDisplay**: Shows "Owner: X hrs" when initial values are set
- **TrueCostInsight**: Uses initial value as fallback when analysis start precedes counter history
- **AssumptionsInsight**: Shows owner-hours on usage chart Y-axis

Status: ✅ Completed

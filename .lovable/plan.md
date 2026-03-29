

# Aircraft Counter Initial Values

## Summary

Add per-aircraft "acquisition counters" — the counter values when the aircraft was acquired. Financial insights subtract these initial values to calculate owner-specific usage hours, while reserves use absolute (total lifecycle) values. Initial values are set in the aircraft profile and protected by an "I UNDERSTAND" confirmation for changes after first set.

## Database Change

Add 5 columns to the `aircraft` table:

```sql
ALTER TABLE aircraft
  ADD COLUMN initial_hobbs numeric DEFAULT NULL,
  ADD COLUMN initial_tach numeric DEFAULT NULL,
  ADD COLUMN initial_airframe_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_engine_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_prop_total_time numeric DEFAULT NULL;
```

NULL means "not yet set" — the system treats this as zero offset (backward compatible).

## Code Changes

### 1. AircraftContext.tsx — Extend Aircraft type

Add the 5 `initial_*` fields to the `Aircraft` interface and include them in the fetch/cast logic.

### 2. AircraftManagement.tsx — Initial values UI in aircraft edit dialog

Add a collapsible "Acquisition Counters" section in the aircraft edit dialog with 5 numeric inputs. On first save these are stored directly. On subsequent changes:
- Show a warning dialog explaining this will reset counters to these values and delete all counter history
- Require the user to type "I UNDERSTAND"
- On confirmation: update the aircraft initial values, set `aircraft_counters` to these values, delete all `aircraft_counter_history` rows for this aircraft

### 3. AircraftCountersDisplay.tsx — Show initial values context

When initial values are set, optionally display "Owner hours: X" alongside the absolute counter value, or a small label showing the offset. This gives users quick visibility into their owner-specific usage.

### 4. counterInterpolation.ts — Add offset helper

Add a utility function:
```typescript
export function getOwnerHours(
  absoluteValue: number,
  initialValue: number | null
): number {
  return absoluteValue - (initialValue ?? 0);
}
```

### 5. Insight files — Apply offset for financial calculations

In the following files, subtract initial counter values when computing cost-per-hour and usage hours:

- **TrueCostInsight.tsx**: When computing `hoursData`, subtract the initial value from both start and end counter results. The `hours` (delta) stays the same since it's end minus start, BUT the cost-per-hour denominator uses owner-hours, not absolute hours. More importantly, if the analysis period starts before counter history, the fallback value should be the initial value, not the first recorded absolute value.
- **WhatHappenedInsight.tsx**: Same offset logic for hours display.
- **CostStructureInsight.tsx**: Usage-based reserve accrual calculations use **absolute** values (no offset) per the exception rule.
- **OutlookInsight.tsx**: Usage rate calculations (hours/day) are unaffected since they use deltas. But projected total hours for display should show owner-hours.
- **AssumptionsInsight.tsx**: Usage chart should show owner-hours on the Y axis.

### 6. Reserve accrual (amortization.ts) — No offset

Reserves explicitly use absolute counter values (full lifecycle). No changes needed here — the exception is handled by NOT applying the offset in reserve calculations.

### 7. BatchCounterEditDialog.tsx — Enforce minimum

When initial values are set, counter values cannot go below the initial values. Update validation: `newValue < initialValue` → error.

## Key Behaviors

| Scenario | Behavior |
|----------|----------|
| Initial values not set (NULL) | No offset applied, everything works as today |
| Initial values set, first time | Stored directly, no confirmation needed |
| Initial values changed after first set | "I UNDERSTAND" confirmation → resets counters to initial values, deletes all counter history |
| Financial insights (True Cost, What Happened) | Use `counter_value - initial_value` for hours |
| Reserves | Use absolute `counter_value` (full lifecycle) |
| Usage rate calculations | Unaffected (rate is based on deltas, not absolute values) |

## Files to Modify

- `src/contexts/AircraftContext.tsx` — Aircraft type
- `src/components/AircraftManagement.tsx` — UI for setting initial values + confirmation
- `src/components/AircraftCountersDisplay.tsx` — Optional owner-hours display
- `src/components/BatchCounterEditDialog.tsx` — Minimum value validation
- `src/lib/counterInterpolation.ts` — Owner-hours helper
- `src/components/insights/TrueCostInsight.tsx` — Offset in hours calc
- `src/components/insights/WhatHappenedInsight.tsx` — Offset in hours calc
- `src/components/insights/OutlookInsight.tsx` — Owner-hours in display
- `src/components/insights/AssumptionsInsight.tsx` — Owner-hours in chart

## Migration SQL

```sql
ALTER TABLE aircraft
  ADD COLUMN initial_hobbs numeric DEFAULT NULL,
  ADD COLUMN initial_tach numeric DEFAULT NULL,
  ADD COLUMN initial_airframe_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_engine_total_time numeric DEFAULT NULL,
  ADD COLUMN initial_prop_total_time numeric DEFAULT NULL;
```




# Counter Tracking Mode Configuration

## Summary

Add per-aircraft configuration for how each TT counter (Airframe TT, Engine TT, Prop TT) is tracked: linked to Hobbs, linked to Tach (default), or Manual. When linked, TT counters auto-increment by the same delta as the linked counter. When Manual, users enter TT values independently.

## Changes Required

### 1. Database: Add columns to `aircraft` table

Add three new columns to store each TT counter's tracking mode:

```sql
ALTER TABLE aircraft
  ADD COLUMN airframe_tt_mode text NOT NULL DEFAULT 'tach',
  ADD COLUMN engine_tt_mode text NOT NULL DEFAULT 'tach',
  ADD COLUMN prop_tt_mode text NOT NULL DEFAULT 'tach';
```

Valid values: `'hobbs'`, `'tach'`, `'manual'`

### 2. AircraftManagement.tsx — Add counter mode settings

In the aircraft edit dialog (or as a new expandable section per aircraft card), add three dropdowns:
- **Airframe TT tracking**: Linked to Hobbs / Linked to Tach / Manual
- **Engine TT tracking**: Linked to Hobbs / Linked to Tach / Manual
- **Prop TT tracking**: Linked to Hobbs / Linked to Tach / Manual

Save these to the `aircraft` table on update.

### 3. AircraftContext.tsx — Expose tracking modes

Add the three mode fields to the `Aircraft` type so they're available app-wide.

### 4. BatchCounterEditDialog.tsx — Respect tracking modes

- Pass counter modes as a prop (from the selected aircraft context)
- **Linked counters**: Show as read-only with a label like "Linked to Tach". Their values are computed from the delta of the linked counter, not editable
- **Manual counters**: Editable as today
- **Sync toggle**: Remove the current sync toggle. The linking replaces it — linked counters auto-sync to their source, manual ones are independent
- Hobbs and Tach remain always editable (they are source counters, never linked)

### 5. useAircraftCounters.ts — Apply tracking logic on save

When `updateAllCounters` is called:
- For each TT counter in `'hobbs'` or `'tach'` mode, compute the delta from the linked source counter and apply it automatically
- For `'manual'` mode counters, use the explicitly provided value
- This replaces the current `syncableKeys` logic

### 6. Maintenance Log counter sync

The maintenance log form's "Sync Tach, Airframe, Engine & Prop" toggle should respect these modes too. Linked counters auto-derive from their source; manual ones are independent unless the user explicitly edits them.

## Technical Details

| Area | Detail |
|------|--------|
| Migration | 3 new `text` columns on `aircraft`, default `'tach'` |
| AircraftContext | Add `airframe_tt_mode`, `engine_tt_mode`, `prop_tt_mode` to `Aircraft` interface |
| BatchCounterEditDialog | Read modes from aircraft context; disable input for linked counters; compute deltas |
| useAircraftCounters | Replace sync logic with mode-aware delta computation |
| AircraftManagement | Add 3 Select dropdowns in edit dialog |
| MaintenanceLogForm | Adjust sync behavior to respect per-counter modes |


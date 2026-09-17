# Maintenance: start date, completion date, and shop-time duration

Track how long the aircraft is out of service, and let a maintenance record exist before the work is done.

## What changes in the record

In Time & Usage:
- **Date Started** — new, always required. The anchor date for the event.
- **Date Completed** — the field currently called "Date Performed", renamed, and now optional.

Rules:
- Completion date, when present, cannot be earlier than the start date.
- The five readings (Hobbs, Tach, Airframe/Engine/Prop total time) become required only when a completion date is entered. Without one they are optional.
- Status is derived, never typed in:
  - **Scheduled** — start date is in the future.
  - **In progress** — start date is today or past, no completion date.
  - **Completed** — completion date present.
- The record shows a "Shop time: N days" line once both dates exist (or "N days so far" while in progress).

## Where it shows up

**List and detail** — status badge (Scheduled / In progress / Completed), date column shows the start date with completion date alongside, sorting by start date.

**Reminder for future work** — a maintenance reminder is created automatically for a future start date, so the job appears in Calendar and Timeline. It is kept in sync: moving the start date moves the reminder, and completing or deleting the job clears it. This reuses the existing linked-reminder behaviour (a reminder the user edits by hand is left alone).

**Calendar** — scheduled and in-progress events appear on their start date; completed events keep showing on the completion date as today.

**Timeline** — maintenance is drawn as a duration bar from start to completion instead of a single dot. No completion date yet means an open-ended bar running to today (or from a future start to the right edge), drawn striped/faded. Clicking the bar opens the record as today. Existing "next due" projections are unchanged.

**History** — scheduled events are excluded. In-progress events appear dated by their start date, marked as in progress. Completed events are dated by their completion date, as today.

**Costs, transactions and insights** — a linked transaction is dated by the completion date when there is one, otherwise the start date. Scheduled (future) events are not counted in history or cost/insight totals until their start date arrives; transaction status handling is unchanged (existing Posted/Pending status is preserved on edit).

**Counter auto-fill** — the form pulls counter readings from history based on the completion date when set, otherwise the start date.

**Backup files** — export/import gains both fields, bumping the file version to 1.7. Older backups are upgraded on load by copying the old date into both start and completion, so nothing is lost. Import duplicate detection switches to title + start date.

## Technical notes

- Migration on `public.maintenance_logs`: add `date_started date not null` (backfilled from `date_performed`), rename `date_performed` to `date_completed`, drop its NOT NULL. Add a validation trigger enforcing `date_completed >= date_started`.
- Renaming the column requires updating every reference: `MaintenanceLogForm`, `MaintenanceLogList`, `MaintenanceLogDetail`, `MaintenanceLogsPanel`, `CalendarPanel`, `HistoryPanel`, `timelineEvents.ts`, `useMaintenanceTransactions.ts`, `DataManagement.tsx`, plus regenerated Supabase types.
- `timelineEvents.ts` gains an optional `endDateISO` on maintenance events; `TimelineAxis` renders a span when present and a dot otherwise, keeping the current lane/colour system and `onOpenRecord` wiring.
- `schemaMigrations.ts`: `CURRENT_SCHEMA_VERSION = "1.7"` with a 1.6 → 1.7 migration mapping `date_performed` onto `date_started` and `date_completed`.
- Reminder sync reuses the existing linked-notification code path in `MaintenanceLogForm` (`maintenance_log_id`, `user_modified = false`), adding a Date-based reminder keyed to the start date for future events.
- Docs updated: `docs/FUNCTIONAL_SPEC.md` and `README.md`.

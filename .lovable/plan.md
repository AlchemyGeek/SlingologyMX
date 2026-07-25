# Header Reminder Bell

Add a bell icon in the top header (next to Profile/Logout) that surfaces two counts for the currently selected aircraft:
- Unconfirmed notifications (`notifications.is_completed = false`)
- Pending transactions (`transactions.status = 'Pending'`)

## Behavior

- Red badge on the bell shows the combined count. Hidden when zero.
- Click opens a `Popover` dropdown with two rows:
  - "Unconfirmed notifications — N" → jumps to the Notifications view.
  - "Pending transactions — N" → jumps to the Transactions view.
- Rows with count 0 render disabled.
- Footer button "Snooze for 24 hours" hides the bell entirely until the snooze expires. While snoozed the bell is not rendered even if new items appear.
- Auto-unsnooze after 24h; next mount re-evaluates.

## Scope

- Aircraft-scoped: queries filter by `selectedAircraft.id`. When switching aircraft, counts refresh.
- Refresh on: aircraft change, view change, and a lightweight interval (60s) to catch background changes. No realtime subscription needed.

## Implementation

- New component `src/components/HeaderReminderBell.tsx`:
  - Props: `aircraftId`, `userId`, `onNavigate(view: DashboardView)`.
  - Fetches the two counts via `supabase.from(...).select('id', { count: 'exact', head: true })` filtered by `user_id` + `aircraft_id`.
  - Snooze state stored in `localStorage` under key `reminderBell.snoozeUntil.<userId>.<aircraftId>` (per-user/per-aircraft) as ISO timestamp.
  - Uses shadcn `Popover`, `Button`, and existing `Bell` icon from `lucide-react`.
- Wire into `src/pages/Dashboard.tsx` header (line ~314 button group), before the Profile button. Pass `setActiveView` as `onNavigate` so clicking a row switches to `"notifications"` or `"transactions"`.
- No schema changes. No changes to Notifications/Transactions panels themselves.

## Out of scope

- Sidebar badges, top banners, dashboard cards.
- Overdue-only filtering (uses "not completed" / "pending" as the definitions confirmed).
- Cross-aircraft totals.

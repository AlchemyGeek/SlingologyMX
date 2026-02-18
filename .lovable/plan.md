# Client-Local Undo Delete

## Approach

Use a **custom React hook** (`useUndoDelete`) that captures the deleted record's data before deletion, shows a sonner toast with an "Undo" action button, and re-inserts the record if the user clicks Undo within 20 seconds. No database or schema changes needed.

## Architecture

### 1. Create `src/hooks/useUndoDelete.ts`

A reusable hook that encapsulates all undo logic:

- Accepts a table name and optional cleanup/restore callbacks
- On delete: snapshots the full record, performs the delete, shows a sonner toast with "Undo" action
- On undo: re-inserts the snapshot into the database, calls a refresh callback
- Only tracks the most recent deletion (new delete replaces previous undo opportunity)
- 20-second timeout via sonner's `duration` prop
- If re-insert fails, shows "Undo unavailable" error toast

```text
Hook API:

useUndoDelete({
  tableName: string,
  onBeforeDelete?: (id) => Promise<void>,   // cascade deletes (notifications, compliance, etc.)
  onAfterDelete?: () => void,                // refresh list, call onRecordChanged
  onAfterRestore?: () => void,               // refresh list after undo
  onBeforeRestore?: (record) => Promise<void> // re-create cascaded records if needed
})

Returns:
  deleteWithUndo(id: string, snapshot: Record) => Promise<void>
```

### 2. Integration Pattern for Each Panel

Each panel's `handleDelete` will change from "delete then toast success" to "call deleteWithUndo with the record snapshot." The hook handles the toast.

**Simple panels** (Transactions, Subscriptions, Reserves, Equipment):

- Straightforward: snapshot record, delete, re-insert on undo
- For Equipment: also delete linked notifications before delete; on undo, notifications are NOT restored (acceptable -- they were auto-generated and can be recreated)

**Complex panels** (Maintenance Logs, Directives):

- Maintenance Logs: currently voids linked transactions, deletes notifications, deletes compliance records before deleting the log. On undo, the log is re-inserted. Voided transactions and deleted notifications/compliance are NOT restored (acceptable trade-off for simplicity -- the spec says this is a quick safety net, not full recovery).
- Directives: currently inserts a history record ("Delete" action), deletes linked notifications, then deletes. On undo, re-insert the directive and delete the history record that was just created.

### 3. Panels to Update


| Panel            | File                           | Cascade Complexity                                     |
| ---------------- | ------------------------------ | ------------------------------------------------------ |
| Transactions     | `TransactionsPanel.tsx`        | Simple delete                                          |
| Subscriptions    | `SubscriptionsPanel.tsx`       | Simple delete                                          |
| Reserves         | `ReservesPanel.tsx`            | Simple delete                                          |
| Equipment        | `EquipmentPanel.tsx`           | Deletes linked notifications first                     |
| Maintenance Logs | `MaintenanceLogsPanel.tsx`     | Voids transactions, deletes notifications + compliance |
| Directives       | `DirectivesPanel.tsx`          | Inserts history, deletes notifications                 |
| Notifications    | `ActiveNotificationsPanel.tsx` | Simple delete                                          |


### 4. Sonner Toast Configuration

The toast will use sonner's built-in action button:

```text
toast("Deleted.", {
  duration: 15000,
  action: {
    label: "Undo",
    onClick: () => restoreRecord()
  }
})
```

This gives us the 15-second window, single-undo behavior (new toast replaces old), and automatic disappearance -- all matching the spec requirements without custom state management for timers.

## Key Design Decisions

- **No soft-delete / no new DB columns**: Records are truly deleted. Undo works by re-inserting a JavaScript-held snapshot. This keeps the database clean and avoids schema changes.
- **Cascade side-effects are not fully reversible**: For maintenance logs and directives, some cascaded changes (voided transactions, deleted compliance records) won't be restored on undo. The log/directive itself will be restored. This is an acceptable trade-off per the spec's "fast safety net" principle.
- **Sonner handles timing and replacement natively**: No custom timer logic needed. Sonner's `duration` and toast replacement behavior match the spec exactly.

## Technical Details

### Files to Create

- `src/hooks/useUndoDelete.ts`

### Files to Modify

- `src/components/TransactionsPanel.tsx`
- `src/components/SubscriptionsPanel.tsx`
- `src/components/ReservesPanel.tsx`
- `src/components/EquipmentPanel.tsx`
- `src/components/MaintenanceLogsPanel.tsx`
- `src/components/DirectivesPanel.tsx`
- `src/components/ActiveNotificationsPanel.tsx`
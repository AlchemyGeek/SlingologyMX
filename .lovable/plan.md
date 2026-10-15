# Archive Equipment

Add the ability to archive equipment that is no longer used in the airplane, while keeping the record for future reference.

## Behavior

- **Archive / Unarchive action** on each equipment record (list row actions and detail view). Archiving keeps all data; unarchiving restores it to active use.
- **List display**: archived items are hidden by default. A "Show archived" toggle in the equipment list reveals them, shown with an "Archived" badge.
- **Pickers**: archived equipment is excluded from the equipment dropdowns when creating/editing directives, reserves, and notifications. Existing links on those records keep working and still display the equipment name.
- **Reminders**: when equipment is archived, its active linked notifications (e.g. warranty expiration) are automatically completed. Unarchiving does not recreate them.
- **Export/Import**: the archived flag is included in export files; import schema version bumped (1.7 → 1.8) with older files defaulting to not archived.

## Technical details

1. **Migration**: add `archived boolean not null default false` to `public.equipment` (plus index on `(aircraft_id, archived)`). Regenerate types.
2. **EquipmentList.tsx**: add "Show archived" toggle; filter out archived by default; show "Archived" badge on archived rows (card + table views).
3. **EquipmentDetail.tsx**: add Archive/Unarchive button (with confirm dialog) next to Edit/Delete; show an "Archived" badge in the header.
4. **EquipmentPanel.tsx**: `handleArchive(id)` — set `archived = true`, then complete active notifications where `equipment_id = id` (set `is_completed = true`, `completed_at = now()`); `handleUnarchive(id)` — set `archived = false`.
5. **DirectiveForm.tsx / ReservesPanel.tsx / NotificationForm.tsx**: equipment selects filter `.eq("archived", false)`; when editing a record already linked to archived equipment, keep that option visible so the link isn't lost.
6. **DataManagement.tsx / schemaMigrations.ts**: include `archived` in export; bump `CURRENT_SCHEMA_VERSION` to "1.8"; 1.7→1.8 migration defaults `archived` to false.
7. **EquipmentForm.tsx**: no change needed (archived managed via list/detail actions, not the form).

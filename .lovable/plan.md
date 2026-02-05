
# Feature Request Resolution - Character Limit Increase

## Summary
Increase the admin comment character limit from 50 to 250 characters and rename "Edit" to "Resolve" throughout the Feature Request admin functionality.

## Changes Required

### 1. Database Migration
- Alter the `admin_comment` column in `feature_requests` table from `varchar(50)` to `varchar(250)`

### 2. FeatureRequestEditDialog.tsx
- Rename dialog title from "Edit Feature Request Status" to "Resolve Feature Request"
- Update validation from 50 to 250 characters
- Update label text from "max 50 characters" to "max 250 characters"
- Update `maxLength` attribute from 50 to 250
- Update character counter from `/50` to `/250`
- Change the `Input` component to a `Textarea` for better UX with longer text
- Update success toast message from "Feature request updated" to "Feature request resolved"

### 3. FeatureRequestList.tsx
- Change the admin button icon from `Edit` to `CheckCircle` (more appropriate for "resolve")
- Rename button text from "Edit" to "Resolve"

## Technical Details

| File | Change |
|------|--------|
| Database | `ALTER TABLE feature_requests ALTER COLUMN admin_comment TYPE varchar(250)` |
| `FeatureRequestEditDialog.tsx` | Update character limits, labels, use Textarea |
| `FeatureRequestList.tsx` | Rename button from "Edit" to "Resolve", change icon |



## Update Community SB List View Columns

### Summary
Update the Community Directives & Bulletins list view to display discovery-focused columns while removing user-specific Equipment data.

---

### Column Changes

**Current columns:** Code, Title, Equipment, Category, Severity, Maintainer, Votes

**New columns (in order):**
1. Issuing Authority
2. Type
3. Code
4. Title
5. Category
6. Severity
7. Maintainer
8. Votes

---

### File to Modify

**`src/components/community/CommunitySBList.tsx`**

#### 1. Update Table Header
- Add "Issuing Authority" column (first position)
- Add "Type" column (second position)
- Remove "Equipment" column header

#### 2. Update Table Body Cells
- Add cell for `issuing_authority` with fallback to "-"
- Add cell for `directive_type`
- Remove Equipment cell rendering

#### 3. Update Search Filter
- Remove `equipment_name` and `equipment_model` from search logic
- Add `issuing_authority` and `directive_type` to searchable fields
- Update placeholder text to reflect new searchable fields

#### 4. Responsive Visibility
Apply appropriate hide classes for smaller screens:
- Issuing Authority: `hide-at-1200` (hide on narrow screens)
- Type: `hide-at-1000`
- Category: `hide-at-800` (existing)
- Maintainer: `hide-at-800` (existing)

---

### Technical Details

The fields already exist in the `CommunitySB` type:
- `issuing_authority: string | null`
- `directive_type: string`

No database or type changes required - this is purely a presentation change.

---

### CSS Note

May need to add `hide-at-1200` class to the index.css if it doesn't exist, following the pattern of existing responsive hide classes.


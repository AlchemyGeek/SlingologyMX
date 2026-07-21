## Consolidate maintenance subcategories in Insights

Roll up `Maintenance Labor`, `Maintenance Parts`, and `Maintenance (Unspecified)` into a single **Maintenance** bucket across the insight views. This is display-only — underlying transaction categories are unchanged, so record forms, transaction lists, and exports keep the full breakdown.

### Changes

1. **New shared helper** `src/lib/insightCategories.ts`
   - Export `MAINTENANCE_SUBCATEGORIES` (the three strings above).
   - Export `rollupCategory(category: string): string` returning `"Maintenance"` for any of the three, else the original category.

2. **`src/components/insights/WhatHappenedInsight.tsx`**
   - Apply `rollupCategory` before aggregating into the category map.
   - Add a `Maintenance` entry to `CATEGORY_COLORS` (drop or keep the two subcategory colors as unused fallbacks).

3. **`src/components/insights/CostStructureInsight.tsx`**
   - Apply `rollupCategory` when building the category breakdown.
   - Replace the three subcategory entries in `VARIABLE_CATEGORIES` with a single `"Maintenance"` entry so the variable/fixed classification (still driven by `include_in_cost_per_hour`) keeps working.

4. **`src/components/insights/TrueCostInsight.tsx`**
   - Apply `rollupCategory` wherever transactions are grouped by category for display.

5. **`src/components/insights/OutlookInsight.tsx`**
   - Apply `rollupCategory` when aggregating historical categories used for projections.

### Out of scope

- No DB migration, no changes to transaction/maintenance forms, lists, or exports.
- No new toggle for expanding subcategories (can be added later; raw data remains available).

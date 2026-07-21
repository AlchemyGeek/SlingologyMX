/**
 * Shared helpers for rolling up transaction categories in Insight views.
 *
 * Underlying transaction records keep their granular categories
 * ("Maintenance Labor", "Maintenance Parts", "Maintenance (Unspecified)").
 * For high-level cost analysis we display them as a single "Maintenance"
 * bucket so users can compare maintenance spend against other categories.
 */

export const MAINTENANCE_SUBCATEGORIES = [
  "Maintenance Labor",
  "Maintenance Parts",
  "Maintenance (Unspecified)",
] as const;

export const MAINTENANCE_ROLLUP_LABEL = "Maintenance";

export function rollupCategory(category: string | null | undefined): string {
  if (!category) return "Other";
  return (MAINTENANCE_SUBCATEGORIES as readonly string[]).includes(category)
    ? MAINTENANCE_ROLLUP_LABEL
    : category;
}
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type OilSample = Database["public"]["Tables"]["oil_analysis_samples"]["Row"];
export const ELEMENTS = [
  ["aluminum", "Aluminum", "Al"], ["chromium", "Chromium", "Cr"], ["iron", "Iron", "Fe"],
  ["copper", "Copper", "Cu"], ["lead", "Lead", "Pb"], ["tin", "Tin", "Sn"],
  ["molybdenum", "Molybdenum", "Mo"], ["nickel", "Nickel", "Ni"], ["manganese", "Manganese", "Mn"],
  ["silver", "Silver", "Ag"], ["titanium", "Titanium", "Ti"], ["potassium", "Potassium", "K"],
  ["boron", "Boron", "B"], ["silicon", "Silicon", "Si"], ["sodium", "Sodium", "Na"],
  ["calcium", "Calcium", "Ca"], ["magnesium", "Magnesium", "Mg"], ["phosphorus", "Phosphorus", "P"],
  ["zinc", "Zinc", "Zn"], ["barium", "Barium", "Ba"],
] as const;
export const PROPERTIES = [
  ["sus_viscosity_210f", "Viscosity at 210°F", "SUS"], ["cst_viscosity_100c", "Viscosity at 100°C", "cSt"],
  ["flashpoint_f", "Flashpoint", "°F"], ["fuel_percent", "Fuel dilution", "%"],
  ["antifreeze_percent", "Antifreeze", "%"], ["water_percent", "Water", "%"],
  ["insolubles_percent", "Insolubles", "%"], ["tbn", "TBN", "mg KOH/g"], ["tan", "TAN", "mg KOH/g"],
] as const;
export const METRICS = [...ELEMENTS, ...PROPERTIES];
export type Metric = typeof METRICS[number][0];
export const numericFields = ["hours_on_oil", "hours_on_engine", "makeup_oil", ...METRICS.map(m => m[0])];
export const sampleInputSchema = z.object({
  sample_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), "Valid sample date required"),
  lab_name: z.string().trim().max(200), lab_number: z.string().trim().max(200),
  engine_model: z.string().max(200), engine_serial: z.string().max(200),
  oil_brand_grade: z.string().max(200), fuel_type: z.string().max(200),
  lab_comments: z.string().max(20000), notes: z.string().max(20000),
});
export type Qualifier = "<" | "<=" | ">" | ">=";
export function parseLabNumber(text: string): { value: number | null; qualifier?: Qualifier } {
  if (!text.trim()) return { value: null };
  if (/^(negative|none|nil)$/i.test(text.trim())) return { value: 0 };
  const match = text.trim().replace(/%$/, "").match(/^(<=|>=|<|>)?\s*(\d+(?:\.\d+)?)$/);
  if (!match) throw new Error(`Invalid measurement: ${text}`);
  return { value: Number(match[2]), qualifier: match[1] as Qualifier | undefined };
}
export function jsonObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
export function reading(sample: Partial<OilSample>, key: Metric): string {
  const value = sample[key];
  return value == null ? "—" : `${jsonObject(sample.qualifiers)[key] || ""}${value}`;
}
export function rate(sample: Partial<OilSample>, key: Metric): number | null {
  const value = sample[key];
  return value != null && (sample.hours_on_oil ?? 0) > 0 && !jsonObject(sample.qualifiers)[key]
    ? value / Number(sample.hours_on_oil) : null;
}
export type HealthIssue = { level: "Watch" | "Action Required"; message: string };
export function evaluateOil(sample: Partial<OilSample>, previous?: Partial<OilSample>, beforePrevious?: Partial<OilSample>) {
  const issues: HealthIssue[] = [];
  const qualifiers = jsonObject(sample.qualifiers);
  const exact = (key: Metric) => qualifiers[key] ? null : sample[key] ?? null;
  const over = (key: Metric, limit: number, inclusive = false) => {
    const value = sample[key];
    if (value == null || ["<", "<="].includes(qualifiers[key])) return false;
    return inclusive ? value >= limit : value > limit;
  };
  const under = (key: Metric, limit: number) => {
    const value = sample[key];
    if (value == null || [">", ">="].includes(qualifiers[key])) return false;
    return value < limit;
  };
  const add = (level: HealthIssue["level"], message: string) => issues.push({ level, message });
  // Report limits apply to their sample, never silently to a different engine or lab.
  for (const [key, label] of METRICS) {
    const range = jsonObject(sample.lab_ranges)[key];
    if (range && ((range.min != null && under(key, range.min)) || (range.max != null && over(key, range.max)))) {
      add("Watch", `${label} is outside this report's laboratory range.`);
    }
  }
  const previousExact = (key: Metric) => previous && !jsonObject(previous.qualifiers)[key] ? previous[key] ?? null : null;
  const rising = (key: Metric) => exact(key) != null && previousExact(key) != null && Number(exact(key)) > Number(previousExact(key));
  // Built-in advisory guidelines for the selected Rotax 916 iS profile only.
  if (sample.reference_profile === "rotax916") {
    const continuingIronRise = rising("iron") && beforePrevious?.iron != null && previous?.iron != null && previous.iron > beforePrevious.iron;
    if (over("iron", 42) || (continuingIronRise && (rising("copper") || rising("aluminum")))) add("Action Required", "Iron exceeds 42 ppm or continues rising with copper/aluminum across three samples.");
    else if (over("iron", 32)) add("Watch", "Iron exceeds 32 ppm.");
    const ironRate = rate(sample, "iron"), priorIronRate = previous ? rate(previous, "iron") : null;
    if (ironRate != null && priorIronRate != null && priorIronRate > 0 && ironRate > priorIronRate * 1.5) add("Watch", "Iron per oil hour increased more than 50%.");
    if (over("copper", 34)) add("Action Required", "Copper exceeds 34 ppm.");
    else if (over("copper", 25) || (rising("copper") && beforePrevious?.copper != null && previous?.copper != null && previous.copper < beforePrevious.copper)) add("Watch", "Copper exceeds 25 ppm or rises after an earlier decline.");
    if (over("aluminum", 15)) add("Action Required", "Aluminum exceeds 15 ppm.");
    else if (over("aluminum", 8)) add("Watch", "Aluminum exceeds 8 ppm.");
    if (over("antifreeze_percent", 0) || over("water_percent", 0) || (rising("potassium") && rising("sodium"))) add("Action Required", "Water/antifreeze detected or both coolant indicators are rising.");
    else if (over("potassium", 5) || over("sodium", 10)) add("Watch", "Potassium or sodium suggests checking for coolant contamination.");
    if (rising("silicon")) add("Watch", "Silicon is rising; compare intake condition and recent sealant use.");
    if (over("fuel_percent", 1, true)) add("Action Required", "Fuel dilution is at least 1.0%.");
    if (under("flashpoint_f", 385)) add("Action Required", "Flashpoint is below 385°F.");
    else if (under("flashpoint_f", 400)) add("Watch", "Flashpoint is below 400°F.");
    if (under("cst_viscosity_100c", 11.9)) add("Action Required", "Viscosity is below 11.9 cSt.");
    else if (under("cst_viscosity_100c", 12.5) || (exact("cst_viscosity_100c") != null && previousExact("cst_viscosity_100c") != null && Number(exact("cst_viscosity_100c")) < Number(previousExact("cst_viscosity_100c")) * 0.9)) add("Watch", "Viscosity is below 12.5 cSt or declined more than 10%.");
    if (under("flashpoint_f", 400) && over("fuel_percent", 0.5, true) && rising("fuel_percent")) add("Watch", "Low flashpoint and fuel dilution suggest checking fuel-related viscosity loss.");
    if (over("insolubles_percent", 0.6, true)) add("Action Required", "Insolubles are at least 0.6%.");
    else if (over("insolubles_percent", 0.4, true)) add("Watch", "Insolubles are at least 0.4%.");
    const leadRate = rate(sample, "lead"), priorLeadRate = previous ? rate(previous, "lead") : null;
    if (leadRate != null && priorLeadRate != null && priorLeadRate > 0 && sample.fuel_type && sample.fuel_type === previous?.fuel_type && leadRate > priorLeadRate * 1.3) add("Watch", "Lead per oil hour increased more than 30% with the same recorded fuel type.");
  }
  const hasMetrics = METRICS.some(([key]) => sample[key] != null);
  const hasRules = sample.reference_profile === "rotax916" || Object.keys(jsonObject(sample.lab_ranges)).length > 0;
  const status = issues.some(i => i.level === "Action Required") ? "Action Required" : issues.length ? "Watch" : !hasMetrics || !hasRules ? "Not assessed" : "Normal";
  return { status, issues };
}

export function comparisonHistory(samples: OilSample[], sample: OilSample) {
  // Do not compare wear rates across engine changes or unknown engine identities.
  return samples.filter(s => s.sample_date < sample.sample_date && s.engine_serial === sample.engine_serial && s.engine_model === sample.engine_model).sort((a,b) => b.sample_date.localeCompare(a.sample_date));
}
export interface MetricSeriesPoint { x: string | number | null; value: number | null; average: number | null; lab: string | null }
export interface MetricSeries { points: MetricSeriesPoint[]; numbers: number[]; mean: number | null; last: number | null; change: number | null; range: { min?: number | null; max?: number | null } | null; outOfRange: boolean }
/** Builds a trend series for one metric. Expects samples sorted by date. Qualified readings and missing values are null, never zero. */
export function buildMetricSeries(sorted: Partial<OilSample>[], metric: Metric, basis: "raw" | "rate", axis: "date" | "engine"): MetricSeries {
  const points = sorted.filter(s => axis !== "engine" || s.hours_on_engine != null).map(s => ({
    x: (axis === "engine" ? s.hours_on_engine : s.sample_date) ?? null,
    value: basis === "rate" ? rate(s, metric) : jsonObject(s.qualifiers)[metric] ? null : (s[metric] as number | null | undefined) ?? null,
    average: basis === "raw" ? jsonObject(s.universal_averages)[metric] ?? null : null,
    lab: s.lab_name ?? null,
  }));
  const numbers = points.map(p => p.value).filter((v): v is number => v != null);
  const mean = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
  const first = numbers[0], last = numbers.length ? numbers[numbers.length - 1] : null;
  const change = first != null && last != null && first > 0 && numbers.length > 1 ? (last - first) / first * 100 : null;
  const latest = sorted[sorted.length - 1];
  const range = latest ? jsonObject(latest.lab_ranges)[metric] ?? null : null;
  const latestValue = latest ? (jsonObject(latest.qualifiers)[metric] ? null : (latest[metric] as number | null | undefined) ?? null) : null;
  const outOfRange = latestValue != null && range != null && ((range.max != null && latestValue > range.max) || (range.min != null && latestValue < range.min));
  return { points, numbers, mean, last, change, range, outOfRange };
}

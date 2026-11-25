import { describe, it, expect } from "vitest";
import { buildMetricSeries } from "./oilAnalysis";
const s = (d: string, iron: number | null, extra: any = {}) => ({ sample_date: d, iron, hours_on_oil: 10, ...extra });
describe("buildMetricSeries", () => {
  it("missing and qualified readings are null, not zero", () => {
    const r = buildMetricSeries([s("2026-01-01", 10), s("2026-02-01", null), s("2026-03-01", 5, { qualifiers: { iron: "<" } })], "iron", "raw", "date");
    expect(r.points.map(p => p.value)).toEqual([10, null, null]);
    expect(r.numbers).toEqual([10]);
  });
  it("computes change and flags latest above lab max", () => {
    const r = buildMetricSeries([s("2026-01-01", 10), s("2026-02-01", 20, { lab_ranges: { iron: { max: 15 } } })], "iron", "raw", "date");
    expect(r.change).toBe(100);
    expect(r.outOfRange).toBe(true);
  });
});

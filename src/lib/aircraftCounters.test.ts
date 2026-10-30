import { describe, it, expect } from "vitest";
import { componentTimeFromTach, deriveFromTach, visibleCounterTypes } from "./aircraftCounters";

const current = { hobbs: 120, tach: 100, airframe_total_time: 1100, engine_total_time: 300, prop_total_time: 50 };

describe("tach-driven counters", () => {
  it("advances airframe, engine and prop by the Tach delta", () => {
    const r = deriveFromTach(current, 110.5, { linkHobbsToTach: false, newHobbs: 131 });
    expect(r.airframe_total_time).toBe(1110.5);
    expect(r.engine_total_time).toBe(310.5);
    expect(r.prop_total_time).toBe(60.5);
    expect(r.hobbs).toBe(131);
  });

  it("mirrors Hobbs to Tach when linked", () => {
    expect(deriveFromTach(current, 105, { linkHobbsToTach: true }).hobbs).toBe(105);
  });

  it("overhaul with custom starting hours counts up from install Tach", () => {
    expect(componentTimeFromTach(120, 100, 0)).toBe(20);
    expect(componentTimeFromTach(120, 100, 150)).toBe(170);
  });

  it("hides Hobbs from pickers when linked", () => {
    expect(visibleCounterTypes(["Hobbs", "Tach", "Engine TT"], true)).toEqual(["Tach", "Engine TT"]);
    expect(visibleCounterTypes(["Hobbs", "Tach"], false)).toEqual(["Hobbs", "Tach"]);
  });
});

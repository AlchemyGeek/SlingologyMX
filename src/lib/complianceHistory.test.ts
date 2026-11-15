import { describe, expect, it } from "vitest";
import { shouldLogCompliance } from "./complianceHistory";

const complied = {
  compliance_status: "Complied",
  compliance_date: "2026-11-10",
  counter_type: null,
  counter_value: null,
};

describe("compliance history", () => {
  it("does not add history when the same maintenance compliance is saved three times", () => {
    expect([1, 2, 3].filter(() => shouldLogCompliance(complied, { ...complied }))).toHaveLength(0);
  });
  it("records a new complied event", () => {
    expect(shouldLogCompliance(null, complied)).toBe(true);
  });
  it("records a transition from Not Complied to Complied", () => {
    expect(shouldLogCompliance({ ...complied, compliance_status: "Not Complied" }, complied)).toBe(true);
  });
  it("records a changed compliance date", () => {
    expect(shouldLogCompliance(complied, { ...complied, compliance_date: "2026-11-11" })).toBe(true);
  });
  it("records changed counter readings", () => {
    const previous = { ...complied, counter_type: "Tach", counter_value: 450 };
    expect(shouldLogCompliance(previous, { ...previous, counter_value: 451 })).toBe(true);
    expect(shouldLogCompliance(previous, { ...previous, counter_type: "Engine TT" })).toBe(true);
  });
  it("does not record Not Complied as a complied event", () => {
    expect(shouldLogCompliance(complied, { ...complied, compliance_status: "Not Complied" })).toBe(false);
  });
  it("normalizes empty optional counters but keeps zero distinct from missing", () => {
    expect(shouldLogCompliance(complied, { ...complied, counter_type: "" })).toBe(false);
    expect(shouldLogCompliance(complied, { ...complied, counter_value: 0 })).toBe(true);
  });
});
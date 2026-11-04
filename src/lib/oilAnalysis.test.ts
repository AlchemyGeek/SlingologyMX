import { describe,it,expect } from "vitest";
import { evaluateOil, parseLabNumber, rate } from "./oilAnalysis";
import { migrateToCurrentVersion } from "./schemaMigrations";
describe("Oil analysis rules",()=>{
  it("retains below-detection-limit values rather than treating them as exact",()=>{
    expect(parseLabNumber("<0.5%")).toEqual({value:0.5,qualifier:"<"});
    expect(rate({lead:10,hours_on_oil:0},"lead")).toBeNull();
    expect(evaluateOil({reference_profile:"rotax916",fuel_percent:1,qualifiers:{fuel_percent:"<"}}).issues).toEqual([]);
  });
  it("requires review above 32 iron ppm and action above 42",()=>{
    expect(evaluateOil({reference_profile:"rotax916",iron:32}).status).toBe("Normal");
    expect(evaluateOil({reference_profile:"rotax916",iron:33}).status).toBe("Watch");
    expect(evaluateOil({reference_profile:"rotax916",iron:43}).status).toBe("Action Required");
  });
  it("detects a greater than 50 percent iron rate increase",()=>{
    expect(evaluateOil({reference_profile:"rotax916",iron:31,hours_on_oil:50},{iron:20,hours_on_oil:50}).issues.some(i=>i.message.includes("50%"))).toBe(true);
  });
  it("marks workbook sample 2 watch for viscosity and normalized lead, not absolute lead",()=>{
    const a={reference_profile:"rotax916",iron:20,copper:16,aluminum:3,lead:2763,hours_on_oil:50,fuel_type:"100LL",cst_viscosity_100c:12.91};
    const b={...a,iron:21,copper:12,aluminum:4,lead:3827,hours_on_oil:45,cst_viscosity_100c:12.22};
    expect(evaluateOil(a).status).toBe("Normal");
    const result=evaluateOil(b,a);
    expect(result.status).toBe("Watch");
    expect(result.issues.some(i=>i.message.includes("Lead"))).toBe(true);
    expect(rate(b,"lead")).toBeCloseTo(85.0444,3);
  });
  it("does not apply Rotax thresholds to other engine profiles",()=>{
    expect(evaluateOil({reference_profile:"lab",iron:43}).status).toBe("Not assessed");
    expect(evaluateOil({reference_profile:"lab",iron:43,lab_ranges:{iron:{max:40}}}).status).toBe("Watch");
  });
  it("upgrades old backups to 2.1 without modifying history",()=>{
    const original={version:"2.0",tables:{maintenance_logs:[{id:"history",tach_at_event:123}],oil_analysis_samples:[]}};
    const result=migrateToCurrentVersion(original);
    expect(result.data?.version).toBe("2.1");
    expect(result.data?.tables.oil_analysis_samples).toEqual([]);
    expect(result.data?.tables.maintenance_logs).toEqual(original.tables.maintenance_logs);
  });
});
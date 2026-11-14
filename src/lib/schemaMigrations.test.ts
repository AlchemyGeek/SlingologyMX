import { describe, it, expect } from "vitest";
import { migrateToCurrentVersion } from "./schemaMigrations";

const base = (version: string, aircraft: any, logs: any[]) => ({
  version, exportDate: "2026-11-01", aircraft,
  tables: { aircraft_counters: [], aircraft_counter_history: [], subscriptions: [], notifications: [], maintenance_logs: logs,
    directives: [], aircraft_directive_status: [], directive_history: [], maintenance_directive_compliance: [], equipment: [], transactions: [], reserves: [], oil_analysis_samples: [] },
});

describe("2.2 compression fields", () => {
  it("upgrades 2.1 backups with 4 cylinders, 60 threshold, no readings", () => {
    const r = migrateToCurrentVersion(base("2.1", { registration: "N1", model_make: null, serial_number: null }, [{ id: "a" }]));
    expect(r.data!.version).toBe("2.2");
    expect(r.data!.aircraft!.cylinder_count).toBe(4);
    expect(r.data!.aircraft!.compression_warning_threshold).toBe(60);
    expect(r.data!.tables.maintenance_logs[0].cylinder_compressions).toBeNull();
  });
  it("keeps 2.2 values unchanged", () => {
    const r = migrateToCurrentVersion(base("2.2", { registration: "N1", model_make: null, serial_number: null, cylinder_count: 6, compression_warning_threshold: 55 }, [{ id: "a", cylinder_compressions: [72, 74] }]));
    expect(r.data!.aircraft!.cylinder_count).toBe(6);
    expect(r.data!.aircraft!.compression_warning_threshold).toBe(55);
    expect(r.data!.tables.maintenance_logs[0].cylinder_compressions).toEqual([72, 74]);
  });
});

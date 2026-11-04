import { describe, expect, it } from "vitest";
import { matchOilEngine, type OilEngineEquipment } from "./oilEngineEquipment";
const engine: OilEngineEquipment = { id: "engine", name: "Engine", model_or_part_number: "Rotax 916 iS", serial_number: "1234567", archived: false, install_context: "Installed", installed_date: "2025-01-01" };
describe("oil sample engine correlation", () => {
  it("fills a missing serial from a uniquely matching installed engine", () => {
    expect(matchOilEngine({ engine_model: "ROTAX 916iS", sample_date: "2026-11-04" }, [engine])?.serial_number).toBe("1234567");
  });
  it("does not replace a different serial printed in the report", () => {
    expect(matchOilEngine({ engine_model: "Rotax 916 iS", engine_serial: "7654321" }, [engine])).toBeUndefined();
  });
  it("does not guess between multiple matching engines", () => {
    expect(matchOilEngine({ engine_model: "Rotax 916 iS" }, [engine, { ...engine, id: "second", serial_number: "7654321" }])).toBeUndefined();
  });
  it("does not use archived engines as a missing-serial fallback", () => {
    expect(matchOilEngine({ engine_model: "Rotax 916 iS" }, [{ ...engine, archived: true }])).toBeUndefined();
  });
  it("matches archived engines by their report serial for historical samples", () => {
    expect(matchOilEngine({ engine_serial: "1234567" }, [{ ...engine, archived: true }])?.id).toBe("engine");
  });
  it("does not use an engine installed after the sample", () => {
    expect(matchOilEngine({ engine_model: "Rotax 916 iS", sample_date: "2024-12-31" }, [engine])).toBeUndefined();
  });
  it("does not populate placeholder equipment serials", () => {
    expect(matchOilEngine({ engine_model: "Rotax 916 iS" }, [{ ...engine, serial_number: "TBD" }])).toBeUndefined();
  });
});
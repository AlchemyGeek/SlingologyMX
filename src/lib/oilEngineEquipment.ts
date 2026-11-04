export type OilEngineEquipment = {
  id: string; name: string; model_or_part_number: string | null; serial_number: string | null;
  archived: boolean; install_context: string | null; installed_date: string | null;
};
const normalized = (value: string | null | undefined) => (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function usableEngineSerial(value: string | null | undefined) {
  return !!normalized(value) && !["tbd", "unknown", "na", "none"].includes(normalized(value));
}
export function matchOilEngine(
  sample: { engine_serial?: string; engine_model?: string; sample_date?: string }, engines: OilEngineEquipment[],
): OilEngineEquipment | undefined {
  if (usableEngineSerial(sample.engine_serial)) {
    const matches = engines.filter(e => usableEngineSerial(e.serial_number) && normalized(e.serial_number) === normalized(sample.engine_serial));
    return matches.length === 1 ? matches[0] : undefined;
  }
  const model = normalized(sample.engine_model);
  if (!model) return undefined;
  const matches = engines.filter(e => !e.archived && e.install_context === "Installed"
    && (!sample.sample_date || !e.installed_date || e.installed_date <= sample.sample_date)
    && normalized(e.model_or_part_number) === model && usableEngineSerial(e.serial_number));
  return matches.length === 1 ? matches[0] : undefined;
}
interface ComplianceSnapshot {
  compliance_status: string;
  compliance_date: string;
  counter_type?: string | null;
  counter_value?: number | null;
}

/** Notes/attachments are edits, not additional compliance occurrences. */
export function shouldLogCompliance(
  previous: ComplianceSnapshot | null | undefined,
  next: ComplianceSnapshot,
): boolean {
  if (next.compliance_status !== "Complied") return false;
  if (!previous) return true;
  return previous.compliance_status !== next.compliance_status
    || previous.compliance_date !== next.compliance_date
    || (previous.counter_type || null) !== (next.counter_type || null)
    || (previous.counter_value ?? null) !== (next.counter_value ?? null);
}
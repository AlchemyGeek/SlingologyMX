import { CounterLog, CounterResult, getCounterValue } from "./counterInterpolation";

export type AmortizationBasis = "time" | "usage";

export interface TimeBasedAmortization {
  basis: "time";
  totalCost: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface UsageBasedAmortization {
  basis: "usage";
  totalCost: number;
  startCounterValue: number;
  endCounterValue: number;
}

export type AmortizationConfig = TimeBasedAmortization | UsageBasedAmortization;

export interface AmortizationResult {
  amortizedCost: number;
  ratePerDay?: number; // For time-based
  ratePerUnit?: number; // For usage-based
  explanation: string;
  confidence: "high" | "low";
  isPartial: boolean; // True if only partial overlap with analysis period
}

export interface PeriodAmortizationResult {
  itemTitle: string;
  amortizedCost: number;
  explanation: string;
  confidence: "high" | "low";
  basis: AmortizationBasis;
}

/**
 * Validates an amortization configuration.
 * Returns error message if invalid, null if valid.
 */
export function validateAmortizationConfig(config: AmortizationConfig): string | null {
  if (config.totalCost <= 0) {
    return "Total cost must be positive";
  }

  if (config.basis === "time") {
    if (!config.startDate || !config.endDate) {
      return "Start and end dates are required for time-based amortization";
    }
    if (config.endDate <= config.startDate) {
      return "End date must be after start date";
    }
  } else {
    if (config.startCounterValue === undefined || config.endCounterValue === undefined) {
      return "Start and end counter values are required for usage-based amortization";
    }
    if (config.endCounterValue <= config.startCounterValue) {
      return "End counter value must be greater than start counter value";
    }
  }

  return null;
}

/**
 * Calculates the amortized cost rate.
 */
export function getAmortizationRate(config: AmortizationConfig): { rate: number; unit: string } | null {
  const validationError = validateAmortizationConfig(config);
  if (validationError) {
    return null;
  }

  if (config.basis === "time") {
    const days = daysBetween(config.startDate, config.endDate);
    return {
      rate: config.totalCost / days,
      unit: "day",
    };
  } else {
    const units = config.endCounterValue - config.startCounterValue;
    return {
      rate: config.totalCost / units,
      unit: "hour", // Counter units are typically hours
    };
  }
}

/**
 * Calculates the amortized cost contribution for a specific analysis period (time-based).
 */
export function calculateTimeBasedAmortization(
  config: TimeBasedAmortization,
  analysisStart: string,
  analysisEnd: string
): AmortizationResult | null {
  const validationError = validateAmortizationConfig(config);
  if (validationError) {
    return null;
  }

  // Calculate overlap between amortization window and analysis window
  const overlapStart = config.startDate > analysisStart ? config.startDate : analysisStart;
  const overlapEnd = config.endDate < analysisEnd ? config.endDate : analysisEnd;

  // No overlap
  if (overlapStart >= overlapEnd) {
    return {
      amortizedCost: 0,
      ratePerDay: 0,
      explanation: "No overlap with analysis period",
      confidence: "high",
      isPartial: false,
    };
  }

  const totalDays = daysBetween(config.startDate, config.endDate);
  const overlapDays = daysBetween(overlapStart, overlapEnd);
  const ratePerDay = config.totalCost / totalDays;
  const amortizedCost = ratePerDay * overlapDays;

  const isPartial = overlapDays < totalDays;
  const periodDescription = formatDateRange(overlapStart, overlapEnd);

  return {
    amortizedCost: Math.round(amortizedCost * 100) / 100,
    ratePerDay: Math.round(ratePerDay * 100) / 100,
    explanation: `Amortized over ${totalDays} days (${periodDescription})`,
    confidence: "high",
    isPartial,
  };
}

/**
 * Calculates the amortized cost contribution for a specific analysis period (usage-based).
 * Requires counter log for interpolating/extrapolating counter values at period boundaries.
 */
export function calculateUsageBasedAmortization(
  config: UsageBasedAmortization,
  analysisStart: string,
  analysisEnd: string,
  counterLog: CounterLog
): AmortizationResult | null {
  const validationError = validateAmortizationConfig(config);
  if (validationError) {
    return null;
  }

  // Get counter values at analysis period boundaries
  const startCounter = getCounterValue(counterLog, analysisStart);
  const endCounter = getCounterValue(counterLog, analysisEnd);

  if (!startCounter || !endCounter) {
    return null; // Cannot determine counter values
  }

  // Validate counter values are within amortization range
  const effectiveStart = Math.max(startCounter.value, config.startCounterValue);
  const effectiveEnd = Math.min(endCounter.value, config.endCounterValue);

  // No overlap in usage range
  if (effectiveStart >= effectiveEnd) {
    return {
      amortizedCost: 0,
      ratePerUnit: 0,
      explanation: "No usage overlap with analysis period",
      confidence: "high",
      isPartial: false,
    };
  }

  const totalUnits = config.endCounterValue - config.startCounterValue;
  const consumedUnits = effectiveEnd - effectiveStart;
  const ratePerUnit = config.totalCost / totalUnits;
  const amortizedCost = ratePerUnit * consumedUnits;

  // Determine confidence based on counter value types
  const hasExtrapolation = startCounter.type === "extrapolated" || endCounter.type === "extrapolated";
  const confidence = hasExtrapolation ? "low" : "high";

  const isPartial = consumedUnits < totalUnits;

  return {
    amortizedCost: Math.round(amortizedCost * 100) / 100,
    ratePerUnit: Math.round(ratePerUnit * 100) / 100,
    explanation: `Amortized over ${totalUnits} hours (${consumedUnits.toFixed(1)} hours in period)`,
    confidence,
    isPartial,
  };
}

/**
 * Calculates amortization for any config type, dispatching to the appropriate method.
 */
export function calculateAmortization(
  config: AmortizationConfig,
  analysisStart: string,
  analysisEnd: string,
  counterLog?: CounterLog
): AmortizationResult | null {
  if (config.basis === "time") {
    return calculateTimeBasedAmortization(config, analysisStart, analysisEnd);
  } else {
    if (!counterLog) {
      return null; // Usage-based requires counter log
    }
    return calculateUsageBasedAmortization(config, analysisStart, analysisEnd, counterLog);
  }
}

/**
 * Batch calculation for multiple amortizable items.
 */
export interface AmortizableItem {
  title: string;
  config: AmortizationConfig;
}

export function calculatePeriodAmortizations(
  items: AmortizableItem[],
  analysisStart: string,
  analysisEnd: string,
  counterLog?: CounterLog
): PeriodAmortizationResult[] {
  const results: PeriodAmortizationResult[] = [];

  for (const item of items) {
    const result = calculateAmortization(item.config, analysisStart, analysisEnd, counterLog);
    
    if (result && result.amortizedCost > 0) {
      results.push({
        itemTitle: item.title,
        amortizedCost: result.amortizedCost,
        explanation: result.explanation,
        confidence: result.confidence,
        basis: item.config.basis,
      });
    }
  }

  return results;
}

// Helper functions
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

/**
 * Tach-driven counter model.
 *
 * Tach is the master meter. Airframe, Engine and Prop TT advance 1:1 with Tach.
 * Airframe TT never resets; Engine/Prop TT restart from a starting value after
 * an overhaul or replacement recorded at a given Tach reading.
 * When Hobbs is linked to Tach it is hidden and mirrors Tach.
 */

export interface CounterSnapshot {
  hobbs: number | null;
  tach: number | null;
  airframe_total_time: number | null;
  engine_total_time: number | null;
  prop_total_time: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Component time at `tach` for a component installed at `installTach` with `startHours`. */
export function componentTimeFromTach(tach: number, installTach: number, startHours: number): number {
  return round1(Math.max(0, startHours + (tach - installTach)));
}

/**
 * Given current counters and a new Tach reading, derive Airframe/Engine/Prop TT
 * by applying the Tach delta. Hobbs mirrors Tach when linked.
 */
export function deriveFromTach(
  current: CounterSnapshot,
  newTach: number,
  opts: { linkHobbsToTach: boolean; newHobbs?: number | null },
): CounterSnapshot {
  const baseTach = Number(current.tach ?? 0);
  const delta = newTach - baseTach;
  const adv = (v: number | null) => round1(Math.max(0, Number(v ?? 0) + delta));
  return {
    hobbs: opts.linkHobbsToTach ? round1(newTach) : (opts.newHobbs ?? current.hobbs),
    tach: round1(newTach),
    airframe_total_time: adv(current.airframe_total_time),
    engine_total_time: adv(current.engine_total_time),
    prop_total_time: adv(current.prop_total_time),
  };
}

/** Counter-type options shown in pickers; Hobbs is hidden when linked to Tach. */
export function visibleCounterTypes<T extends string>(all: readonly T[], linkHobbsToTach: boolean): T[] {
  return all.filter((t) => !(linkHobbsToTach && t === "Hobbs")) as T[];
}

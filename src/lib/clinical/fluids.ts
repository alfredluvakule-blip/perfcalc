/**
 * Fluid calculations and fluid balance. Pure functions.
 *
 * No single maintenance formula suits every patient, so each method names the
 * population it was described for, and hospital-specific rates (for example
 * neonatal mL/kg/day by day of life) are entered by the user from the local protocol.
 */
import { maintenanceFluid } from "../perfusion";
import { isFiniteNumber, isPositive, show } from "./units";

export type MaintenanceMethod = "holliday-segar" | "per-kg-day";

export interface MaintenanceResult {
  ok: boolean;
  errors: string[];
  steps: string[];
  mlPerHour: number | null;
  mlPerDay: number | null;
}

/** Holliday-Segar daily volume: 100 mL/kg for the first 10 kg, 50 for the next 10, 20 above 20 kg. */
export function hollidaySegarDaily(weightKg: number): number {
  if (weightKg <= 10) return weightKg * 100;
  if (weightKg <= 20) return 1000 + (weightKg - 10) * 50;
  return 1500 + (weightKg - 20) * 20;
}

export function maintenance(method: MaintenanceMethod, weightKg: number | null, mlPerKgPerDay?: number | null): MaintenanceResult {
  const errors: string[] = [];
  const steps: string[] = [];
  const r: MaintenanceResult = { ok: false, errors, steps, mlPerHour: null, mlPerDay: null };
  if (!isPositive(weightKg)) errors.push("Enter the weight.");
  if (method === "per-kg-day" && !isPositive(mlPerKgPerDay)) errors.push("Enter the rate from the local protocol (mL/kg/day).");
  if (errors.length) return r;
  const w = weightKg as number;
  if (method === "holliday-segar") {
    // The hourly 4-2-1 rule already used by PerfCalc's Anaesthesia tab.
    const h = maintenanceFluid(w) as number;
    const d = hollidaySegarDaily(w);
    if (w <= 10) steps.push(`${show(w)} kg × 4 mL/kg/h = ${show(h)} mL/h`);
    else if (w <= 20) steps.push(`40 mL/h + (${show(w)} − 10) kg × 2 mL/kg/h = ${show(h)} mL/h`);
    else steps.push(`60 mL/h + (${show(w)} − 20) kg × 1 mL/kg/h = ${show(h)} mL/h`);
    steps.push(`Per day (100 / 50 / 20 mL/kg) = ${show(d)} mL/day`);
    r.mlPerHour = h;
    r.mlPerDay = d;
  } else {
    const d = w * (mlPerKgPerDay as number);
    steps.push(`${show(w)} kg × ${show(mlPerKgPerDay)} mL/kg/day = ${show(d)} mL/day`);
    steps.push(`${show(d)} mL/day ÷ 24 = ${show(d / 24)} mL/h`);
    r.mlPerDay = d;
    r.mlPerHour = d / 24;
  }
  r.ok = true;
  return r;
}

/** Fluid deficit (mL) from an estimated % dehydration: 1% of body weight is 10 mL/kg. */
export function deficitMl(weightKg: number | null, percent: number | null): number | null {
  if (!isPositive(weightKg) || !isPositive(percent)) return null;
  return weightKg * percent * 10;
}

/* ---------------------------- fluid balance chart ---------------------------- */

export type FluidKind = "iv" | "oral" | "enteral" | "blood" | "other-in" | "urine" | "drain" | "vomit" | "ng" | "stool" | "other-out";

export const FLUID_KINDS: { kind: FluidKind; direction: "in" | "out" }[] = [
  { kind: "iv", direction: "in" },
  { kind: "oral", direction: "in" },
  { kind: "enteral", direction: "in" },
  { kind: "blood", direction: "in" },
  { kind: "other-in", direction: "in" },
  { kind: "urine", direction: "out" },
  { kind: "drain", direction: "out" },
  { kind: "vomit", direction: "out" },
  { kind: "ng", direction: "out" },
  { kind: "stool", direction: "out" },
  { kind: "other-out", direction: "out" },
];

export function directionOf(kind: FluidKind): "in" | "out" {
  return FLUID_KINDS.find((k) => k.kind === kind)!.direction;
}

export interface FluidEntry {
  id: string;
  /** ISO time the volume was measured or given. */
  time: string;
  kind: FluidKind;
  volumeMl: number;
  note?: string;
}

export interface BalanceSummary {
  intakeMl: number;
  outputMl: number;
  netMl: number;
  /** Net including any balance carried in from earlier days. */
  cumulativeMl: number;
  byKind: Partial<Record<FluidKind, number>>;
  urineMl: number;
  urineMlKgH: number | null;
  /** (intake − output) in L ÷ admission weight kg × 100 (Goldstein et al. 2001). */
  fluidOverloadPct: number | null;
  hours: number;
  /** Hourly points for the chart: hours from start and cumulative net mL. */
  series: { t: number; net: number }[];
}

export function summariseBalance(
  entries: FluidEntry[],
  opts: { start: Date; end: Date; weightKg: number | null; admissionWeightKg?: number | null; carriedInMl?: number | null },
): BalanceSummary {
  const startMs = opts.start.getTime();
  const endMs = opts.end.getTime();
  const hours = Math.max(0, (endMs - startMs) / 3_600_000);
  const inWindow = entries
    .filter((e) => {
      const t = new Date(e.time).getTime();
      return Number.isFinite(t) && t >= startMs && t <= endMs && isFiniteNumber(e.volumeMl) && e.volumeMl >= 0;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
  const byKind: Partial<Record<FluidKind, number>> = {};
  let intake = 0;
  let output = 0;
  for (const e of inWindow) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + e.volumeMl;
    if (directionOf(e.kind) === "in") intake += e.volumeMl;
    else output += e.volumeMl;
  }
  const net = intake - output;
  const carried = isFiniteNumber(opts.carriedInMl) ? opts.carriedInMl : 0;
  const urine = byKind.urine ?? 0;
  const urineMlKgH = isPositive(opts.weightKg) && hours > 0 ? urine / opts.weightKg / hours : null;
  const admW = isPositive(opts.admissionWeightKg) ? opts.admissionWeightKg : null;
  const fluidOverloadPct = admW ? ((carried + net) / 1000 / admW) * 100 : null;

  // Cumulative net at each hour boundary, then at the end.
  const series: { t: number; net: number }[] = [{ t: 0, net: carried }];
  let running = carried;
  let idx = 0;
  const steps = Math.ceil(hours);
  for (let h = 1; h <= steps; h++) {
    const boundary = Math.min(startMs + h * 3_600_000, endMs);
    while (idx < inWindow.length && new Date(inWindow[idx].time).getTime() <= boundary) {
      const e = inWindow[idx];
      running += directionOf(e.kind) === "in" ? e.volumeMl : -e.volumeMl;
      idx++;
    }
    series.push({ t: (boundary - startMs) / 3_600_000, net: running });
  }

  return { intakeMl: intake, outputMl: output, netMl: net, cumulativeMl: carried + net, byKind, urineMl: urine, urineMlKgH, fluidOverloadPct, hours, series };
}

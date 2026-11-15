/**
 * Typed units for drug calculations.
 *
 * Amounts belong to a family. Only units in the same family convert into each
 * other: mass (g, mg, mcg, ng) or one of the non-mass families (units,
 * millimoles, milliequivalents). Converting between families needs drug-specific
 * information, so it is refused rather than guessed.
 */

export type MassUnit = "g" | "mg" | "mcg" | "ng";
export type AmountUnit = MassUnit | "units" | "mmol" | "mEq";
export type Family = "mass" | "units" | "mmol" | "mEq";
export type TimeUnit = "min" | "h";

/** Factor to the family's base unit (mcg for mass). */
const TO_BASE: Record<AmountUnit, { family: Family; factor: number }> = {
  g: { family: "mass", factor: 1_000_000 },
  mg: { family: "mass", factor: 1000 },
  mcg: { family: "mass", factor: 1 },
  ng: { family: "mass", factor: 0.001 },
  units: { family: "units", factor: 1 },
  mmol: { family: "mmol", factor: 1 },
  mEq: { family: "mEq", factor: 1 },
};

export const AMOUNT_UNITS: AmountUnit[] = ["g", "mg", "mcg", "ng", "units", "mmol", "mEq"];

export function familyOf(unit: AmountUnit): Family {
  return TO_BASE[unit].family;
}

export function compatible(a: AmountUnit, b: AmountUnit): boolean {
  return familyOf(a) === familyOf(b);
}

export class UnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitError";
  }
}

/** Convert an amount between units of the same family. Throws UnitError otherwise. */
export function convertAmount(value: number, from: AmountUnit, to: AmountUnit): number {
  if (!compatible(from, to)) {
    throw new UnitError(`${from} and ${to} measure different things and cannot be converted.`);
  }
  return (value * TO_BASE[from].factor) / TO_BASE[to].factor;
}

export const MINUTES_PER: Record<TimeUnit, number> = { min: 1, h: 60 };

/** A dose rate such as mcg/kg/min, mg/h or units/kg/h. */
export interface DoseUnit {
  amount: AmountUnit;
  perKg: boolean;
  per: TimeUnit;
}

export function doseUnitLabel(u: DoseUnit): string {
  return `${u.amount}${u.perKg ? "/kg" : ""}/${u.per}`;
}

export function parseDoseUnit(label: string): DoseUnit {
  const parts = label.split("/");
  if (parts.length < 2 || parts.length > 3) throw new UnitError(`"${label}" is not a dose rate unit.`);
  const amount = parts[0] as AmountUnit;
  if (!(amount in TO_BASE)) throw new UnitError(`Unknown amount unit "${parts[0]}".`);
  const perKg = parts.length === 3;
  if (perKg && parts[1] !== "kg") throw new UnitError(`"${label}" is not a dose rate unit.`);
  const per = parts[parts.length - 1] as TimeUnit;
  if (per !== "min" && per !== "h") throw new UnitError(`Unknown time unit "${per}".`);
  return { amount, perKg, per };
}

/** The dose rate units offered in the calculator. */
export const DOSE_UNITS: string[] = [
  "mcg/kg/min",
  "mcg/kg/h",
  "ng/kg/min",
  "mg/kg/h",
  "mg/kg/min",
  "mcg/min",
  "mcg/h",
  "mg/min",
  "mg/h",
  "g/h",
  "units/kg/h",
  "units/kg/min",
  "units/h",
  "units/min",
  "mmol/kg/h",
  "mmol/h",
  "mEq/kg/h",
  "mEq/h",
];

export const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
export const isPositive = (n: unknown): n is number => isFiniteNumber(n) && n > 0;

/** Format a number for display: sensible significant figures, no trailing zeros. */
export function show(n: number | null | undefined, maxDecimals?: number): string {
  if (!isFiniteNumber(n)) return "—";
  const abs = Math.abs(n);
  const d = maxDecimals ?? (abs >= 100 ? 1 : abs >= 10 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4);
  return n.toLocaleString("en-GB", { maximumFractionDigits: d });
}

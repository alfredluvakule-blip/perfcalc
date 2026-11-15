/**
 * Continuous infusion and syringe pump engine. Pure functions only.
 *
 * Nothing here holds a drug concentration or a dose limit. Every concentration
 * is entered by the user or taken from the hospital formulary, and limits are
 * optional inputs.
 */
import {
  MINUTES_PER,
  UnitError,
  compatible,
  convertAmount,
  doseUnitLabel,
  isFiniteNumber,
  isPositive,
  parseDoseUnit,
  show,
  type AmountUnit,
  type DoseUnit,
  DOSE_UNITS,
} from "./units";

export interface Concentration {
  /** Drug amount in the syringe or bag. */
  amount: number | null;
  unit: AmountUnit;
  /** Total volume the amount is dissolved in, mL. */
  volumeMl: number | null;
}

export interface DoseLimits {
  /** All limits are in `unit`. Any may be left empty. */
  unit: string;
  softMin?: number | null;
  softMax?: number | null;
  hardMin?: number | null;
  hardMax?: number | null;
}

export interface PumpLimits {
  minRateMlH?: number | null;
  maxRateMlH?: number | null;
}

export interface InfusionInput {
  mode: "dose-to-rate" | "rate-to-dose";
  concentration: Concentration;
  weightKg: number | null;
  /** Dose rate unit, for example "mcg/kg/min". */
  doseUnit: string;
  dose?: number | null;
  rateMlH?: number | null;
  /** Planned infusion time, hours. Optional. */
  durationH?: number | null;
  /** Volume left in the syringe now, mL. Optional; defaults to the full volume. */
  remainingMl?: number | null;
  limits?: DoseLimits | null;
  pump?: PumpLimits | null;
}

export type Severity = "info" | "caution" | "stop";

export interface Message {
  severity: Severity;
  text: string;
}

export interface InfusionResult {
  ok: boolean;
  errors: string[];
  warnings: Message[];
  steps: string[];
  formula: string;
  concentrationPerMl: number | null;
  concentrationUnit: AmountUnit;
  rateMlH: number | null;
  dose: number | null;
  doseUnit: string;
  amountPerHour: number | null;
  equivalents: { unit: string; value: number }[];
  totalDrug: number | null;
  totalFluidMl: number | null;
  remainingAfterMl: number | null;
  hoursToEmpty: number | null;
  /** True when a hard limit is crossed: the result must not be used as entered. */
  blocked: boolean;
}

/** Amount per hour, in `toUnit`, for a dose rate. */
function amountPerHour(dose: number, u: DoseUnit, weightKg: number | null, toUnit: AmountUnit): number {
  const perEvent = convertAmount(dose, u.amount, toUnit);
  const perPatient = u.perKg ? perEvent * (weightKg as number) : perEvent;
  return perPatient * (60 / MINUTES_PER[u.per]);
}

/** Convert a dose rate between two compatible dose units. Throws UnitError. */
export function convertDoseRate(value: number, from: string, to: string, weightKg: number | null): number {
  const f = parseDoseUnit(from);
  const t = parseDoseUnit(to);
  if (!compatible(f.amount, t.amount)) throw new UnitError(`${from} and ${to} cannot be converted.`);
  if ((f.perKg || t.perKg) && !isPositive(weightKg)) throw new UnitError("Weight is needed to convert to or from a per-kg dose.");
  const perH = amountPerHour(value, f, weightKg, t.amount);
  const perPatient = perH / (60 / MINUTES_PER[t.per]);
  return t.perKg ? perPatient / (weightKg as number) : perPatient;
}

export function calculateInfusion(input: InfusionInput): InfusionResult {
  const errors: string[] = [];
  const warnings: Message[] = [];
  const steps: string[] = [];
  const c = input.concentration;
  const base: InfusionResult = {
    ok: false,
    errors,
    warnings,
    steps,
    formula: "",
    concentrationPerMl: null,
    concentrationUnit: c.unit,
    rateMlH: null,
    dose: null,
    doseUnit: input.doseUnit,
    amountPerHour: null,
    equivalents: [],
    totalDrug: null,
    totalFluidMl: null,
    remainingAfterMl: null,
    hoursToEmpty: null,
    blocked: false,
  };

  let u: DoseUnit;
  try {
    u = parseDoseUnit(input.doseUnit);
  } catch (e) {
    errors.push((e as Error).message);
    return base;
  }

  if (!isPositive(c.amount)) errors.push("Enter the amount of drug in the syringe.");
  if (!isPositive(c.volumeMl)) errors.push("Enter the total volume in the syringe (mL).");
  if (!compatible(u.amount, c.unit)) {
    errors.push(
      `The concentration is in ${c.unit} but the dose is in ${u.amount}. These measure different things and cannot be converted. Choose a dose unit in the same family as the concentration.`,
    );
  }
  if (u.perKg && !isPositive(input.weightKg)) errors.push("This is a weight-based dose: enter the patient's weight.");
  if (isFiniteNumber(input.weightKg) && input.weightKg > 0 && (input.weightKg < 0.3 || input.weightKg > 350)) {
    warnings.push({ severity: "caution", text: `A weight of ${show(input.weightKg)} kg is unusual. Check it was entered in kilograms.` });
  }
  if (input.mode === "dose-to-rate" && !isPositive(input.dose)) errors.push("Enter the dose to give.");
  if (input.mode === "rate-to-dose" && !isPositive(input.rateMlH)) errors.push("Enter the pump rate (mL/h).");
  if (errors.length) return base;

  const conc = (c.amount as number) / (c.volumeMl as number);
  base.concentrationPerMl = conc;
  const w = u.perKg ? (input.weightKg as number) : null;
  const unitLabel = doseUnitLabel(u);
  steps.push(`Concentration = ${show(c.amount)} ${c.unit} ÷ ${show(c.volumeMl)} mL = ${show(conc)} ${c.unit}/mL`);

  let rate: number;
  let dose: number;
  let perHour: number;
  const toHour = 60 / MINUTES_PER[u.per];
  const convFactor = convertAmount(1, u.amount, c.unit);

  if (input.mode === "dose-to-rate") {
    dose = input.dose as number;
    perHour = amountPerHour(dose, u, w, c.unit);
    rate = perHour / conc;
    const pieces = [`${show(dose)} ${unitLabel}`];
    if (convFactor !== 1) pieces.push(`× ${show(convFactor)} (${u.amount} → ${c.unit})`);
    if (u.perKg) pieces.push(`× ${show(w)} kg`);
    if (toHour !== 1) pieces.push(`× ${toHour} min/h`);
    steps.push(`Drug per hour = ${pieces.join(" ")} = ${show(perHour)} ${c.unit}/h`);
    steps.push(`Rate = ${show(perHour)} ${c.unit}/h ÷ ${show(conc)} ${c.unit}/mL = ${show(rate)} mL/h`);
    base.formula = `rate (mL/h) = dose${u.perKg ? " × weight" : ""}${toHour !== 1 ? " × 60" : ""} ÷ concentration`;
  } else {
    rate = input.rateMlH as number;
    perHour = rate * conc;
    dose = perHour / convFactor / (u.perKg ? (w as number) : 1) / toHour;
    steps.push(`Drug per hour = ${show(rate)} mL/h × ${show(conc)} ${c.unit}/mL = ${show(perHour)} ${c.unit}/h`);
    const pieces = [`${show(perHour)} ${c.unit}/h`];
    if (convFactor !== 1) pieces.push(`÷ ${show(convFactor)} (${u.amount} → ${c.unit})`);
    if (u.perKg) pieces.push(`÷ ${show(w)} kg`);
    if (toHour !== 1) pieces.push(`÷ ${toHour} min/h`);
    steps.push(`Dose = ${pieces.join(" ")} = ${show(dose)} ${unitLabel}`);
    base.formula = `dose = rate × concentration${u.perKg ? " ÷ weight" : ""}${toHour !== 1 ? " ÷ 60" : ""}`;
  }

  base.rateMlH = rate;
  base.dose = dose;
  base.amountPerHour = perHour;

  // The same dose in other compatible units, so the user can check against an order written another way.
  base.equivalents = DOSE_UNITS.filter((label) => label !== input.doseUnit)
    .map((label) => ({ label, unit: parseDoseUnit(label) }))
    .filter(({ unit }) => compatible(unit.amount, u.amount) && (!unit.perKg || isPositive(input.weightKg)))
    .map(({ label }) => ({ unit: label, value: convertDoseRate(dose, input.doseUnit, label, input.weightKg) }));

  // Duration and syringe volume.
  const remaining = isFiniteNumber(input.remainingMl) && input.remainingMl >= 0 ? input.remainingMl : (c.volumeMl as number);
  if (remaining > (c.volumeMl as number)) {
    warnings.push({ severity: "caution", text: "The volume left is more than the syringe was made up to. Check both volumes." });
  }
  base.hoursToEmpty = rate > 0 ? remaining / rate : null;
  steps.push(`Time until empty = ${show(remaining)} mL ÷ ${show(rate)} mL/h = ${show(base.hoursToEmpty)} h`);
  if (isPositive(input.durationH)) {
    base.totalFluidMl = rate * input.durationH;
    base.totalDrug = perHour * input.durationH;
    base.remainingAfterMl = remaining - base.totalFluidMl;
    steps.push(`Over ${show(input.durationH)} h: ${show(base.totalFluidMl)} mL and ${show(base.totalDrug)} ${c.unit}`);
    if (base.remainingAfterMl < 0) {
      warnings.push({
        severity: "caution",
        text: `The syringe empties after ${show(base.hoursToEmpty)} h, before the planned ${show(input.durationH)} h. Prepare the next syringe in time.`,
      });
    }
  }

  // Limits set by the user or the hospital formulary. None are built in.
  const lim = input.limits;
  if (lim) {
    let inLimitUnit: number | null = null;
    try {
      inLimitUnit = convertDoseRate(dose, input.doseUnit, lim.unit, input.weightKg);
    } catch (e) {
      warnings.push({ severity: "caution", text: `The dose limits are in ${lim.unit} and could not be checked: ${(e as Error).message}` });
    }
    if (inLimitUnit !== null) {
      const v = inLimitUnit;
      const at = `${show(v)} ${lim.unit}`;
      if (isFiniteNumber(lim.hardMax) && v > lim.hardMax) {
        base.blocked = true;
        warnings.push({ severity: "stop", text: `${at} is above the hard maximum of ${show(lim.hardMax)} ${lim.unit}. Do not start without prescriber review.` });
      } else if (isFiniteNumber(lim.softMax) && v > lim.softMax) {
        warnings.push({ severity: "caution", text: `${at} is above the usual maximum of ${show(lim.softMax)} ${lim.unit}. Confirm with the prescriber.` });
      }
      if (isFiniteNumber(lim.hardMin) && v < lim.hardMin) {
        base.blocked = true;
        warnings.push({ severity: "stop", text: `${at} is below the hard minimum of ${show(lim.hardMin)} ${lim.unit}. Check the order and the concentration.` });
      } else if (isFiniteNumber(lim.softMin) && v < lim.softMin) {
        warnings.push({ severity: "caution", text: `${at} is below the usual minimum of ${show(lim.softMin)} ${lim.unit}. Check the order and the concentration.` });
      }
    }
  }

  const pump = input.pump;
  if (pump) {
    if (isFiniteNumber(pump.minRateMlH) && rate < pump.minRateMlH) {
      warnings.push({ severity: "caution", text: `${show(rate)} mL/h is below the pump's lowest rate of ${show(pump.minRateMlH)} mL/h. A weaker dilution may be needed.` });
    }
    if (isFiniteNumber(pump.maxRateMlH) && rate > pump.maxRateMlH) {
      warnings.push({ severity: "caution", text: `${show(rate)} mL/h is above the pump's highest rate of ${show(pump.maxRateMlH)} mL/h. A stronger dilution may be needed.` });
    }
  }
  if (base.hoursToEmpty !== null && base.hoursToEmpty < 1) {
    warnings.push({ severity: "info", text: `At this rate the syringe lasts under an hour (${show(base.hoursToEmpty * 60, 0)} min).` });
  }

  base.ok = true;
  return base;
}

/**
 * Syringe preparation: from ampoules to a diluted syringe. Pure functions.
 * Ampoule strengths are typed by the user from the ampoule in hand.
 */
import { convertAmount, compatible, isPositive, show, type AmountUnit } from "./units";

export interface PrepInput {
  drug: string;
  /** Drug in one ampoule or vial. */
  ampouleAmount: number | null;
  ampouleUnit: AmountUnit;
  /** Volume of one ampoule, mL. */
  ampouleVolumeMl: number | null;
  /** Final syringe volume after dilution, mL. */
  finalVolumeMl: number | null;
  /** Either the number of ampoules used... */
  ampoules?: number | null;
  /** ...or a target final concentration, per mL, in `targetUnit`. */
  targetConcentration?: number | null;
  targetUnit?: AmountUnit;
  mode: "from-ampoules" | "to-concentration";
}

export interface PrepResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: string[];
  totalDrug: number | null;
  unit: AmountUnit;
  drugVolumeMl: number | null;
  diluentMl: number | null;
  finalConcentration: number | null;
  ampoulesUsed: number | null;
}

export function prepareSyringe(p: PrepInput): PrepResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: string[] = [];
  const r: PrepResult = {
    ok: false,
    errors,
    warnings,
    steps,
    totalDrug: null,
    unit: p.ampouleUnit,
    drugVolumeMl: null,
    diluentMl: null,
    finalConcentration: null,
    ampoulesUsed: null,
  };
  if (!isPositive(p.ampouleAmount)) errors.push("Enter the amount of drug in one ampoule, as printed on it.");
  if (!isPositive(p.ampouleVolumeMl)) errors.push("Enter the volume of one ampoule (mL).");
  if (!isPositive(p.finalVolumeMl)) errors.push("Enter the final syringe volume (mL).");
  if (p.mode === "from-ampoules" && !isPositive(p.ampoules)) errors.push("Enter how many ampoules go into the syringe.");
  if (p.mode === "to-concentration") {
    if (!isPositive(p.targetConcentration)) errors.push("Enter the final concentration wanted.");
    if (p.targetUnit && !compatible(p.targetUnit, p.ampouleUnit)) {
      errors.push(`The ampoule is labelled in ${p.ampouleUnit} but the target is in ${p.targetUnit}. These cannot be converted.`);
    }
  }
  if (errors.length) return r;

  const amp = p.ampouleAmount as number;
  const ampVol = p.ampouleVolumeMl as number;
  const finalVol = p.finalVolumeMl as number;
  const ampConc = amp / ampVol;
  steps.push(`Ampoule strength = ${show(amp)} ${p.ampouleUnit} ÷ ${show(ampVol)} mL = ${show(ampConc)} ${p.ampouleUnit}/mL`);

  let n: number;
  let total: number;
  if (p.mode === "from-ampoules") {
    n = p.ampoules as number;
    total = n * amp;
    steps.push(`Total drug = ${show(n)} ampoule(s) × ${show(amp)} ${p.ampouleUnit} = ${show(total)} ${p.ampouleUnit}`);
  } else {
    const target = convertAmount(p.targetConcentration as number, p.targetUnit ?? p.ampouleUnit, p.ampouleUnit);
    total = target * finalVol;
    n = total / amp;
    steps.push(`Total drug needed = ${show(target)} ${p.ampouleUnit}/mL × ${show(finalVol)} mL = ${show(total)} ${p.ampouleUnit}`);
    steps.push(`Ampoules = ${show(total)} ÷ ${show(amp)} = ${show(n)}`);
    if (Math.abs(n - Math.round(n)) > 1e-6) warnings.push(`This uses part of an ampoule (${show(n)}). Discard the unused part as per policy.`);
  }
  const drugVol = total / ampConc;
  const diluent = finalVol - drugVol;
  steps.push(`Drug volume to draw up = ${show(total)} ÷ ${show(ampConc)} ${p.ampouleUnit}/mL = ${show(drugVol)} mL`);
  steps.push(`Diluent = ${show(finalVol)} mL − ${show(drugVol)} mL = ${show(diluent)} mL`);
  const finalConc = total / finalVol;
  steps.push(`Final concentration = ${show(total)} ${p.ampouleUnit} ÷ ${show(finalVol)} mL = ${show(finalConc)} ${p.ampouleUnit}/mL`);

  if (diluent < -1e-9) {
    errors.push(`The drug alone is ${show(drugVol)} mL, more than the ${show(finalVol)} mL syringe. Use fewer ampoules or a larger volume.`);
    return r;
  }
  if (diluent < 1e-9) warnings.push("No diluent: the syringe is undiluted drug.");

  Object.assign(r, { ok: true, totalDrug: total, drugVolumeMl: drugVol, diluentMl: Math.max(0, diluent), finalConcentration: finalConc, ampoulesUsed: n });
  return r;
}

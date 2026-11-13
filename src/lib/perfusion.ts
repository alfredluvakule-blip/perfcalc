/**
 * PerfCalc TZ — formulas. Pure functions only, so each one can be tested.
 * Clinical constants come from ./perfusion-data.
 */
import {
  ARTERIAL_CANNULAE,
  CARDIOPLEGIA_TYPES,
  CIRCUIT_PRESETS,
  DEFAULT_CI,
  DEFAULT_TARGET_HCT,
  EBV_ADULT,
  EBV_BANDS,
  FLOW_PER_KG_BANDS,
  HEPARIN,
  OXYGENATOR_CLASSES,
  OXYGENATOR_RESERVE,
  PROTAMINE,
  TUBING_ID_INCH,
  TUBING_PACKS,
  TWO_STAGE_CANNULAE,
  VENOUS_CANNULAE,
  type CardioplegiaType,
  type CircuitPreset,
  type CircuitPresetId,
  type DoseRow,
  type PrimeParts,
  type TubingRow,
  type TubingSize,
} from "./perfusion-data";

export type Group = "adult" | "paed";
export type Sex = "M" | "F";
export type BsaFormula = "mosteller" | "dubois" | "haycock";
export type FlowBasis = "auto" | "ci" | "kg";
export type RbcMode = "add" | "replace";

const ok = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);
const pos = (n: number | null | undefined): n is number => ok(n) && n > 0;

/* ---------------------------- basic formulas ---------------------------- */

export function bsa(weightKg: number | null, heightCm: number | null, formula: BsaFormula = "mosteller"): number | null {
  if (!pos(weightKg) || !pos(heightCm)) return null;
  switch (formula) {
    case "dubois":
      return 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725);
    case "haycock":
      return 0.024265 * Math.pow(weightKg, 0.5378) * Math.pow(heightCm, 0.3964);
    default:
      return Math.sqrt((weightKg * heightCm) / 3600);
  }
}

export function ebvPerKgDefault(weightKg: number | null, sex: Sex): number | null {
  if (!pos(weightKg)) return null;
  const band = EBV_BANDS.find((b) => weightKg <= b.maxKg);
  return band ? band.mlPerKg : EBV_ADULT[sex];
}

export function flowPerKgDefault(weightKg: number | null): number | null {
  if (!pos(weightKg)) return null;
  return FLOW_PER_KG_BANDS.find((b) => weightKg <= b.maxKg)!.mlKgMin;
}

/** mL held by one metre of tubing. */
export function tubingMlPerMetre(size: TubingSize): number {
  const radiusCm = (TUBING_ID_INCH[size] * 2.54) / 2;
  return Math.PI * radiusCm * radiusCm * 100;
}

export function tubingVolume(size: TubingSize, lengthCm: number | null): number {
  return pos(lengthCm) ? (tubingMlPerMetre(size) * lengthCm) / 100 : 0;
}

/** Haematocrit (%) after mixing the patient's blood volume with the prime. */
export function hctOnBypass(ebvMl: number | null, hct: number | null, primeMl: number | null): number | null {
  if (!pos(ebvMl) || !pos(hct) || !ok(primeMl) || primeMl < 0) return null;
  return (ebvMl * hct) / (ebvMl + primeMl);
}

/**
 * Packed red cells (mL) needed to reach the target haematocrit on bypass.
 * "add": red cells are given on top of the prime.
 * "replace": red cells displace the same volume of crystalloid prime.
 */
export function rbcVolume(
  ebvMl: number | null,
  hct: number | null,
  primeMl: number | null,
  targetHct: number | null,
  donorHct: number | null,
  mode: RbcMode,
): number | null {
  if (!pos(ebvMl) || !pos(hct) || !ok(primeMl) || !pos(targetHct) || !pos(donorHct)) return null;
  if (donorHct <= targetHct) return null;
  const shortfall = targetHct * (ebvMl + primeMl) - ebvMl * hct;
  if (shortfall <= 0) return 0;
  return mode === "add" ? shortfall / (donorHct - targetHct) : shortfall / donorHct;
}

/** Largest crystalloid prime (mL) that still leaves the target haematocrit. */
export function maxPrimeForHct(ebvMl: number | null, hct: number | null, targetHct: number | null): number | null {
  if (!pos(ebvMl) || !pos(hct) || !pos(targetHct)) return null;
  return Math.max(0, ebvMl * (hct / targetHct - 1));
}

/** Filtrate (mL) to remove to raise haematocrit from now to target. */
export function ultrafiltrationVolume(totalVolumeMl: number | null, hctNow: number | null, hctTarget: number | null): number | null {
  if (!pos(totalVolumeMl) || !pos(hctNow) || !pos(hctTarget)) return null;
  if (hctTarget <= hctNow) return 0;
  return totalVolumeMl * (1 - hctNow / hctTarget);
}

/** Arterial oxygen content, mL O2 per dL. SaO2 as a percentage. */
export function cao2(hbGdl: number | null, sao2Pct: number | null, pao2: number | null): number | null {
  if (!pos(hbGdl) || !pos(sao2Pct)) return null;
  return 1.34 * hbGdl * (sao2Pct / 100) + 0.003 * (pos(pao2) ? pao2 : 0);
}

/** Oxygen delivery, mL/min. */
export function do2(flowLmin: number | null, cao2Value: number | null): number | null {
  if (!pos(flowLmin) || !pos(cao2Value)) return null;
  return flowLmin * cao2Value * 10;
}

/** Pump flow (L/min) needed to reach an indexed oxygen delivery. */
export function flowForDo2i(targetDo2i: number, bsaM2: number | null, cao2Value: number | null): number | null {
  if (!pos(bsaM2) || !pos(cao2Value)) return null;
  return (targetDo2i * bsaM2) / (cao2Value * 10);
}

/** Systemic vascular resistance, dyn·s·cm⁻⁵. */
export function svr(map: number | null, cvp: number | null, flowLmin: number | null): number | null {
  if (!pos(map) || !ok(cvp) || !pos(flowLmin)) return null;
  return ((map - cvp) * 80) / flowLmin;
}

/** mL/h for a dose in mcg/kg/min. */
export function infusionRate(doseMcgKgMin: number | null, weightKg: number | null, amountMg: number | null, volumeMl: number | null): number | null {
  if (!pos(doseMcgKgMin) || !pos(weightKg) || !pos(amountMg) || !pos(volumeMl)) return null;
  const concMcgPerMl = (amountMg * 1000) / volumeMl;
  return (doseMcgKgMin * weightKg * 60) / concMcgPerMl;
}

/** Dose in mcg/kg/min delivered by a rate in mL/h. */
export function infusionDose(rateMlH: number | null, weightKg: number | null, amountMg: number | null, volumeMl: number | null): number | null {
  if (!pos(rateMlH) || !pos(weightKg) || !pos(amountMg) || !pos(volumeMl)) return null;
  const concMcgPerMl = (amountMg * 1000) / volumeMl;
  return (rateMlH * concMcgPerMl) / (weightKg * 60);
}

export function potassiumDeficit(measured: number | null, target: number | null, weightKg: number | null, factor: number | null): number | null {
  if (!pos(measured) || !pos(target) || !pos(weightKg) || !pos(factor)) return null;
  return Math.max(0, (target - measured) * weightKg * factor);
}

export function bicarbonateDose(baseDeficit: number | null, weightKg: number | null, factor: number | null): number | null {
  if (!pos(baseDeficit) || !pos(weightKg) || !pos(factor)) return null;
  return baseDeficit * weightKg * factor;
}

/** Holliday-Segar 4-2-1 maintenance, mL/h. */
export function maintenanceFluid(weightKg: number | null): number | null {
  if (!pos(weightKg)) return null;
  if (weightKg <= 10) return weightKg * 4;
  if (weightKg <= 20) return 40 + (weightKg - 10) * 2;
  return 60 + (weightKg - 20);
}

export function ageInYears(age: number | null, unit: "years" | "months"): number | null {
  if (!ok(age) || age < 0) return null;
  return unit === "months" ? age / 12 : age;
}

/** Paediatric airway estimates from age (1 year and over) and weight. */
export function airway(ageYears: number | null, weightKg: number | null) {
  const byAge = ok(ageYears) && ageYears >= 1 && ageYears <= 14;
  const infant = ok(ageYears) && ageYears < 1;
  // Under 1 year the age formula does not apply: 3.5 mm to 6 months, 4.0 mm after (uncuffed), depth 3 × ID.
  const infantTube = infant ? (ageYears < 0.5 ? 3.5 : 4.0) : null;
  const uncuffed = byAge ? ageYears / 4 + 4 : infantTube;
  const cuffed = byAge ? ageYears / 4 + 3.5 : infantTube !== null ? infantTube - 0.5 : null;
  const depthOral = byAge ? ageYears / 2 + 12 : infantTube !== null ? infantTube * 3 : null;
  let lma: string | null = null;
  if (pos(weightKg)) {
    if (weightKg < 5) lma = "1";
    else if (weightKg < 10) lma = "1.5";
    else if (weightKg < 20) lma = "2";
    else if (weightKg < 30) lma = "2.5";
    else if (weightKg < 50) lma = "3";
    else if (weightKg < 70) lma = "4";
    else lma = "5";
  }
  return { uncuffed, cuffed, depthOral, lma, infant };
}

/* ---------------------------- equipment picks ---------------------------- */

export function pickTubingPack(flowLmin: number | null) {
  if (!pos(flowLmin)) return null;
  return TUBING_PACKS.find((p) => flowLmin <= p.maxFlow) ?? null;
}

export function pickArterialCannula(flowLmin: number | null) {
  if (!pos(flowLmin)) return null;
  return ARTERIAL_CANNULAE.find((c) => flowLmin <= c.maxFlow) ?? null;
}

export function pickVenousCannula(flowLmin: number | null) {
  if (!pos(flowLmin)) return null;
  return VENOUS_CANNULAE.find((c) => flowLmin <= c.maxFlow) ?? null;
}

export function pickTwoStage(flowLmin: number | null) {
  if (!pos(flowLmin)) return null;
  return TWO_STAGE_CANNULAE.find((c) => flowLmin <= c.maxFlow) ?? null;
}

/** Smallest oxygenator class whose rated flow leaves a reserve above full flow. */
export function pickOxygenator(flowLmin: number | null) {
  if (!pos(flowLmin)) return null;
  return OXYGENATOR_CLASSES.find((c) => flowLmin * OXYGENATOR_RESERVE <= c.maxFlow) ?? null;
}

export function suggestPreset(flowLmin: number | null, group: Group): CircuitPreset {
  if (pos(flowLmin)) return CIRCUIT_PRESETS.find((p) => flowLmin <= p.maxFlow)!;
  return CIRCUIT_PRESETS.find((p) => p.id === (group === "adult" ? "adult" : "paediatric"))!;
}

/* ---------------------------- dose rows ---------------------------- */

/** Trim a number to a sensible number of figures for a dose. */
export function fmt(n: number | null | undefined, digits?: number): string {
  if (!ok(n)) return "—";
  const abs = Math.abs(n);
  const d = digits ?? (abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : abs >= 0.1 ? 2 : 3);
  // An explicit number of decimals is shown in full (4.00 L/min); otherwise trailing zeros are dropped.
  return n.toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: digits ?? 0 });
}

export function doseForWeight(row: DoseRow, weightKg: number | null, group: Group): { text: string; capped: boolean } {
  if (group === "adult" && row.adultFixed) return { text: row.adultFixed, capped: false };
  if (!pos(weightKg)) return { text: "—", capped: false };
  const cap = (v: number) => (row.max !== undefined ? Math.min(v, row.max) : v);
  const lo = row.low * weightKg;
  const hi = row.high !== undefined ? row.high * weightKg : null;
  const capped = row.max !== undefined && (hi ?? lo) > row.max;
  const loC = cap(lo);
  const hiC = hi !== null ? cap(hi) : null;
  const text = hiC !== null && hiC !== loC ? `${fmt(loC)} to ${fmt(hiC)} ${row.unit}` : `${fmt(loC)} ${row.unit}`;
  return { text, capped };
}

/* ---------------------------- the case ---------------------------- */

export interface CaseState {
  /** True until the user types their own patient values. */
  example: boolean;
  group: Group;
  weight: number | null;
  height: number | null;
  age: number | null;
  ageUnit: "years" | "months";
  sex: Sex;
  /** Haematocrit before bypass, %. */
  hct: number | null;

  bsaFormula: BsaFormula;
  /** Overrides; null means "use the default for this patient". */
  ebvPerKg: number | null;
  ci: number | null;
  flowBasis: FlowBasis;
  flowPerKg: number | null;

  /** While true the circuit follows the patient's size. */
  primeAuto: boolean;
  primePresetId: CircuitPresetId;
  primeParts: PrimeParts;
  primeTubing: TubingRow[];
  /** A known total prime volume, if the user prefers to type it. */
  primeOverride: number | null;
  mannitolGPerKg: number | null;
  primeHeparinPerL: number | null;
  primeBicarbMlPerL: number | null;

  targetHct: number | null;
  donorHct: number | null;
  rbcMode: RbcMode;

  heparinPerKg: number | null;
  heparinVial: number;
  extraHeparin: number | null;
  includePrimeHeparin: boolean;
  protamineRatio: number | null;
  txaLoad: number | null;
  txaInfusion: number | null;
  txaPrime: number | null;

  cpgType: string;
  cpgDose: number | null;
}

const adultPreset = CIRCUIT_PRESETS.find((p) => p.id === "adult")!;

export const DEFAULT_CASE: CaseState = {
  example: true,
  group: "adult",
  weight: 70,
  height: 170,
  age: 45,
  ageUnit: "years",
  sex: "M",
  hct: 40,
  bsaFormula: "mosteller",
  ebvPerKg: null,
  ci: null,
  flowBasis: "auto",
  flowPerKg: null,
  primeAuto: true,
  primePresetId: "adult",
  primeParts: { ...adultPreset.parts },
  primeTubing: adultPreset.tubing.map((t) => ({ ...t })),
  primeOverride: null,
  mannitolGPerKg: 0.25,
  primeHeparinPerL: HEPARIN.primeIUPerLitre,
  primeBicarbMlPerL: 25,
  targetHct: null,
  donorHct: 60,
  rbcMode: "add",
  heparinPerKg: HEPARIN.loadingIUPerKg,
  heparinVial: HEPARIN.vialIUPerMl[0],
  extraHeparin: null,
  includePrimeHeparin: false,
  protamineRatio: PROTAMINE.mgPer100IU,
  txaLoad: 10,
  txaInfusion: 1,
  txaPrime: 1,
  cpgType: "delnido",
  cpgDose: null,
};

/** A clearly marked example child, used by the "Paediatric example" button. */
export const PAED_EXAMPLE: Partial<CaseState> = {
  example: true,
  group: "paed",
  weight: 8,
  height: 70,
  age: 10,
  ageUnit: "months",
  sex: "F",
  hct: 36,
};

export interface Derived {
  bsa: number | null;
  ageYears: number | null;
  ebvPerKg: number | null;
  ebvIsDefault: boolean;
  ebv: number | null;
  ci: number;
  flowCi: number | null;
  flowPerKg: number | null;
  flowPerKgIsDefault: boolean;
  flowKg: number | null;
  basis: "ci" | "kg";
  /** Full flow used for circuit and cannula choices, L/min. */
  flow: number | null;

  preset: CircuitPreset;
  suggestedPreset: CircuitPreset;
  primeParts: PrimeParts;
  primeTubing: TubingRow[];
  primeComputed: number;
  prime: number;

  hctCpb: number | null;
  targetHct: number;
  rbcMl: number | null;
  maxPrime: number | null;

  mannitolG: number | null;
  primeHeparinIU: number | null;
  primeBicarbMl: number | null;

  heparinIU: number | null;
  heparinMl: number | null;
  totalHeparinIU: number | null;
  protamineMg: number | null;
  protamineMl: number | null;
  txaLoadMg: number | null;
  txaInfusionMgH: number | null;
  txaPrimeMg: number | null;

  cpg: {
    type: CardioplegiaType;
    doseMlPerKg: number;
    volume: number | null;
    capped: boolean;
    blood: number | null;
    crystalloid: number | null;
    redose: number | null;
  };

  equip: {
    oxygenator: ReturnType<typeof pickOxygenator>;
    pack: ReturnType<typeof pickTubingPack>;
    arterial: ReturnType<typeof pickArterialCannula>;
    twoStage: ReturnType<typeof pickTwoStage>;
    bicaval: ReturnType<typeof pickVenousCannula>;
    overRange: boolean;
  };
}

export function primeTotal(parts: PrimeParts, tubing: TubingRow[]): number {
  const partSum = (Object.values(parts) as (number | null)[]).reduce<number>((s, v) => s + (ok(v) ? v : 0), 0);
  const tubeSum = tubing.reduce((s, t) => s + tubingVolume(t.size, t.lengthCm), 0);
  return Math.max(0, partSum + tubeSum);
}

export function deriveCase(s: CaseState): Derived {
  const w = pos(s.weight) ? s.weight : null;
  const bsaValue = bsa(w, s.height, s.bsaFormula);
  const ageYears = ageInYears(s.age, s.ageUnit);

  const ebvDefault = ebvPerKgDefault(w, s.sex);
  const ebvPerKg = pos(s.ebvPerKg) ? s.ebvPerKg : ebvDefault;
  const ebv = w && ebvPerKg ? w * ebvPerKg : null;

  const ci = pos(s.ci) ? s.ci : DEFAULT_CI[s.group];
  const flowCi = bsaValue ? bsaValue * ci : null;
  const perKgDefault = flowPerKgDefault(w);
  const flowPerKg = pos(s.flowPerKg) ? s.flowPerKg : perKgDefault;
  const flowKg = w && flowPerKg ? (w * flowPerKg) / 1000 : null;

  let basis: "ci" | "kg";
  if (s.flowBasis === "auto") basis = s.group === "paed" && w !== null && w <= 30 ? "kg" : "ci";
  else basis = s.flowBasis;
  if (basis === "ci" && flowCi === null) basis = "kg";
  const flow = basis === "ci" ? flowCi : flowKg;

  const suggestedPreset = suggestPreset(flow, s.group);
  const preset = s.primeAuto ? suggestedPreset : CIRCUIT_PRESETS.find((p) => p.id === s.primePresetId) ?? suggestedPreset;
  const primeParts = s.primeAuto ? suggestedPreset.parts : s.primeParts;
  const primeTubing = s.primeAuto ? suggestedPreset.tubing : s.primeTubing;
  const primeComputed = primeTotal(primeParts, primeTubing);
  const prime = ok(s.primeOverride) && s.primeOverride >= 0 ? s.primeOverride : primeComputed;

  const targetHct = pos(s.targetHct) ? s.targetHct : DEFAULT_TARGET_HCT[s.group];
  const hctCpb = hctOnBypass(ebv, s.hct, prime);
  const rbcMl = rbcVolume(ebv, s.hct, prime, targetHct, s.donorHct, s.rbcMode);
  const maxPrime = maxPrimeForHct(ebv, s.hct, targetHct);

  const mannitolG = w && pos(s.mannitolGPerKg) ? w * s.mannitolGPerKg : null;
  const primeHeparinIU = pos(s.primeHeparinPerL) ? (prime / 1000) * s.primeHeparinPerL : null;
  const primeBicarbMl = pos(s.primeBicarbMlPerL) ? (prime / 1000) * s.primeBicarbMlPerL : null;

  const heparinIU = w && pos(s.heparinPerKg) ? w * s.heparinPerKg : null;
  const heparinMl = heparinIU !== null && pos(s.heparinVial) ? heparinIU / s.heparinVial : null;
  const totalHeparinIU =
    heparinIU !== null
      ? heparinIU + (pos(s.extraHeparin) ? s.extraHeparin : 0) + (s.includePrimeHeparin && primeHeparinIU ? primeHeparinIU : 0)
      : null;
  const protamineMg = totalHeparinIU !== null && pos(s.protamineRatio) ? (totalHeparinIU / 100) * s.protamineRatio : null;
  const protamineMl = protamineMg !== null ? protamineMg / PROTAMINE.mgPerMl : null;

  const type = CARDIOPLEGIA_TYPES.find((t) => t.id === s.cpgType) ?? CARDIOPLEGIA_TYPES[0];
  const doseMlPerKg = pos(s.cpgDose) ? s.cpgDose : type.doseMlPerKg;
  const rawVolume = w ? w * doseMlPerKg : null;
  const capped = rawVolume !== null && type.maxMl !== null && rawVolume > type.maxMl;
  const volume = rawVolume !== null ? (capped ? type.maxMl! : rawVolume) : null;
  const redoseRaw = w && type.redoseMlPerKg ? w * type.redoseMlPerKg : null;
  const redose = redoseRaw !== null && type.maxMl !== null ? Math.min(redoseRaw, type.maxMl / 2) : redoseRaw;

  const oxygenator = pickOxygenator(flow);
  const arterial = pickArterialCannula(flow);
  const overRange = pos(flow) && (!oxygenator || !arterial);

  return {
    bsa: bsaValue,
    ageYears,
    ebvPerKg,
    ebvIsDefault: !pos(s.ebvPerKg),
    ebv,
    ci,
    flowCi,
    flowPerKg,
    flowPerKgIsDefault: !pos(s.flowPerKg),
    flowKg,
    basis,
    flow,
    preset,
    suggestedPreset,
    primeParts,
    primeTubing,
    primeComputed,
    prime,
    hctCpb,
    targetHct,
    rbcMl,
    maxPrime,
    mannitolG,
    primeHeparinIU,
    primeBicarbMl,
    heparinIU,
    heparinMl,
    totalHeparinIU,
    protamineMg,
    protamineMl,
    txaLoadMg: w && pos(s.txaLoad) ? w * s.txaLoad : null,
    txaInfusionMgH: w && pos(s.txaInfusion) ? w * s.txaInfusion : null,
    txaPrimeMg: w && pos(s.txaPrime) ? w * s.txaPrime : null,
    cpg: {
      type,
      doseMlPerKg,
      volume,
      capped,
      blood: volume !== null ? volume * type.bloodFraction : null,
      crystalloid: volume !== null ? volume * (1 - type.bloodFraction) : null,
      redose,
    },
    equip: {
      oxygenator,
      pack: pickTubingPack(flow),
      arterial,
      twoStage: pickTwoStage(flow),
      bicaval: pickVenousCannula(flow ? flow / 2 : null),
      overRange,
    },
  };
}

/** Plain-text case summary for copying into notes. */
export function caseSummary(s: CaseState, d: Derived, header: Record<string, string>): string {
  const L: string[] = [];
  L.push("PerfCalc TZ — perfusion calculation sheet");
  const head = Object.entries(header)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`);
  if (head.length) L.push(head.join(" | "));
  L.push("");
  L.push(`Patient: ${s.group === "adult" ? "Adult" : "Paediatric"}, ${s.sex === "M" ? "male" : "female"}, ${fmt(s.weight)} kg, ${fmt(s.height)} cm` + (ok(s.age) ? `, ${fmt(s.age)} ${s.ageUnit}` : ""));
  L.push(`BSA ${fmt(d.bsa, 2)} m² | EBV ${fmt(d.ebv, 0)} mL (${fmt(d.ebvPerKg)} mL/kg) | Hct ${fmt(s.hct)}%`);
  L.push(`Full flow ${fmt(d.flow, 2)} L/min (${d.basis === "ci" ? `CI ${fmt(d.ci)} L/min/m²` : `${fmt(d.flowPerKg)} mL/kg/min`})`);
  L.push(`Prime ${fmt(d.prime, 0)} mL | Hct on bypass ${fmt(d.hctCpb, 1)}% | target ${fmt(d.targetHct)}% | red cells ${fmt(d.rbcMl, 0)} mL`);
  L.push(`Heparin ${fmt(d.heparinIU, 0)} IU (${fmt(d.heparinMl, 1)} mL) | Protamine ${fmt(d.protamineMg, 0)} mg (${fmt(d.protamineMl, 1)} mL)`);
  L.push(`Tranexamic acid: load ${fmt(d.txaLoadMg, 0)} mg, infusion ${fmt(d.txaInfusionMgH, 0)} mg/h, prime ${fmt(d.txaPrimeMg, 0)} mg`);
  L.push(`Cardioplegia (${d.cpg.type.label}): ${fmt(d.cpg.volume, 0)} mL`);
  L.push(
    `Equipment: ${d.equip.oxygenator?.label ?? "—"}; lines ${d.equip.pack ? `${d.equip.pack.arterial}" × ${d.equip.pack.venous}"` : "—"}; arterial cannula ${d.equip.arterial ? `${d.equip.arterial.fr} Fr` : "—"}`,
  );
  L.push("");
  L.push("Calculated values for reference. Verify before use.");
  return L.join("\n");
}

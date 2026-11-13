/**
 * PerfCalc TZ — clinical constants.
 *
 * Every number the app uses lives in this one file so the perfusion and
 * anaesthesia leads can review and change it in one place.
 *
 * These are common textbook / guideline starting values, NOT a hospital
 * protocol. Check each one against the Benjamin Mkapa Hospital protocols and
 * the manufacturer's instructions for the equipment in stock before use.
 */

/* ------------------------------------------------------------------ */
/* Blood volume and flow                                               */
/* ------------------------------------------------------------------ */

/** Estimated blood volume by weight band (mL/kg). Common perfusion convention. */
export const EBV_BANDS: { maxKg: number; mlPerKg: number }[] = [
  { maxKg: 10, mlPerKg: 85 },
  { maxKg: 20, mlPerKg: 80 },
  { maxKg: 30, mlPerKg: 75 },
  { maxKg: 40, mlPerKg: 70 },
];
/** Above 40 kg. */
export const EBV_ADULT = { M: 70, F: 65 } as const;

/** Weight-based full flow at normothermia (mL/kg/min). */
export const FLOW_PER_KG_BANDS: { maxKg: number; mlKgMin: number }[] = [
  { maxKg: 3, mlKgMin: 200 },
  { maxKg: 10, mlKgMin: 150 },
  { maxKg: 15, mlKgMin: 125 },
  { maxKg: 30, mlKgMin: 100 },
  { maxKg: 55, mlKgMin: 75 },
  { maxKg: Infinity, mlKgMin: 65 },
];

export const CI_OPTIONS = [1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
export const DEFAULT_CI = { adult: 2.4, paed: 2.6 } as const;

/** Lowest acceptable haematocrit on bypass used as the default target (%). */
export const DEFAULT_TARGET_HCT = { adult: 24, paed: 28 } as const;

/** Indexed oxygen delivery thresholds (mL/min/m²), adult data. */
export const DO2I = { target: 280, critical: 262 } as const;

/* ------------------------------------------------------------------ */
/* Tubing, circuits, cannulae, oxygenators                             */
/* ------------------------------------------------------------------ */

export type TubingSize = "1/8" | "3/16" | "1/4" | "3/8" | "1/2";

/** Internal diameter in inches. Volume per metre is computed from geometry. */
export const TUBING_ID_INCH: Record<TubingSize, number> = {
  "1/8": 0.125,
  "3/16": 0.1875,
  "1/4": 0.25,
  "3/8": 0.375,
  "1/2": 0.5,
};
export const TUBING_SIZES = Object.keys(TUBING_ID_INCH) as TubingSize[];

/** Arterial × venous line pack by full flow (L/min). Typical teaching values. */
export const TUBING_PACKS: { maxFlow: number; arterial: TubingSize; venous: TubingSize; label: string }[] = [
  { maxFlow: 0.8, arterial: "3/16", venous: "1/4", label: "Neonatal" },
  { maxFlow: 1.5, arterial: "1/4", venous: "1/4", label: "Infant" },
  { maxFlow: 3.0, arterial: "1/4", venous: "3/8", label: "Paediatric" },
  { maxFlow: 3.5, arterial: "3/8", venous: "3/8", label: "Small adult" },
  { maxFlow: Infinity, arterial: "3/8", venous: "1/2", label: "Adult" },
];

export type CircuitPresetId = "neonatal" | "infant" | "paediatric" | "adult";

export interface PrimeParts {
  oxygenator: number | null;
  filter: number | null;
  cardioplegia: number | null;
  hemoconcentrator: number | null;
  reservoir: number | null;
  other: number | null;
}

export interface TubingRow {
  id: string;
  label: string;
  size: TubingSize;
  lengthCm: number | null;
}

export interface CircuitPreset {
  id: CircuitPresetId;
  label: string;
  /** Use this preset up to this full flow (L/min). */
  maxFlow: number;
  parts: PrimeParts;
  tubing: TubingRow[];
}

/**
 * Generic circuits. Component volumes are illustrative: replace them with the
 * static prime of the oxygenator, filter and tubing pack actually in use.
 */
export const CIRCUIT_PRESETS: CircuitPreset[] = [
  {
    id: "neonatal",
    label: "Neonatal",
    maxFlow: 0.8,
    parts: { oxygenator: 45, filter: 0, cardioplegia: 30, hemoconcentrator: 30, reservoir: 50, other: 0 },
    tubing: [
      { id: "a", label: "Arterial line", size: "3/16", lengthCm: 150 },
      { id: "v", label: "Venous line", size: "1/4", lengthCm: 150 },
      { id: "p", label: "Pump boot", size: "1/4", lengthCm: 60 },
    ],
  },
  {
    id: "infant",
    label: "Infant",
    maxFlow: 1.5,
    parts: { oxygenator: 90, filter: 0, cardioplegia: 40, hemoconcentrator: 35, reservoir: 75, other: 0 },
    tubing: [
      { id: "a", label: "Arterial line", size: "1/4", lengthCm: 150 },
      { id: "v", label: "Venous line", size: "1/4", lengthCm: 150 },
      { id: "p", label: "Pump boot", size: "1/4", lengthCm: 70 },
    ],
  },
  {
    id: "paediatric",
    label: "Paediatric",
    maxFlow: 3.2,
    parts: { oxygenator: 135, filter: 0, cardioplegia: 50, hemoconcentrator: 60, reservoir: 150, other: 0 },
    tubing: [
      { id: "a", label: "Arterial line", size: "1/4", lengthCm: 180 },
      { id: "v", label: "Venous line", size: "3/8", lengthCm: 180 },
      { id: "p", label: "Pump boot", size: "3/8", lengthCm: 80 },
    ],
  },
  {
    id: "adult",
    label: "Adult",
    maxFlow: Infinity,
    parts: { oxygenator: 260, filter: 0, cardioplegia: 150, hemoconcentrator: 0, reservoir: 300, other: 0 },
    tubing: [
      { id: "a", label: "Arterial line", size: "3/8", lengthCm: 200 },
      { id: "v", label: "Venous line", size: "1/2", lengthCm: 200 },
      { id: "p", label: "Pump boot", size: "1/2", lengthCm: 90 },
    ],
  },
];

export const PRIME_PART_LABELS: Record<keyof PrimeParts, string> = {
  oxygenator: "Oxygenator static prime",
  filter: "Separate arterial filter",
  cardioplegia: "Cardioplegia set",
  hemoconcentrator: "Haemoconcentrator",
  reservoir: "Reservoir operating level",
  other: "Other (lines, connectors)",
};

/** Approximate maximum flow per arterial cannula (L/min, ~100 mmHg pressure drop). */
export const ARTERIAL_CANNULAE: { fr: number; maxFlow: number }[] = [
  { fr: 6, maxFlow: 0.4 },
  { fr: 8, maxFlow: 0.9 },
  { fr: 10, maxFlow: 1.5 },
  { fr: 12, maxFlow: 2.3 },
  { fr: 14, maxFlow: 3.0 },
  { fr: 16, maxFlow: 4.0 },
  { fr: 18, maxFlow: 5.0 },
  { fr: 20, maxFlow: 6.0 },
  { fr: 22, maxFlow: 7.0 },
  { fr: 24, maxFlow: 8.0 },
];

/** Approximate gravity drainage per single-stage venous cannula (L/min). */
export const VENOUS_CANNULAE: { fr: number; maxFlow: number }[] = [
  { fr: 10, maxFlow: 0.25 },
  { fr: 12, maxFlow: 0.45 },
  { fr: 14, maxFlow: 0.6 },
  { fr: 16, maxFlow: 0.9 },
  { fr: 18, maxFlow: 1.2 },
  { fr: 20, maxFlow: 1.5 },
  { fr: 22, maxFlow: 1.9 },
  { fr: 24, maxFlow: 2.3 },
  { fr: 26, maxFlow: 2.7 },
  { fr: 28, maxFlow: 3.1 },
  { fr: 30, maxFlow: 3.6 },
  { fr: 32, maxFlow: 4.1 },
  { fr: 34, maxFlow: 4.6 },
  { fr: 36, maxFlow: 5.1 },
];

/** Two-stage (cavo-atrial) venous cannula by full flow, adults. */
export const TWO_STAGE_CANNULAE: { maxFlow: number; size: string }[] = [
  { maxFlow: 4.0, size: "29/37 Fr" },
  { maxFlow: 5.5, size: "32/40 Fr" },
  { maxFlow: Infinity, size: "36/46 Fr or 36/51 Fr" },
];

/** Choose an oxygenator rated at least this much above full flow. */
export const OXYGENATOR_RESERVE = 1.2;

export const OXYGENATOR_CLASSES: { maxFlow: number; label: string; examples: string }[] = [
  { maxFlow: 0.7, label: "Neonatal, low flow (to 0.7 L/min)", examples: "LivaNova Kids D100" },
  { maxFlow: 1.5, label: "Neonatal (to 1.5 L/min)", examples: "Terumo Capiox FX05, Getinge Quadrox-i Neonatal" },
  { maxFlow: 2.5, label: "Infant (to 2.5 L/min)", examples: "LivaNova Kids D101" },
  { maxFlow: 5.0, label: "Paediatric / small adult (to 5 L/min)", examples: "Terumo Capiox FX15, Getinge Quadrox-i Small Adult" },
  { maxFlow: 7.0, label: "Adult (to 7 L/min)", examples: "Terumo Capiox FX25, Medtronic Affinity Fusion, LivaNova Inspire 6 (6 L/min)" },
  { maxFlow: 8.0, label: "Large adult (to 8 L/min)", examples: "LivaNova Inspire 8" },
];

/* ------------------------------------------------------------------ */
/* Drugs                                                               */
/* ------------------------------------------------------------------ */

export const HEPARIN = {
  loadingIUPerKg: 300,
  loadingRange: [300, 400] as const,
  vialIUPerMl: [5000, 1000] as const,
  targetACT: 480,
  primeIUPerLitre: 5000,
};

export const PROTAMINE = {
  mgPer100IU: 1.0,
  range: [0.8, 1.3] as const,
  /** Guideline ceiling: total protamine above this ratio impairs platelets and prolongs ACT. */
  ceiling: 2.6,
  mgPerMl: 10,
};

export const TXA_PRESETS = [
  { id: "low", label: "Low dose", load: 10, infusion: 1, prime: 1 },
  { id: "high", label: "High dose", load: 30, infusion: 16, prime: 2 },
] as const;

export interface CardioplegiaType {
  id: string;
  label: string;
  doseMlPerKg: number;
  maxMl: number | null;
  /** Fraction of the delivered volume that is blood. */
  bloodFraction: number;
  redoseMlPerKg: number | null;
  redose: string;
  note: string;
}

export const CARDIOPLEGIA_TYPES: CardioplegiaType[] = [
  {
    id: "delnido",
    label: "del Nido (1 blood : 4 crystalloid)",
    doseMlPerKg: 20,
    maxMl: 1000,
    bloodFraction: 0.2,
    redoseMlPerKg: 10,
    redose: "Single dose; re-dose about 10 mL/kg if cross-clamp passes 60 to 90 min or activity returns",
    note: "Delivered cold (4 to 8 °C), antegrade.",
  },
  {
    id: "blood41",
    label: "Cold blood (4 blood : 1 crystalloid)",
    doseMlPerKg: 20,
    maxMl: null,
    bloodFraction: 0.8,
    redoseMlPerKg: 10,
    redose: "Maintenance about 10 mL/kg every 20 min",
    note: "Buckberg-type or St Thomas' concentrate mixed with pump blood.",
  },
  {
    id: "stthomas",
    label: "St Thomas' crystalloid",
    doseMlPerKg: 20,
    maxMl: 1000,
    bloodFraction: 0,
    redoseMlPerKg: 10,
    redose: "Maintenance about 10 mL/kg every 20 to 30 min",
    note: "All crystalloid: add the full volume to the haemodilution estimate unless it is vented away.",
  },
  {
    id: "htk",
    label: "Custodiol HTK",
    doseMlPerKg: 30,
    maxMl: null,
    bloodFraction: 0,
    redoseMlPerKg: null,
    redose: "Single dose given over 6 to 8 min; protection for up to about 2 to 3 h",
    note: "Large crystalloid load and low sodium: watch haematocrit and sodium, aspirate from the right atrium where possible.",
  },
];

export interface DoseRow {
  drug: string;
  low: number;
  high?: number;
  /** Unit of the dose, per kg. */
  unit: "mg" | "mcg" | "g" | "IU" | "mEq" | "mL" | "J";
  /** Absolute ceiling in the same unit. */
  max?: number;
  /** Shown instead of the weight-based figure when the patient is an adult. */
  adultFixed?: string;
  note?: string;
}

export interface DoseGroup {
  title: string;
  rows: DoseRow[];
}

/** Drug Dosages tab: other drugs given around bypass. */
export const CPB_DRUGS: DoseRow[] = [
  { drug: "Heparin, additional dose", low: 50, high: 100, unit: "IU", note: "If ACT is below target; recheck ACT 3 to 5 min later." },
  { drug: "Mannitol", low: 0.25, high: 0.5, unit: "g", note: "20% solution = 0.2 g/mL (1.25 to 2.5 mL/kg)." },
  { drug: "Furosemide", low: 0.5, high: 1, unit: "mg", adultFixed: "20 to 40 mg" },
  { drug: "Methylprednisolone", low: 10, high: 30, unit: "mg", max: 1000, note: "Only where the protocol uses steroids; many centres cap at 500 mg." },
  { drug: "Cefazolin", low: 25, high: 30, unit: "mg", max: 2000, adultFixed: "2 g (3 g above 120 kg)", note: "Re-dose per antibiotic protocol." },
  { drug: "Lidocaine", low: 1, high: 1.5, unit: "mg", max: 100, note: "Before cross-clamp removal, if used." },
  { drug: "Magnesium sulfate", low: 25, high: 50, unit: "mg", max: 2000, adultFixed: "2 g", note: "After cross-clamp removal. Not needed routinely after del Nido." },
  { drug: "Calcium chloride 10%", low: 10, high: 20, unit: "mg", max: 1000, adultFixed: "0.5 to 1 g", note: "100 mg/mL. Before weaning, not during early reperfusion." },
  { drug: "Phenylephrine bolus", low: 1, high: 2, unit: "mcg", adultFixed: "50 to 100 mcg", note: "For low MAP on bypass." },
];

export const ANAESTHESIA_GROUPS: DoseGroup[] = [
  {
    title: "Induction and sedation",
    rows: [
      { drug: "Propofol", low: 1.5, high: 2.5, unit: "mg", note: "Poor LV function 0.5 to 1.5 mg/kg; children 2.5 to 3.5 mg/kg." },
      { drug: "Ketamine IV", low: 1, high: 2, unit: "mg", note: "IM 5 to 10 mg/kg." },
      { drug: "Etomidate", low: 0.2, high: 0.3, unit: "mg" },
      { drug: "Thiopental", low: 3, high: 5, unit: "mg" },
      { drug: "Midazolam", low: 0.05, high: 0.1, unit: "mg", note: "Co-induction. Sedation 0.02 to 0.05 mg/kg." },
    ],
  },
  {
    title: "Opioids",
    rows: [
      { drug: "Fentanyl, routine", low: 1, high: 3, unit: "mcg" },
      { drug: "Fentanyl, cardiac", low: 5, high: 15, unit: "mcg", note: "Total dose, titrated." },
      { drug: "Morphine", low: 0.05, high: 0.2, unit: "mg" },
    ],
  },
  {
    title: "Muscle relaxants",
    rows: [
      { drug: "Suxamethonium", low: 1, high: 1.5, unit: "mg", note: "Infants 2 mg/kg." },
      { drug: "Rocuronium", low: 0.6, high: 1.2, unit: "mg", note: "0.6 routine; 1.0 to 1.2 for rapid sequence." },
      { drug: "Vecuronium", low: 0.08, high: 0.1, unit: "mg" },
      { drug: "Atracurium", low: 0.4, high: 0.5, unit: "mg" },
      { drug: "Cisatracurium", low: 0.1, high: 0.2, unit: "mg" },
      { drug: "Pancuronium", low: 0.08, high: 0.1, unit: "mg" },
    ],
  },
  {
    title: "Reversal",
    rows: [
      { drug: "Neostigmine", low: 0.04, high: 0.07, unit: "mg", max: 5 },
      { drug: "Glycopyrrolate", low: 0.01, unit: "mg", note: "0.2 mg for each 1 mg of neostigmine." },
      { drug: "Atropine, with neostigmine", low: 0.02, unit: "mg", max: 1.2 },
      { drug: "Sugammadex", low: 2, high: 4, unit: "mg", note: "2 mg/kg at TOF count 2 or more; 4 mg/kg for deep block; 16 mg/kg for immediate reversal." },
      { drug: "Naloxone", low: 1, high: 2, unit: "mcg", note: "Titrate in steps. Full reversal 0.1 mg/kg (max 2 mg)." },
      { drug: "Flumazenil", low: 0.01, unit: "mg", max: 0.2, note: "Per dose; repeat to a total of 1 mg." },
    ],
  },
  {
    title: "Emergency and resuscitation",
    rows: [
      { drug: "Adrenaline, cardiac arrest", low: 10, unit: "mcg", max: 1000, adultFixed: "1 mg", note: "0.1 mL/kg of 1:10,000. Repeat every 3 to 5 min." },
      { drug: "Atropine", low: 0.02, unit: "mg", max: 1, adultFixed: "1 mg, repeat to 3 mg", note: "Child maximum 0.5 mg per dose." },
      { drug: "Amiodarone", low: 5, unit: "mg", max: 300, adultFixed: "300 mg (VF / pulseless VT)" },
      { drug: "Lidocaine", low: 1, high: 1.5, unit: "mg" },
      { drug: "Adenosine", low: 0.1, high: 0.2, unit: "mg", max: 12, adultFixed: "6 mg, then 12 mg", note: "First dose 0.1 mg/kg (max 6 mg), second 0.2 mg/kg (max 12 mg). Rapid flush." },
      { drug: "Calcium chloride 10%", low: 10, high: 20, unit: "mg", max: 1000, note: "0.1 to 0.2 mL/kg, central line preferred." },
      { drug: "Sodium bicarbonate 8.4%", low: 1, unit: "mEq", note: "1 mL/kg. Dilute to 4.2% for neonates." },
      { drug: "Magnesium sulfate", low: 25, high: 50, unit: "mg", max: 2000 },
      { drug: "Glucose 10%", low: 2, high: 5, unit: "mL", note: "For hypoglycaemia; recheck glucose." },
      { drug: "Ephedrine", low: 0.1, high: 0.2, unit: "mg", adultFixed: "5 to 10 mg" },
      { drug: "Phenylephrine", low: 1, high: 2, unit: "mcg", adultFixed: "50 to 100 mcg" },
      { drug: "Defibrillation, external", low: 2, high: 4, unit: "J", max: 200, adultFixed: "150 to 200 J biphasic", note: "Follow the device and local algorithm." },
      { drug: "Defibrillation, internal paddles", low: 0.5, high: 1, unit: "J", adultFixed: "10 to 20 J", note: "Follow the device and local algorithm." },
      { drug: "Synchronised cardioversion", low: 0.5, high: 1, unit: "J", adultFixed: "50 to 200 J by rhythm", note: "Second shock 2 J/kg." },
    ],
  },
  {
    title: "Local anaesthetic maximum doses",
    rows: [
      { drug: "Lidocaine, plain", low: 3, unit: "mg", max: 200 },
      { drug: "Lidocaine with adrenaline", low: 7, unit: "mg", max: 500 },
      { drug: "Bupivacaine", low: 2, unit: "mg", max: 150 },
      { drug: "Ropivacaine", low: 3, unit: "mg", max: 225 },
      { drug: "Lipid emulsion 20%, bolus", low: 1.5, unit: "mL", note: "For local anaesthetic toxicity. Then 15 mL/kg/h; cumulative maximum 12 mL/kg." },
    ],
  },
];

export interface InfusionPreset {
  id: string;
  drug: string;
  amountMg: number;
  volumeMl: number;
  low: number;
  high: number;
  note?: string;
}

/** Infusions dosed in mcg/kg/min. Dilutions are common adult syringe mixes: edit to match yours. */
export const INFUSION_PRESETS: InfusionPreset[] = [
  { id: "adrenaline", drug: "Adrenaline", amountMg: 4, volumeMl: 50, low: 0.02, high: 0.3 },
  { id: "noradrenaline", drug: "Noradrenaline", amountMg: 4, volumeMl: 50, low: 0.02, high: 0.5 },
  { id: "dopamine", drug: "Dopamine", amountMg: 200, volumeMl: 50, low: 2, high: 20 },
  { id: "dobutamine", drug: "Dobutamine", amountMg: 250, volumeMl: 50, low: 2, high: 20 },
  { id: "milrinone", drug: "Milrinone", amountMg: 10, volumeMl: 50, low: 0.25, high: 0.75, note: "Loading dose 50 mcg/kg over 10 min if used." },
  { id: "gtn", drug: "Glyceryl trinitrate", amountMg: 50, volumeMl: 50, low: 0.25, high: 5 },
  { id: "snp", drug: "Sodium nitroprusside", amountMg: 50, volumeMl: 50, low: 0.3, high: 5, note: "Protect from light." },
  { id: "phenylephrine", drug: "Phenylephrine", amountMg: 10, volumeMl: 50, low: 0.1, high: 1 },
];

/* ------------------------------------------------------------------ */
/* Electrolytes                                                        */
/* ------------------------------------------------------------------ */

export const ELECTROLYTE = {
  /** Distribution factor used for potassium and bicarbonate deficits. */
  factor: 0.3,
  kTarget: 4.5,
  kclMmolPerMl: 2, // 15% KCl = 2 mmol/mL
  bicarbMEqPerMl: 1, // 8.4% NaHCO3 = 1 mEq/mL
  mgso4MgPerMl: 500, // 50% MgSO4
  caclMgPerMl: 100, // 10% CaCl2
  caGlucMgPerMl: 100, // 10% calcium gluconate
};

/* ------------------------------------------------------------------ */
/* Reference tables                                                    */
/* ------------------------------------------------------------------ */

export interface RefRow {
  parameter: string;
  adult: string;
  paed: string;
}

export const CPB_TARGETS: RefRow[] = [
  { parameter: "ACT before and during bypass", adult: "Above 480 s", paed: "Above 480 s" },
  { parameter: "Heparin loading dose", adult: "300 to 400 IU/kg", paed: "300 to 400 IU/kg" },
  { parameter: "Pump flow, normothermia", adult: "2.2 to 2.4 L/min/m²", paed: "2.6 to 3.0 L/min/m², or 100 to 200 mL/kg/min by weight" },
  { parameter: "Mean arterial pressure", adult: "50 to 80 mmHg", paed: "Neonate 30 to 45, infant and child 40 to 60 mmHg" },
  { parameter: "Venous saturation (SvO₂)", adult: "65% or higher", paed: "70% or higher" },
  { parameter: "Oxygen delivery (DO₂i)", adult: "Above 272 to 280 mL/min/m²", paed: "Higher; thresholds less established" },
  { parameter: "Haematocrit on bypass", adult: "21 to 24% or higher", paed: "25 to 30%; neonates and cyanotic 30% or higher" },
  { parameter: "Arterial line pressure", adult: "Below 300 mmHg", paed: "Below 300 mmHg; watch small cannulae" },
  { parameter: "Arterial outlet temperature", adult: "Below 37 °C", paed: "Below 37 °C" },
  { parameter: "Glucose", adult: "Below 10 mmol/L (180 mg/dL)", paed: "Avoid hypoglycaemia in neonates" },
  { parameter: "Lactate", adult: "Below 2 mmol/L; act if rising", paed: "Below 2 mmol/L; act if rising" },
  { parameter: "Urine output", adult: "0.5 to 1 mL/kg/h", paed: "1 mL/kg/h or more" },
  { parameter: "Potassium before weaning", adult: "4.0 to 5.0 mmol/L", paed: "4.0 to 5.0 mmol/L" },
  { parameter: "Ionised calcium before weaning", adult: "1.0 to 1.3 mmol/L", paed: "1.1 to 1.3 mmol/L" },
  { parameter: "PaO₂ / PaCO₂", adult: "150 to 250 / 35 to 45 mmHg", paed: "150 to 250 / 35 to 45 mmHg" },
  { parameter: "Vacuum-assisted venous drainage", adult: "−20 to −40 mmHg", paed: "−20 to −40 mmHg" },
];

export const TEMPERATURE_RULES: { rule: string; value: string }[] = [
  { rule: "Arterial outlet blood temperature", value: "Keep below 37 °C" },
  { rule: "Cooling: arterial outlet to venous inflow gradient", value: "No more than 10 °C" },
  { rule: "Rewarming, arterial outlet below 30 °C", value: "Gradient no more than 10 °C" },
  { rule: "Rewarming, arterial outlet 30 °C or above", value: "Gradient no more than 4 °C, rate no more than 0.5 °C/min" },
];

export const HYPOTHERMIA_LEVELS: { level: string; range: string }[] = [
  { level: "Mild", range: "32 to 35 °C" },
  { level: "Moderate", range: "28 to 32 °C" },
  { level: "Deep", range: "20 to 28 °C" },
  { level: "Profound", range: "Below 20 °C" },
];

export const FORMULAS: { name: string; formula: string }[] = [
  { name: "BSA, Mosteller", formula: "√(height cm × weight kg ÷ 3600)" },
  { name: "BSA, DuBois", formula: "0.007184 × weight^0.425 × height^0.725" },
  { name: "BSA, Haycock", formula: "0.024265 × weight^0.5378 × height^0.3964" },
  { name: "Pump flow", formula: "BSA × cardiac index, or weight × mL/kg/min" },
  { name: "Estimated blood volume", formula: "weight × mL/kg" },
  { name: "Haematocrit on bypass", formula: "(EBV × Hct) ÷ (EBV + prime volume)" },
  { name: "Red cells to add", formula: "(target × (EBV + prime) − EBV × Hct) ÷ (donor Hct − target)" },
  { name: "Arterial O₂ content", formula: "1.34 × Hb × SaO₂ + 0.003 × PaO₂" },
  { name: "Oxygen delivery", formula: "flow (L/min) × CaO₂ × 10; index by BSA" },
  { name: "Systemic vascular resistance", formula: "(MAP − CVP) × 80 ÷ flow" },
  { name: "Heparin loading dose", formula: "weight × 300 to 400 IU" },
  { name: "Protamine", formula: "1 mg per 100 IU of heparin given" },
  { name: "Potassium deficit", formula: "(target − measured) × weight × 0.3" },
  { name: "Bicarbonate", formula: "base deficit × weight × 0.3; give half, recheck" },
  { name: "Infusion rate", formula: "dose (mcg/kg/min) × weight × 60 ÷ concentration (mcg/mL)" },
];

export const SOURCES: string[] = [
  "STS / SCA / AmSECT clinical practice guidelines: anticoagulation during cardiopulmonary bypass (2018). ACT above 480 s, weight-based heparin, protamine-to-heparin ratio kept below 2.6 mg per 100 IU.",
  "STS / SCA / AmSECT clinical practice guidelines: temperature management during cardiopulmonary bypass (2015). Outlet below 37 °C, 10 °C and 4 °C gradients, rewarming rate 0.5 °C/min.",
  "Ranucci et al. 2005 and de Somer et al. 2011: nadir DO₂i of about 262 to 272 mL/min/m² and acute kidney injury; goal-directed perfusion target of 280 mL/min/m².",
  "del Nido cardioplegia: 20 mL/kg, maximum 1 L, one part blood to four parts crystalloid (published institutional protocols).",
  "Weight-based flows, blood volume per kg and tubing pack ranges: standard perfusion teaching tables. Paediatric flow strategy varies between centres.",
  "Cannula flow capacities, oxygenator examples and circuit prime volumes are generic approximations. Use the manufacturer's pressure-flow charts and instructions for use.",
  "Anaesthesia and resuscitation doses: standard anaesthesia references and current resuscitation algorithms. Confirm against the hospital formulary.",
];

/* ------------------------------------------------------------------ */
/* Techniques and checklists                                           */
/* ------------------------------------------------------------------ */

export interface Technique {
  id: string;
  title: string;
  summary: string;
  points: string[];
}

export const TECHNIQUES: Technique[] = [
  {
    id: "rap",
    title: "Retrograde autologous priming (RAP)",
    summary: "Displace crystalloid prime with the patient's own blood just before bypass to limit haemodilution.",
    points: [
      "Drain arterial line prime back into a transfer bag, then venous line prime, in small steps.",
      "Keep systolic pressure up with small vasopressor doses; stop if the patient becomes unstable.",
      "Enter the volume removed as a negative under Other in the Prime Volume tab to see the effect on haematocrit.",
    ],
  },
  {
    id: "vavd",
    title: "Vacuum-assisted venous drainage",
    summary: "Regulated suction on a hard-shell reservoir to improve drainage through smaller cannulae.",
    points: [
      "Use −20 to −40 mmHg; avoid going beyond −60 mmHg.",
      "Needs a positive and negative pressure relief valve on the reservoir.",
      "Never run vacuum with the arterial pump stopped and the arterial line open: risk of drawing air across the membrane.",
    ],
  },
  {
    id: "cuf",
    title: "Conventional and zero-balance ultrafiltration",
    summary: "Haemoconcentration during bypass (CUF), or washout with equal volume replacement (Z-BUF).",
    points: [
      "CUF: remove excess volume once reservoir level allows, usually during rewarming.",
      "Z-BUF: replace filtrate millilitre for millilitre with balanced crystalloid to clear potassium, lactate and mediators.",
      "Use the estimator in the Hemodilution tab for the volume needed to reach a target haematocrit.",
    ],
  },
  {
    id: "muf",
    title: "Modified ultrafiltration (MUF)",
    summary: "Arteriovenous ultrafiltration for 10 to 20 min after weaning, before protamine, mainly in infants and children.",
    points: [
      "Blood is drawn from the aortic cannula, passed through the haemoconcentrator and returned warm to the right atrium.",
      "Keep the circuit heparinised and the patient filled from the reservoir as volume is removed.",
      "End points: target haematocrit reached, circuit volume recovered, or the planned time elapsed.",
      "Watch for air entrainment at the aortic cannula and for falling arterial pressure.",
    ],
  },
  {
    id: "dhca",
    title: "Deep hypothermic circulatory arrest",
    summary: "Cool to 18 to 20 °C, stop the pump and drain, for arch and complex congenital repairs.",
    points: [
      "Cool for at least 20 min with even gradients; pack the head in ice.",
      "Many paediatric centres use pH-stat during cooling, then alpha-stat.",
      "Keep arrest time as short as possible; risk rises after about 30 to 40 min at 18 °C.",
      "Rewarm slowly after a period of cold reperfusion; respect the temperature gradient limits.",
    ],
  },
  {
    id: "acp",
    title: "Selective antegrade cerebral perfusion",
    summary: "Perfuse the brain through the innominate or axillary artery while the body is arrested.",
    points: [
      "Adults: about 10 mL/kg/min (8 to 12) at 22 to 28 °C, right radial pressure 40 to 60 mmHg.",
      "Neonates and infants: 30 to 50 mL/kg/min regional perfusion, guided by NIRS and pressure.",
      "Monitor bilateral NIRS; a left-sided fall suggests an incomplete circle of Willis.",
    ],
  },
  {
    id: "rcp",
    title: "Retrograde cerebral perfusion",
    summary: "Cold blood into the SVC during arrest, mainly to flush air and debris.",
    points: [
      "Flow 300 to 500 mL/min in adults.",
      "Keep SVC pressure below 25 mmHg.",
    ],
  },
  {
    id: "abg",
    title: "Blood gas strategy",
    summary: "Alpha-stat reads gases at 37 °C; pH-stat corrects to patient temperature and adds CO₂.",
    points: [
      "Alpha-stat: usual for adults and for mild to moderate hypothermia; preserves autoregulation.",
      "pH-stat: more cerebral blood flow and more even cooling; often used in children during deep cooling.",
    ],
  },
];

export const PRE_BYPASS_CHECKLIST: string[] = [
  "Patient identity, procedure and blood products confirmed",
  "Heparin given and ACT above target",
  "Circuit primed, de-aired, lines clamped where intended",
  "Gas supply connected, blender and flow meter working, gas line to oxygenator open",
  "Oxygenator and reservoir leak-free; reservoir vented",
  "Heater-cooler connected, water flowing, set temperature checked",
  "Pump heads: direction, occlusion and tubing seating checked",
  "Pressure transducers zeroed; alarm limits set",
  "Level sensor and bubble detector armed",
  "Arterial line pressure and pulsation tested after cannulation",
  "Cardioplegia ready, at temperature, line de-aired",
  "Suckers and vent tested for direction",
  "Hand cranks and back-up oxygen cylinder present",
  "Drugs and extra heparin drawn up",
];

export const WEANING_CHECKLIST: string[] = [
  "Temperature: core 36 to 37 °C, rewarming complete",
  "Rhythm and rate acceptable; pacing available",
  "Ventilation restarted, lungs re-expanded",
  "Potassium, ionised calcium, haematocrit and acid-base corrected",
  "De-airing complete where the heart was opened",
  "Inotropes and vasopressors running as planned",
  "Vent out, venous line partly clamped, heart filling",
  "Volume left in reservoir noted; cell salvage or MUF plan agreed",
  "Protamine only after the surgeon confirms; suckers off before it starts",
];

export const EMERGENCIES: { title: string; steps: string[] }[] = [
  {
    title: "Massive arterial air embolism",
    steps: [
      "Stop the pump; clamp arterial and venous lines.",
      "Steep head-down position; surgeon removes the aortic cannula and vents air.",
      "De-air the arterial line and refill the circuit.",
      "Retrograde SVC perfusion with cold blood for 1 to 2 min if the protocol calls for it.",
      "Resume bypass, cool, raise pressure, 100% oxygen; consider steroids and post-operative hyperbaric oxygen.",
    ],
  },
  {
    title: "Oxygenator failure",
    steps: [
      "Check gas supply, blender, gas line and for water or clot before deciding.",
      "Tell the surgeon; cool the patient if time allows.",
      "Come off bypass, clamp, change the oxygenator with a second perfusionist, de-air and restart.",
    ],
  },
  {
    title: "Pump or power failure",
    steps: [
      "Clamp the venous line if the arterial pump stops, to avoid exsanguination.",
      "Hand-crank in the correct direction at the previous rate.",
      "Switch to battery or back-up console; check gas flow continues.",
    ],
  },
  {
    title: "Low reservoir level",
    steps: [
      "Reduce flow; tell the surgeon.",
      "Check venous line for kinks, air lock, cannula position and table height.",
      "Add volume; do not let the level sensor be overridden without a plan.",
    ],
  },
];

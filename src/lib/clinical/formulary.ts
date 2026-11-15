/**
 * Hospital formulary for infusions. Empty by default: the app ships with no
 * drug concentrations or dose limits. A hospital enters its approved entries,
 * then exports them as a file that other devices import.
 */
import { AMOUNT_UNITS, DOSE_UNITS, isFiniteNumber, type AmountUnit } from "./units";

export type Population = "adult" | "paediatric" | "neonatal" | "any";
export type RouteRule = "central-only" | "peripheral-allowed" | "unspecified";

export interface FormularyConcentration {
  amount: number;
  unit: AmountUnit;
  volumeMl: number;
  label?: string;
}

export interface FormularyEntry {
  id: string;
  drug: string;
  population: Population;
  doseUnit: string;
  concentrations: FormularyConcentration[];
  softMin?: number | null;
  softMax?: number | null;
  hardMin?: number | null;
  hardMax?: number | null;
  route: RouteRule;
  routeNote?: string;
  /** Protocol or reference the entry comes from. Required. */
  source: string;
  approvedBy?: string;
  approvedOn?: string;
}

export interface FormularyFile {
  format: "nurseanaesthesia-pro/formulary";
  version: 1;
  hospital?: string;
  exportedOn: string;
  entries: FormularyEntry[];
}

const KEY = "nap-formulary-v1";

export function loadFormulary(): FormularyEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => validateEntry(e).length === 0) : [];
  } catch {
    return [];
  }
}

export function saveFormulary(entries: FormularyEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable */
  }
}

/** Problems with an entry, in plain words. Empty when the entry is usable. */
export function validateEntry(e: Partial<FormularyEntry>): string[] {
  const p: string[] = [];
  if (!e || typeof e !== "object") return ["Not a formulary entry."];
  if (!e.drug || !String(e.drug).trim()) p.push("Drug name is missing.");
  if (!e.doseUnit || !DOSE_UNITS.includes(e.doseUnit)) p.push("Dose unit is missing or not recognised.");
  if (!e.source || !String(e.source).trim()) p.push("Source or protocol is required for every entry.");
  if (!Array.isArray(e.concentrations)) p.push("Concentrations must be a list.");
  else
    e.concentrations.forEach((c, i) => {
      if (!(c && isFiniteNumber(c.amount) && c.amount > 0 && isFiniteNumber(c.volumeMl) && c.volumeMl > 0 && AMOUNT_UNITS.includes(c.unit))) {
        p.push(`Concentration ${i + 1} needs an amount, a unit and a volume.`);
      }
    });
  const lims = [e.softMin, e.softMax, e.hardMin, e.hardMax];
  if (lims.some((v) => v !== undefined && v !== null && !(isFiniteNumber(v) && v >= 0))) p.push("Limits must be numbers of zero or more.");
  if (isFiniteNumber(e.softMin) && isFiniteNumber(e.softMax) && e.softMin > e.softMax) p.push("Usual minimum is above usual maximum.");
  if (isFiniteNumber(e.hardMin) && isFiniteNumber(e.hardMax) && e.hardMin > e.hardMax) p.push("Hard minimum is above hard maximum.");
  if (isFiniteNumber(e.softMax) && isFiniteNumber(e.hardMax) && e.softMax > e.hardMax) p.push("Usual maximum is above the hard maximum.");
  return p;
}

export function exportFormulary(entries: FormularyEntry[], hospital?: string): FormularyFile {
  return { format: "nurseanaesthesia-pro/formulary", version: 1, hospital, exportedOn: new Date().toISOString(), entries };
}

export function parseFormularyFile(text: string): { entries: FormularyEntry[]; problems: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { entries: [], problems: ["The file is not valid JSON."] };
  }
  const f = data as Partial<FormularyFile>;
  if (f.format !== "nurseanaesthesia-pro/formulary" || !Array.isArray(f.entries)) {
    return { entries: [], problems: ["This is not a NurseAnaesthesia Pro formulary file."] };
  }
  const problems: string[] = [];
  const entries: FormularyEntry[] = [];
  f.entries.forEach((e, i) => {
    const p = validateEntry(e);
    if (p.length) problems.push(`Entry ${i + 1} (${(e as FormularyEntry)?.drug ?? "no name"}): ${p.join(" ")}`);
    else entries.push(e as FormularyEntry);
  });
  return { entries, problems };
}

/** Drug names from the brief, offered as suggestions only. No numbers attached. */
export const DRUG_NAME_SUGGESTIONS = [
  "Propofol",
  "Remifentanil",
  "Fentanyl",
  "Sufentanil",
  "Ketamine",
  "Dexmedetomidine",
  "Midazolam",
  "Morphine",
  "Noradrenaline (norepinephrine)",
  "Adrenaline (epinephrine)",
  "Dopamine",
  "Dobutamine",
  "Vasopressin",
  "Phenylephrine",
  "Milrinone",
  "Insulin",
  "Heparin",
  "Magnesium sulphate",
  "Potassium chloride",
  "Amiodarone",
  "Sodium bicarbonate",
];

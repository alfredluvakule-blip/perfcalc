/**
 * Timed observation charts (intraoperative vital signs, ICU observations,
 * ventilator settings). A chart only records what staff enter; it does not
 * set target ranges or alarm limits, which come from the prescription and
 * local policy.
 */
import type { Bi } from "./checklists";

export interface ChartColumn {
  id: string;
  label: Bi;
  unit?: string;
  kind: "number" | "text";
  /** Narrow columns for numbers, wider for notes. */
  wide?: boolean;
}

export interface ChartDef {
  id: string;
  title: Bi;
  version: string;
  source: string;
  columns: ChartColumn[];
}

export type ChartRow = { id: string; time: string } & Record<string, string | number | null>;

const b = (en: string, sw: string): Bi => ({ en, sw });
const n = (id: string, en: string, sw: string, unit?: string): ChartColumn => ({ id, label: b(en, sw), unit, kind: "number" });
const t = (id: string, en: string, sw: string): ChartColumn => ({ id, label: b(en, sw), kind: "text", wide: true });

export const INTRAOP_VITALS: ChartDef = {
  id: "intraop-vitals",
  title: b("Intraoperative vital signs", "Dalili muhimu wakati wa upasuaji"),
  version: "0.1",
  source: "Recording interval and monitoring follow the AAGBI/AoA Recommendations for standards of monitoring during anaesthesia and recovery (2021) and local policy.",
  columns: [
    n("hr", "Heart rate", "Mapigo ya moyo", "/min"),
    n("sbp", "Systolic", "Sistoli", "mmHg"),
    n("dbp", "Diastolic", "Diastoli", "mmHg"),
    n("map", "MAP", "MAP", "mmHg"),
    n("spo2", "SpO₂", "SpO₂", "%"),
    n("etco2", "EtCO₂", "EtCO₂", "kPa or mmHg"),
    n("rr", "Resp. rate", "Kasi ya kupumua", "/min"),
    n("temp", "Temp", "Joto", "°C"),
    t("note", "Drugs, events, notes", "Dawa, matukio, maelezo"),
  ],
};

export const ICU_OBS: ChartDef = {
  id: "icu-obs",
  title: b("ICU observation chart", "Chati ya uangalizi ICU"),
  version: "0.1",
  source: "Columns from the requested ICU workflow. Observation frequency and escalation thresholds follow the prescription and local ICU policy.",
  columns: [
    n("hr", "Heart rate", "Mapigo ya moyo", "/min"),
    n("sbp", "Systolic", "Sistoli", "mmHg"),
    n("dbp", "Diastolic", "Diastoli", "mmHg"),
    n("map", "MAP", "MAP", "mmHg"),
    n("cvp", "CVP", "CVP", "mmHg"),
    n("rr", "Resp. rate", "Kasi ya kupumua", "/min"),
    n("spo2", "SpO₂", "SpO₂", "%"),
    n("temp", "Temp", "Joto", "°C"),
    n("gcs", "GCS", "GCS"),
    n("rass", "RASS", "RASS"),
    n("pain", "Pain", "Maumivu", "0–10"),
    n("glucose", "Glucose", "Sukari", "mmol/L"),
    n("urine", "Urine", "Mkojo", "mL"),
    t("note", "Notes", "Maelezo"),
  ],
};

export const VENTILATOR: ChartDef = {
  id: "ventilator",
  title: b("Ventilator chart", "Chati ya mashine ya kupumulia"),
  version: "0.1",
  source: "Settings and measured values as displayed on the ventilator. Targets (tidal volume per kg, plateau pressure, PEEP and FiO₂) are set by the prescriber and local protocol.",
  columns: [
    t("mode", "Mode", "Hali"),
    n("fio2", "FiO₂", "FiO₂", "%"),
    n("peep", "PEEP", "PEEP", "cmH₂O"),
    n("vt", "Tidal volume", "Ujazo wa pumzi", "mL"),
    n("rrSet", "Set rate", "Kasi iliyowekwa", "/min"),
    n("rrTotal", "Total rate", "Kasi yote", "/min"),
    n("ps", "Pressure support", "Msaada wa shinikizo", "cmH₂O"),
    n("ppeak", "Peak pressure", "Shinikizo la juu", "cmH₂O"),
    n("pplat", "Plateau pressure", "Shinikizo la plateau", "cmH₂O"),
    n("mv", "Minute volume", "Ujazo kwa dakika", "L/min"),
    n("spo2", "SpO₂", "SpO₂", "%"),
    n("etco2", "EtCO₂", "EtCO₂", "kPa or mmHg"),
    t("note", "Suction, cuff pressure, notes", "Kufyonza, shinikizo la kofi, maelezo"),
  ],
};

export const CHARTS: ChartDef[] = [INTRAOP_VITALS, ICU_OBS, VENTILATOR];

/** Current local time as HH:MM. */
export function nowHHMM(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Rows in time order. Times are HH:MM within one shift or case. */
export function sortRows(rows: ChartRow[]): ChartRow[] {
  return [...rows].sort((a, c) => a.time.localeCompare(c.time));
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a header row, for spreadsheets. Patient identifiers are never included. */
export function chartToCsv(def: ChartDef, rows: ChartRow[]): string {
  const head = ["Time", ...def.columns.map((c) => (c.unit ? `${c.label.en} (${c.unit})` : c.label.en))];
  const body = sortRows(rows).map((r) => [r.time, ...def.columns.map((c) => r[c.id])]);
  return [head, ...body].map((line) => line.map(csvCell).join(",")).join("\n") + "\n";
}

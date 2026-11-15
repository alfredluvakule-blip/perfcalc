/**
 * Checklist library: versioned, bilingual checklists with a source.
 * Built-in checklists reproduce published tools. Hospitals add their own
 * from their approved protocols with the editor; nothing clinical is invented.
 */
import { isFiniteNumber } from "./units";

export interface Bi {
  en: string;
  /** Kiswahili. Draft translation until reviewed. */
  sw: string;
}

export interface ChecklistItem {
  id: string;
  text: Bi;
  /** "tick" (default) or "text" for free-text prompts such as SBAR. */
  kind?: "tick" | "text";
}

export interface ChecklistSection {
  id: string;
  title: Bi;
  /** When in the workflow, e.g. "Before induction of anaesthesia". */
  when?: Bi;
  items: ChecklistItem[];
}

export interface ChecklistDef {
  id: string;
  title: Bi;
  category: "icu" | "anaesthesia" | "theatre" | "nursing" | "emergency";
  version: string;
  source: string;
  origin: "built-in" | "hospital";
  status: "draft" | "approved";
  approvedBy?: string;
  approvedOn?: string;
  sections: ChecklistSection[];
}

const s = (en: string, sw: string): Bi => ({ en, sw });

export const WHO_SSC: ChecklistDef = {
  id: "who-ssc",
  title: s("WHO Surgical Safety Checklist", "Orodha Hakiki ya WHO ya Usalama wa Upasuaji"),
  category: "theatre",
  version: "WHO 2009, first edition",
  source:
    "World Health Organization. WHO Surgical Safety Checklist (first edition, 2009) and Implementation Manual. Geneva: WHO; 2009. WHO encourages local modification; this is the unmodified text. Kiswahili wording is a draft translation awaiting review.",
  origin: "built-in",
  status: "draft",
  sections: [
    {
      id: "sign-in",
      title: s("Sign in", "Kuingia"),
      when: s("Before induction of anaesthesia", "Kabla ya kuanza nusukaputi"),
      items: [
        { id: "si1", text: s("Patient has confirmed identity, site, procedure and consent", "Mgonjwa amethibitisha utambulisho, eneo, upasuaji na ridhaa") },
        { id: "si2", text: s("Site marked, or not applicable", "Eneo limewekwa alama, au haihusiki") },
        { id: "si3", text: s("Anaesthesia safety check completed", "Ukaguzi wa usalama wa nusukaputi umekamilika") },
        { id: "si4", text: s("Pulse oximeter on patient and functioning", "Kipima oksijeni kimewekwa na kinafanya kazi") },
        { id: "si5", text: s("Known allergy checked and recorded", "Mzio unaojulikana umeangaliwa na kuandikwa") },
        { id: "si6", text: s("Difficult airway or aspiration risk assessed; if yes, equipment and assistance available", "Hatari ya njia ngumu ya hewa au kuvuta matapishi imetathminiwa; kama ipo, vifaa na msaada vipo") },
        {
          id: "si7",
          text: s(
            "Risk of more than 500 mL blood loss (7 mL/kg in children) assessed; if yes, two IVs or central access and fluids planned",
            "Hatari ya kupoteza damu zaidi ya mL 500 (mL 7/kg kwa watoto) imetathminiwa; kama ipo, njia mbili za IV au ya kati na maji yamepangwa",
          ),
        },
      ],
    },
    {
      id: "time-out",
      title: s("Time out", "Kusimama kwa ukaguzi"),
      when: s("Before skin incision", "Kabla ya kukata ngozi"),
      items: [
        { id: "to1", text: s("All team members have introduced themselves by name and role", "Wanatimu wote wamejitambulisha kwa jina na kazi") },
        { id: "to2", text: s("Surgeon, anaesthesia professional and nurse verbally confirm patient, site and procedure", "Daktari wa upasuaji, wa nusukaputi na muuguzi wamethibitisha kwa mdomo mgonjwa, eneo na upasuaji") },
        { id: "to3", text: s("Surgeon reviews critical or unexpected steps, operative duration and anticipated blood loss", "Daktari wa upasuaji ameeleza hatua muhimu, muda wa upasuaji na damu inayotarajiwa kupotea") },
        { id: "to4", text: s("Anaesthesia team reviews any patient-specific concerns", "Timu ya nusukaputi imeeleza wasiwasi wowote kuhusu mgonjwa") },
        { id: "to5", text: s("Nursing team confirms sterility (including indicator results) and any equipment issues", "Timu ya uuguzi imethibitisha usafi wa vifaa (pamoja na viashiria) na matatizo ya vifaa") },
        { id: "to6", text: s("Antibiotic prophylaxis given within the last 60 minutes, or not applicable", "Dawa ya kuzuia maambukizi imetolewa ndani ya dakika 60, au haihusiki") },
        { id: "to7", text: s("Essential imaging displayed, or not applicable", "Picha muhimu za uchunguzi zinaonyeshwa, au haihusiki") },
      ],
    },
    {
      id: "sign-out",
      title: s("Sign out", "Kutoka"),
      when: s("Before the patient leaves the operating room", "Kabla mgonjwa hajatoka chumba cha upasuaji"),
      items: [
        { id: "so1", text: s("Nurse confirms the name of the procedure recorded", "Muuguzi amethibitisha jina la upasuaji lililoandikwa") },
        { id: "so2", text: s("Instrument, sponge and needle counts are correct, or not applicable", "Hesabu ya vifaa, sponji na sindano ni sahihi, au haihusiki") },
        { id: "so3", text: s("Specimen labelled, including patient name", "Sampuli imewekwa lebo pamoja na jina la mgonjwa") },
        { id: "so4", text: s("Any equipment problems to be addressed are noted", "Matatizo ya vifaa yanayohitaji kushughulikiwa yameandikwa") },
        { id: "so5", text: s("Surgeon, anaesthesia professional and nurse review key concerns for recovery and management", "Daktari wa upasuaji, wa nusukaputi na muuguzi wamepitia mambo muhimu ya uponaji na matunzo") },
      ],
    },
  ],
};

export const SBAR: ChecklistDef = {
  id: "sbar",
  title: s("Patient handover using SBAR", "Makabidhiano ya mgonjwa kwa SBAR"),
  category: "nursing",
  version: "1.0",
  source:
    "SBAR (Situation, Background, Assessment, Recommendation) structured communication, as adopted in the WHO Patient Safety Solutions: Communication during patient hand-overs (2007). Prompts are the standard SBAR headings.",
  origin: "built-in",
  status: "draft",
  sections: [
    { id: "s", title: s("Situation", "Hali"), items: [{ id: "s1", kind: "text", text: s("Who the patient is, and what is happening now", "Mgonjwa ni nani, na nini kinatokea sasa") }] },
    { id: "b", title: s("Background", "Historia"), items: [{ id: "b1", kind: "text", text: s("Diagnosis, relevant history, treatment so far", "Utambuzi, historia muhimu, matibabu hadi sasa") }] },
    { id: "a", title: s("Assessment", "Tathmini"), items: [{ id: "a1", kind: "text", text: s("Latest observations and your assessment of the problem", "Vipimo vya karibuni na tathmini yako ya tatizo") }] },
    { id: "r", title: s("Recommendation", "Pendekezo"), items: [{ id: "r1", kind: "text", text: s("What you need, by when, and what to watch for", "Unachohitaji, lini, na cha kuangalia") }] },
  ],
};

export const BUILT_IN: ChecklistDef[] = [WHO_SSC, SBAR];

/** Checklists from the brief that need the hospital's approved content before they can be published. */
export const REQUESTED: { category: ChecklistDef["category"]; title: string }[] = [
  ...[
    "ICU admission",
    "ICU daily assessment",
    "ICU discharge",
    "Endotracheal tube care",
    "Ventilator-associated pneumonia prevention",
    "Central line-associated bloodstream infection prevention",
    "Catheter-associated urinary tract infection prevention",
    "Pressure injury prevention",
    "Patient repositioning",
    "Sepsis screening",
    "Sedation monitoring",
    "Delirium assessment",
    "Nutrition assessment",
    "Blood transfusion",
    "Patient safety",
    "ICU emergency trolley",
    "Emergency resuscitation",
    "Hand hygiene",
  ].map((title) => ({ category: "icu" as const, title })),
  ...[
    "Pre-anaesthetic assessment",
    "Anaesthesia machine checkout",
    "Difficult airway preparation",
    "General anaesthesia",
    "Spinal anaesthesia",
    "Epidural anaesthesia",
    "Regional anaesthesia",
    "TIVA",
    "Emergency airway",
    "Anaesthesia drug preparation",
    "Anaesthesia workstation safety",
    "Post-anaesthesia recovery",
    "Local anaesthetic systemic toxicity",
    "Malignant hyperthermia emergency",
    "Anaesthesia handover",
  ].map((title) => ({ category: "anaesthesia" as const, title })),
  ...[
    "Before induction",
    "Surgical time-out",
    "Sign-out",
    "Instrument count",
    "Swab and needle count",
    "Sterilization and instrument readiness",
    "Theatre preparation",
    "Specimen handling",
    "Surgical site infection prevention",
  ].map((title) => ({ category: "theatre" as const, title })),
  ...["Patient admission", "Patient identification", "Medication administration", "Pressure injury assessment", "Fall prevention", "Wound dressing", "Blood transfusion", "Patient discharge", "Nursing shift assessment"].map((title) => ({
    category: "nursing" as const,
    title,
  })),
];

/* ---------------------------- completion ---------------------------- */

export type Responses = Record<string, boolean | string | undefined>;

export interface Progress {
  total: number;
  done: number;
  outstanding: { section: string; item: string }[];
  complete: boolean;
}

export function progress(def: ChecklistDef, r: Responses): Progress {
  const outstanding: Progress["outstanding"] = [];
  let total = 0;
  for (const sec of def.sections) {
    for (const it of sec.items) {
      total++;
      const v = r[it.id];
      const done = it.kind === "text" ? typeof v === "string" && v.trim().length > 0 : v === true;
      if (!done) outstanding.push({ section: sec.title.en, item: it.text.en });
    }
  }
  return { total, done: total - outstanding.length, outstanding, complete: outstanding.length === 0 };
}

/* ---------------------------- hospital checklists ---------------------------- */

const KEY = "nap-checklists-v1";
const DONE_KEY = "nap-checklist-records-v1";

export function validateChecklist(c: Partial<ChecklistDef>): string[] {
  const p: string[] = [];
  if (!c || typeof c !== "object") return ["Not a checklist."];
  if (!c.id) p.push("Missing id.");
  if (!c.title?.en?.trim()) p.push("English title is required.");
  if (!c.source?.trim()) p.push("Source or protocol is required.");
  if (!c.version?.trim()) p.push("Version is required.");
  if (!Array.isArray(c.sections) || !c.sections.length) p.push("Add at least one section.");
  else {
    c.sections.forEach((sec, i) => {
      if (!sec.title?.en?.trim()) p.push(`Section ${i + 1} needs an English title.`);
      if (!Array.isArray(sec.items) || !sec.items.length) p.push(`Section ${i + 1} has no items.`);
      else if (sec.items.some((it) => !it.text?.en?.trim())) p.push(`Section ${i + 1} has an empty item.`);
    });
  }
  return p;
}

export function loadHospitalChecklists(): ChecklistDef[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((c) => validateChecklist(c).length === 0) : [];
  } catch {
    return [];
  }
}

export function saveHospitalChecklists(list: ChecklistDef[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** Turn "one item per line" text into items, keeping a Kiswahili line where given as "English | Kiswahili". */
export function itemsFromLines(text: string): ChecklistItem[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [en, sw] = line.split("|").map((x) => x.trim());
      return { id: `i${i + 1}`, text: { en, sw: sw ?? "" } };
    });
}

export function linesFromItems(items: ChecklistItem[]): string {
  return items.map((it) => (it.text.sw ? `${it.text.en} | ${it.text.sw}` : it.text.en)).join("\n");
}

export interface ChecklistFile {
  format: "nurseanaesthesia-pro/checklists";
  version: 1;
  exportedOn: string;
  checklists: ChecklistDef[];
}

export function parseChecklistFile(text: string): { checklists: ChecklistDef[]; problems: string[] } {
  let data: Partial<ChecklistFile>;
  try {
    data = JSON.parse(text);
  } catch {
    return { checklists: [], problems: ["The file is not valid JSON."] };
  }
  if (data.format !== "nurseanaesthesia-pro/checklists" || !Array.isArray(data.checklists)) return { checklists: [], problems: ["This is not a NurseAnaesthesia Pro checklist file."] };
  const problems: string[] = [];
  const checklists: ChecklistDef[] = [];
  data.checklists.forEach((c, i) => {
    const p = validateChecklist(c);
    if (p.length) problems.push(`Checklist ${i + 1}: ${p.join(" ")}`);
    else checklists.push({ ...c, origin: "hospital" });
  });
  return { checklists, problems };
}

/** A completed checklist kept on the device. Holds no patient identifiers. */
export interface CompletionRecord {
  id: string;
  checklistId: string;
  title: string;
  version: string;
  at: string;
  by?: string;
  done: number;
  total: number;
  outstanding: string[];
}

export function readRecords(): CompletionRecord[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function addRecord(r: CompletionRecord): void {
  try {
    window.localStorage.setItem(DONE_KEY, JSON.stringify([r, ...readRecords()].slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export function completionRate(records: CompletionRecord[]): number | null {
  if (!records.length) return null;
  const full = records.filter((r) => r.done === r.total && isFiniteNumber(r.total)).length;
  return (full / records.length) * 100;
}

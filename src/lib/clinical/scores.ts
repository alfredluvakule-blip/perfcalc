/**
 * Clinical scoring tools. Pure functions and data only.
 *
 * Each score reproduces the published instrument and cites it. Interpretation
 * bands are those in the cited source unless marked as local; the hospital may
 * set its own escalation thresholds.
 */
import type { ContentMeta } from "./content";

export interface ScoreOption {
  points: number;
  label: string;
  /** Kiswahili label. Draft translation, needs review. */
  sw?: string;
}

export interface ScoreItem {
  id: string;
  label: string;
  sw?: string;
  options: ScoreOption[];
  /** Allows "not testable" (for example GCS verbal when intubated). */
  allowNotTestable?: boolean;
}

export interface Band {
  min: number;
  max: number;
  label: string;
  tone: "ok" | "info" | "warn" | "alert";
  action?: string;
}

export interface ScoreDef {
  id: string;
  title: string;
  short: string;
  /** Who it is for and where. */
  population: string;
  items: ScoreItem[];
  bands: Band[];
  /** Lower total = worse (GCS, Braden), so ranges read the other way. */
  lowerIsWorse?: boolean;
  meta: ContentMeta;
}

export type Answers = Record<string, number | "NT" | undefined>;

export interface ScoreResult {
  complete: boolean;
  total: number | null;
  /** e.g. "E3 V4 M6" for GCS. */
  breakdown: string;
  band: Band | null;
  missing: string[];
  notTestable: string[];
}

export function scoreTotal(def: ScoreDef, answers: Answers): ScoreResult {
  const missing: string[] = [];
  const notTestable: string[] = [];
  let total = 0;
  const parts: string[] = [];
  for (const item of def.items) {
    const a = answers[item.id];
    if (a === "NT" && item.allowNotTestable) {
      notTestable.push(item.label);
      parts.push(`${item.id}NT`);
      continue;
    }
    if (typeof a !== "number" || !item.options.some((o) => o.points === a)) {
      missing.push(item.label);
      continue;
    }
    total += a;
    parts.push(`${item.id}${a}`);
  }
  const complete = missing.length === 0 && notTestable.length === 0;
  const band = complete ? def.bands.find((b) => total >= b.min && total <= b.max) ?? null : null;
  return { complete, total: missing.length === 0 && notTestable.length === 0 ? total : null, breakdown: parts.join(" "), band, missing, notTestable };
}

const reviewed = { updatedOn: "2026-11-15", status: "draft" as const, version: "0.1.0" };

/* ------------------------------------------------------------------ */

export const GCS: ScoreDef = {
  id: "gcs",
  title: "Glasgow Coma Scale",
  short: "GCS",
  population: "Adults and children old enough to talk. Use a paediatric GCS for pre-verbal children.",
  lowerIsWorse: true,
  items: [
    {
      id: "E",
      label: "Eye opening",
      sw: "Kufungua macho",
      allowNotTestable: true,
      options: [
        { points: 4, label: "Spontaneous", sw: "Yenyewe" },
        { points: 3, label: "To sound", sw: "Kwa sauti" },
        { points: 2, label: "To pressure", sw: "Kwa mgandamizo" },
        { points: 1, label: "None", sw: "Hakuna" },
      ],
    },
    {
      id: "V",
      label: "Verbal response",
      sw: "Mwitikio wa maneno",
      allowNotTestable: true,
      options: [
        { points: 5, label: "Orientated", sw: "Anajua alipo na wakati" },
        { points: 4, label: "Confused", sw: "Amechanganyikiwa" },
        { points: 3, label: "Words", sw: "Maneno" },
        { points: 2, label: "Sounds", sw: "Sauti tu" },
        { points: 1, label: "None", sw: "Hakuna" },
      ],
    },
    {
      id: "M",
      label: "Best motor response",
      sw: "Mwitikio bora wa mwili",
      allowNotTestable: true,
      options: [
        { points: 6, label: "Obeys commands", sw: "Anatii maagizo" },
        { points: 5, label: "Localising", sw: "Anaelekeza kwenye maumivu" },
        { points: 4, label: "Normal flexion", sw: "Kukunja kwa kawaida" },
        { points: 3, label: "Abnormal flexion", sw: "Kukunja kusiko kwa kawaida" },
        { points: 2, label: "Extension", sw: "Kunyoosha" },
        { points: 1, label: "None", sw: "Hakuna" },
      ],
    },
  ],
  bands: [
    { min: 13, max: 15, label: "Mild (13–15)", tone: "ok" },
    { min: 9, max: 12, label: "Moderate (9–12)", tone: "warn" },
    { min: 3, max: 8, label: "Severe (3–8)", tone: "alert", action: "A score of 8 or less usually means the airway may not be protected: call for senior review." },
  ],
  meta: {
    id: "gcs",
    title: "Glasgow Coma Scale",
    population: "Adults and verbal children; head injury severity bands apply to traumatic brain injury.",
    sources: [
      "Teasdale G, Jennett B. Assessment of coma and impaired consciousness. A practical scale. Lancet. 1974;2(7872):81–84.",
      "Teasdale G, et al. The Glasgow Coma Scale at 40 years: standing the test of time. Lancet Neurol. 2014;13(8):844–854. Descriptors as in the current structured approach (glasgowcomascale.org).",
    ],
    limitations: [
      "Report the three components, not only the total. Record NT (not testable) with the reason, for example intubated or eyes swollen shut.",
      "Severity bands (mild, moderate, severe) were defined for head injury.",
      "Sedation, paralysis, hypoxia, hypotension and intoxication lower the score.",
    ],
    ...reviewed,
  },
};

export const RASS: ScoreDef = {
  id: "rass",
  title: "Richmond Agitation-Sedation Scale",
  short: "RASS",
  population: "Adult ICU patients, ventilated or not.",
  items: [
    {
      id: "R",
      label: "Observed level",
      sw: "Kiwango kilichoonekana",
      options: [
        { points: 4, label: "+4 Combative: violent, danger to staff", sw: "+4 Mgomvi: vurugu, hatari kwa wahudumu" },
        { points: 3, label: "+3 Very agitated: pulls or removes tubes, aggressive", sw: "+3 Hana utulivu sana: anavuta mirija, mkali" },
        { points: 2, label: "+2 Agitated: frequent non-purposeful movement, fights ventilator", sw: "+2 Hana utulivu: anajongea bila lengo, anapigana na mashine" },
        { points: 1, label: "+1 Restless: anxious, movements not aggressive", sw: "+1 Hatulii: ana wasiwasi, si mkali" },
        { points: 0, label: "0 Alert and calm", sw: "0 Macho na mtulivu" },
        { points: -1, label: "−1 Drowsy: sustained awakening to voice, eye contact over 10 s", sw: "−1 Ana usingizi: anaamka kwa sauti zaidi ya sekunde 10" },
        { points: -2, label: "−2 Light sedation: briefly awakens to voice, eye contact under 10 s", sw: "−2 Usingizi mwepesi: anaamka kwa sauti chini ya sekunde 10" },
        { points: -3, label: "−3 Moderate sedation: movement or eye opening to voice, no eye contact", sw: "−3 Usingizi wa wastani: anajongea kwa sauti bila kutazama" },
        { points: -4, label: "−4 Deep sedation: no response to voice, moves to physical stimulation", sw: "−4 Usingizi mzito: anajongea kwa kuguswa tu" },
        { points: -5, label: "−5 Unarousable: no response to voice or physical stimulation", sw: "−5 Haamki: hakuna mwitikio" },
      ],
    },
  ],
  bands: [
    { min: 1, max: 4, label: "Agitated", tone: "warn", action: "Look for causes (pain, hypoxia, delirium, full bladder) and assess with CAM-ICU." },
    { min: 0, max: 0, label: "Alert and calm", tone: "ok" },
    { min: -2, max: -1, label: "Light sedation", tone: "info" },
    { min: -5, max: -3, label: "Moderate to deep sedation or unarousable", tone: "warn", action: "Compare with the prescribed sedation target. CAM-ICU cannot be assessed at −4 or −5." },
  ],
  meta: {
    id: "rass",
    title: "Richmond Agitation-Sedation Scale",
    population: "Adult intensive care patients.",
    sources: [
      "Sessler CN, et al. The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients. Am J Respir Crit Care Med. 2002;166(10):1338–1344.",
    ],
    limitations: ["The sedation target is set by the prescriber; this tool does not set one.", "Not validated for children; use a paediatric scale."],
    ...reviewed,
  },
};

export const BRADEN: ScoreDef = {
  id: "braden",
  title: "Braden Scale for Predicting Pressure Sore Risk",
  short: "Braden",
  population: "Adult inpatients. For children use the Braden Q scale.",
  lowerIsWorse: true,
  items: [
    {
      id: "S",
      label: "Sensory perception",
      sw: "Hisia",
      options: [
        { points: 1, label: "Completely limited", sw: "Imezuiliwa kabisa" },
        { points: 2, label: "Very limited", sw: "Imezuiliwa sana" },
        { points: 3, label: "Slightly limited", sw: "Imezuiliwa kidogo" },
        { points: 4, label: "No impairment", sw: "Hakuna tatizo" },
      ],
    },
    {
      id: "Mo",
      label: "Moisture",
      sw: "Unyevu",
      options: [
        { points: 1, label: "Constantly moist", sw: "Unyevu wakati wote" },
        { points: 2, label: "Very moist", sw: "Unyevu mwingi" },
        { points: 3, label: "Occasionally moist", sw: "Unyevu mara kwa mara" },
        { points: 4, label: "Rarely moist", sw: "Mara chache unyevu" },
      ],
    },
    {
      id: "A",
      label: "Activity",
      sw: "Shughuli",
      options: [
        { points: 1, label: "Bedfast", sw: "Kitandani tu" },
        { points: 2, label: "Chairfast", sw: "Kitini tu" },
        { points: 3, label: "Walks occasionally", sw: "Anatembea mara chache" },
        { points: 4, label: "Walks frequently", sw: "Anatembea mara nyingi" },
      ],
    },
    {
      id: "Mb",
      label: "Mobility",
      sw: "Uwezo wa kujigeuza",
      options: [
        { points: 1, label: "Completely immobile", sw: "Hawezi kujigeuza kabisa" },
        { points: 2, label: "Very limited", sw: "Imezuiliwa sana" },
        { points: 3, label: "Slightly limited", sw: "Imezuiliwa kidogo" },
        { points: 4, label: "No limitation", sw: "Hakuna kizuizi" },
      ],
    },
    {
      id: "N",
      label: "Nutrition",
      sw: "Lishe",
      options: [
        { points: 1, label: "Very poor", sw: "Duni sana" },
        { points: 2, label: "Probably inadequate", sw: "Huenda haitoshi" },
        { points: 3, label: "Adequate", sw: "Inatosha" },
        { points: 4, label: "Excellent", sw: "Bora" },
      ],
    },
    {
      id: "F",
      label: "Friction and shear",
      sw: "Msuguano na mvutano",
      options: [
        { points: 1, label: "Problem", sw: "Tatizo" },
        { points: 2, label: "Potential problem", sw: "Tatizo linalowezekana" },
        { points: 3, label: "No apparent problem", sw: "Hakuna tatizo dhahiri" },
      ],
    },
  ],
  bands: [
    { min: 19, max: 23, label: "Not at risk (19–23)", tone: "ok" },
    { min: 15, max: 18, label: "At risk (15–18)", tone: "info", action: "Start the prevention plan: repositioning schedule, skin checks, moisture and nutrition care." },
    { min: 13, max: 14, label: "Moderate risk (13–14)", tone: "warn", action: "Prevention plan plus pressure-redistributing support surface as per local policy." },
    { min: 10, max: 12, label: "High risk (10–12)", tone: "alert", action: "Increase repositioning frequency per local policy; review support surface and nutrition." },
    { min: 6, max: 9, label: "Very high risk (6–9)", tone: "alert", action: "Highest-level prevention per local policy; involve the tissue viability lead if available." },
  ],
  meta: {
    id: "braden",
    title: "Braden Scale",
    population: "Adult inpatients.",
    sources: [
      "Bergstrom N, Braden BJ, Laguzza A, Holman V. The Braden Scale for predicting pressure sore risk. Nurs Res. 1987;36(4):205–210.",
      "Risk categories (at risk 15–18, moderate 13–14, high 10–12, very high ≤9) as published by the scale's authors (bradenscale.com).",
    ],
    limitations: [
      "Full item descriptions should be read from the official scale; the labels here are the short headings.",
      "A risk score supports, and does not replace, a full skin inspection and clinical judgment.",
      "Actions shown are generic; follow the local pressure injury prevention policy.",
    ],
    ...reviewed,
  },
};

export const ALDRETE: ScoreDef = {
  id: "aldrete",
  title: "Modified Aldrete Score",
  short: "Aldrete",
  population: "Patients recovering from anaesthesia in the post-anaesthesia care unit (PACU).",
  lowerIsWorse: true,
  items: [
    {
      id: "Ac",
      label: "Activity",
      sw: "Shughuli",
      options: [
        { points: 2, label: "Moves 4 limbs voluntarily or on command", sw: "Anajongesha viungo 4" },
        { points: 1, label: "Moves 2 limbs", sw: "Anajongesha viungo 2" },
        { points: 0, label: "Moves no limbs", sw: "Hajongeshi kiungo" },
      ],
    },
    {
      id: "R",
      label: "Respiration",
      sw: "Kupumua",
      options: [
        { points: 2, label: "Breathes deeply and coughs freely", sw: "Anapumua kwa kina na kukohoa" },
        { points: 1, label: "Dyspnoea or limited breathing", sw: "Shida ya kupumua" },
        { points: 0, label: "Apnoeic", sw: "Hapumui" },
      ],
    },
    {
      id: "C",
      label: "Circulation (BP compared with pre-anaesthetic level)",
      sw: "Mzunguko wa damu (BP ikilinganishwa na kabla ya nusukaputi)",
      options: [
        { points: 2, label: "Within ±20 mmHg", sw: "Ndani ya ±20 mmHg" },
        { points: 1, label: "±20 to 49 mmHg", sw: "±20 hadi 49 mmHg" },
        { points: 0, label: "±50 mmHg or more", sw: "±50 mmHg au zaidi" },
      ],
    },
    {
      id: "Co",
      label: "Consciousness",
      sw: "Fahamu",
      options: [
        { points: 2, label: "Fully awake", sw: "Ameamka kikamilifu" },
        { points: 1, label: "Arousable on calling", sw: "Anaamka akiitwa" },
        { points: 0, label: "Not responding", sw: "Haitikii" },
      ],
    },
    {
      id: "O",
      label: "Oxygen saturation",
      sw: "Kiwango cha oksijeni",
      options: [
        { points: 2, label: "SpO₂ above 92% on room air", sw: "SpO₂ zaidi ya 92% bila oksijeni" },
        { points: 1, label: "Needs oxygen to keep SpO₂ above 90%", sw: "Anahitaji oksijeni kubaki zaidi ya 90%" },
        { points: 0, label: "SpO₂ below 90% even with oxygen", sw: "SpO₂ chini ya 90% hata na oksijeni" },
      ],
    },
  ],
  bands: [
    { min: 9, max: 10, label: "9–10: meets the usual score for PACU discharge", tone: "ok", action: "Check the other discharge criteria (pain, nausea, bleeding, local policy) before discharge." },
    { min: 0, max: 8, label: "Below 9: continue PACU care", tone: "warn" },
  ],
  meta: {
    id: "aldrete",
    title: "Modified Aldrete Score",
    population: "Post-anaesthesia recovery.",
    sources: ["Aldrete JA. The post-anesthesia recovery score revisited. J Clin Anesth. 1995;7(1):89–91."],
    limitations: ["Does not assess pain, nausea, bleeding or surgical site; add those from the local discharge checklist.", "Discharge threshold is set by local policy."],
    ...reviewed,
  },
};

export const MORSE: ScoreDef = {
  id: "morse",
  title: "Morse Fall Scale",
  short: "Morse",
  population: "Adult inpatients.",
  items: [
    { id: "H", label: "History of falling (immediate or within 3 months)", sw: "Historia ya kuanguka (miezi 3)", options: [{ points: 0, label: "No", sw: "Hapana" }, { points: 25, label: "Yes", sw: "Ndiyo" }] },
    { id: "D", label: "Secondary diagnosis", sw: "Utambuzi wa pili", options: [{ points: 0, label: "No", sw: "Hapana" }, { points: 15, label: "Yes", sw: "Ndiyo" }] },
    {
      id: "Am",
      label: "Ambulatory aid",
      sw: "Kifaa cha kutembelea",
      options: [
        { points: 0, label: "None, bed rest, wheelchair or nurse assist", sw: "Hakuna / kitandani / kiti cha magurudumu / msaada wa muuguzi" },
        { points: 15, label: "Crutches, cane or walker", sw: "Magongo, fimbo au kitembezi" },
        { points: 30, label: "Furniture", sw: "Anashika samani" },
      ],
    },
    { id: "IV", label: "IV therapy or heparin lock", sw: "Dripu au kanula", options: [{ points: 0, label: "No", sw: "Hapana" }, { points: 20, label: "Yes", sw: "Ndiyo" }] },
    {
      id: "G",
      label: "Gait",
      sw: "Mwendo",
      options: [
        { points: 0, label: "Normal, bed rest or immobile", sw: "Wa kawaida / kitandani" },
        { points: 10, label: "Weak", sw: "Dhaifu" },
        { points: 20, label: "Impaired", sw: "Umeharibika" },
      ],
    },
    {
      id: "Ms",
      label: "Mental status",
      sw: "Hali ya akili",
      options: [
        { points: 0, label: "Oriented to own ability", sw: "Anajua uwezo wake" },
        { points: 15, label: "Overestimates or forgets limitations", sw: "Anasahau mipaka yake" },
      ],
    },
  ],
  bands: [
    { min: 0, max: 24, label: "Low risk (0–24)", tone: "ok" },
    { min: 25, max: 44, label: "Moderate risk (25–44)", tone: "warn", action: "Standard fall prevention per local policy." },
    { min: 45, max: 125, label: "High risk (45 and above)", tone: "alert", action: "High-risk fall prevention per local policy." },
  ],
  meta: {
    id: "morse",
    title: "Morse Fall Scale",
    population: "Adult inpatients.",
    sources: [
      "Morse JM, Morse RM, Tylko SJ. Development of a scale to identify the fall-prone patient. Can J Aging. 1989;8(4):366–377.",
      "Risk cut-offs (25 and 45) are commonly used but should be set for each unit, as Morse advised.",
    ],
    limitations: ["Cut-off scores vary between settings; confirm the local thresholds.", "Not validated for children."],
    ...reviewed,
  },
};

export const OPTION_SCORES: ScoreDef[] = [GCS, RASS, BRADEN, ALDRETE, MORSE];

/* ---------------------------- NEWS2 ---------------------------- */

export interface News2Input {
  respRate: number | null;
  spo2: number | null;
  /** Scale 2 only for patients with confirmed hypercapnic respiratory failure, on a clinician's decision. */
  spo2Scale: 1 | 2;
  onOxygen: boolean | null;
  systolic: number | null;
  pulse: number | null;
  /** Alert, or new confusion / responds to voice / pain / unresponsive. */
  consciousness: "A" | "CVPU" | null;
  tempC: number | null;
}

export interface News2Result {
  complete: boolean;
  total: number | null;
  parts: { name: string; value: string; points: number | null }[];
  anyThree: boolean;
  risk: "low" | "low-medium" | "medium" | "high" | null;
  response: string | null;
  missing: string[];
}

const num = (n: number | null): n is number => typeof n === "number" && Number.isFinite(n);

export function news2RespRate(rr: number): number {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

export function news2Spo2Scale1(s: number): number {
  if (s <= 91) return 3;
  if (s <= 93) return 2;
  if (s <= 95) return 1;
  return 0;
}

export function news2Spo2Scale2(s: number, onOxygen: boolean): number {
  if (s <= 83) return 3;
  if (s <= 85) return 2;
  if (s <= 87) return 1;
  if (s <= 92) return 0;
  if (!onOxygen) return 0;
  if (s <= 94) return 1;
  if (s <= 96) return 2;
  return 3;
}

export function news2Systolic(sbp: number): number {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

export function news2Pulse(hr: number): number {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

export function news2Temp(t: number): number {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

export function news2(i: News2Input): News2Result {
  const parts: News2Result["parts"] = [];
  const missing: string[] = [];
  const add = (name: string, ok: boolean, value: string, points: () => number) => {
    if (!ok) {
      missing.push(name);
      parts.push({ name, value: "—", points: null });
    } else parts.push({ name, value, points: points() });
  };
  add("Respiration rate", num(i.respRate), `${i.respRate}/min`, () => news2RespRate(i.respRate as number));
  add(
    `SpO₂ (scale ${i.spo2Scale})`,
    num(i.spo2) && (i.spo2Scale === 1 || i.onOxygen !== null),
    `${i.spo2}%`,
    () => (i.spo2Scale === 1 ? news2Spo2Scale1(i.spo2 as number) : news2Spo2Scale2(i.spo2 as number, i.onOxygen as boolean)),
  );
  add("Air or oxygen", i.onOxygen !== null, i.onOxygen ? "Oxygen" : "Air", () => (i.onOxygen ? 2 : 0));
  add("Systolic BP", num(i.systolic), `${i.systolic} mmHg`, () => news2Systolic(i.systolic as number));
  add("Pulse", num(i.pulse), `${i.pulse}/min`, () => news2Pulse(i.pulse as number));
  add("Consciousness", i.consciousness !== null, i.consciousness === "A" ? "Alert" : "New confusion, V, P or U", () => (i.consciousness === "A" ? 0 : 3));
  add("Temperature", num(i.tempC), `${i.tempC} °C`, () => news2Temp(i.tempC as number));

  if (missing.length) return { complete: false, total: null, parts, anyThree: false, risk: null, response: null, missing };
  const total = parts.reduce((s, p) => s + (p.points ?? 0), 0);
  const anyThree = parts.some((p) => p.points === 3);
  let risk: News2Result["risk"];
  let response: string;
  if (total >= 7) {
    risk = "high";
    response = "Emergency response: continuous monitoring, urgent assessment by a clinician with critical care competencies; consider transfer to a higher level of care.";
  } else if (total >= 5) {
    risk = "medium";
    response = "Urgent response: urgent review by a clinician competent in acute illness; monitoring at least every hour.";
  } else if (anyThree) {
    risk = "low-medium";
    response = "A single parameter scored 3: urgent ward-based review by a registered clinician to decide on escalation; monitoring at least every hour.";
  } else if (total >= 1) {
    risk = "low";
    response = "Assessment by a registered nurse to decide on increased monitoring frequency or escalation; monitoring at least every 4 to 6 hours.";
  } else {
    risk = "low";
    response = "Continue routine monitoring, at least every 12 hours.";
  }
  return { complete: true, total, parts, anyThree, risk, response, missing };
}

export const NEWS2_META: ContentMeta = {
  id: "news2",
  title: "National Early Warning Score 2 (NEWS2)",
  population: "Adults (16 years and over) in hospital. Not for children or pregnant women; use the paediatric or obstetric early warning score.",
  sources: [
    "Royal College of Physicians. National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. Updated report of a working party. London: RCP, 2017.",
  ],
  limitations: [
    "SpO₂ scale 2 is only for patients with confirmed hypercapnic respiratory failure, on a clinician's decision and documented.",
    "Response frequencies follow the RCP chart; local escalation policy takes precedence.",
    "A low score does not exclude serious illness: clinical concern is always a reason to escalate.",
  ],
  ...reviewed,
};

/* ---------------------------- CAM-ICU ---------------------------- */

export interface CamIcuInput {
  rass: number | null;
  /** Feature 1: acute change from baseline or fluctuating course in the past 24 h. */
  acuteChange: boolean | null;
  /** Feature 2: number of errors in the letters attention test (10 letters). */
  attentionErrors: number | null;
  /** Feature 4: number of errors on the 4 questions plus the command. */
  thinkingErrors: number | null;
}

export interface CamIcuResult {
  assessable: boolean;
  result: "positive" | "negative" | "incomplete" | "unable";
  features: { f1: boolean | null; f2: boolean | null; f3: boolean | null; f4: boolean | null };
  explanation: string;
}

export function camIcu(i: CamIcuInput): CamIcuResult {
  const empty = { f1: null, f2: null, f3: null, f4: null };
  if (!num(i.rass)) return { assessable: false, result: "incomplete", features: empty, explanation: "Record the RASS first." };
  if (i.rass <= -4) return { assessable: false, result: "unable", features: empty, explanation: "RASS −4 or −5: unable to assess. Reassess when the patient is more awake." };
  const f1 = i.acuteChange;
  const f2 = num(i.attentionErrors) ? i.attentionErrors > 2 : null;
  const f3 = i.rass !== 0;
  const f4 = num(i.thinkingErrors) ? i.thinkingErrors > 1 : null;
  const features = { f1, f2, f3, f4 };
  if (f1 === false) return { assessable: true, result: "negative", features, explanation: "Feature 1 absent: CAM-ICU negative, no delirium." };
  if (f1 === null) return { assessable: true, result: "incomplete", features, explanation: "Answer feature 1 (acute change or fluctuating course)." };
  if (f2 === null) return { assessable: true, result: "incomplete", features, explanation: "Record the attention test errors (feature 2)." };
  if (!f2) return { assessable: true, result: "negative", features, explanation: "Feature 2 absent (2 or fewer errors): CAM-ICU negative." };
  if (f3) return { assessable: true, result: "positive", features, explanation: "Features 1 and 2 present and RASS is not 0 (feature 3): CAM-ICU positive, delirium present." };
  if (f4 === null) return { assessable: true, result: "incomplete", features, explanation: "RASS is 0: test disorganised thinking (feature 4)." };
  return f4
    ? { assessable: true, result: "positive", features, explanation: "Features 1, 2 and 4 present: CAM-ICU positive, delirium present." }
    : { assessable: true, result: "negative", features, explanation: "Feature 3 and 4 absent: CAM-ICU negative." };
}

export const CAMICU_META: ContentMeta = {
  id: "cam-icu",
  title: "Confusion Assessment Method for the ICU (CAM-ICU)",
  population: "Adult ICU patients with RASS −3 to +4, including ventilated patients.",
  sources: [
    "Ely EW, et al. Delirium in mechanically ventilated patients: validity and reliability of the confusion assessment method for the intensive care unit (CAM-ICU). JAMA. 2001;286(21):2703–2710.",
    "Scoring as in the CAM-ICU training manual (icudelirium.org): feature 1 + feature 2 + (feature 3 or feature 4).",
  ],
  limitations: [
    "Follow the official test wording for the letters test and the four questions.",
    "Cannot be assessed at RASS −4 or −5.",
    "A positive result needs medical review to look for causes.",
  ],
  ...reviewed,
};

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

export const FLACC: ScoreDef = {
  id: "flacc",
  title: "FLACC behavioural pain scale",
  short: "FLACC",
  population: "Children who cannot report their pain, validated for postoperative pain from 2 months to 7 years.",
  items: [
    {
      id: "F",
      label: "Face",
      sw: "Uso",
      options: [
        { points: 0, label: "No particular expression or smile", sw: "Hakuna dalili maalum au anatabasamu" },
        { points: 1, label: "Occasional grimace or frown, withdrawn, disinterested", sw: "Mara kwa mara anakunja uso, amejitenga" },
        { points: 2, label: "Frequent to constant quivering chin, clenched jaw", sw: "Kidevu kinatetemeka mara kwa mara, taya zimebanwa" },
      ],
    },
    {
      id: "L",
      label: "Legs",
      sw: "Miguu",
      options: [
        { points: 0, label: "Normal position or relaxed", sw: "Mkao wa kawaida au imelegea" },
        { points: 1, label: "Uneasy, restless, tense", sw: "Hana raha, hatulii, imekaza" },
        { points: 2, label: "Kicking, or legs drawn up", sw: "Anapiga mateke au amevuta miguu juu" },
      ],
    },
    {
      id: "A",
      label: "Activity",
      sw: "Shughuli",
      options: [
        { points: 0, label: "Lying quietly, normal position, moves easily", sw: "Amelala kimya, anajongea kwa urahisi" },
        { points: 1, label: "Squirming, shifting back and forth, tense", sw: "Anajinyonga, anahama huku na huko, amekaza" },
        { points: 2, label: "Arched, rigid or jerking", sw: "Amepinda mgongo, amekakamaa au anashtuka" },
      ],
    },
    {
      id: "C",
      label: "Cry",
      sw: "Kilio",
      options: [
        { points: 0, label: "No cry (awake or asleep)", sw: "Hakuna kilio (macho au amelala)" },
        { points: 1, label: "Moans or whimpers, occasional complaint", sw: "Anagugumia, analalamika mara moja moja" },
        { points: 2, label: "Crying steadily, screams or sobs, frequent complaints", sw: "Analia mfululizo, anapiga kelele, analalamika mara nyingi" },
      ],
    },
    {
      id: "Co",
      label: "Consolability",
      sw: "Kubembelezeka",
      options: [
        { points: 0, label: "Content, relaxed", sw: "Ametulia, ameridhika" },
        { points: 1, label: "Reassured by occasional touching, hugging or talking; distractible", sw: "Anatulizwa kwa kuguswa, kukumbatiwa au kuongeleshwa" },
        { points: 2, label: "Difficult to console or comfort", sw: "Ni vigumu kumbembeleza" },
      ],
    },
  ],
  bands: [
    { min: 0, max: 0, label: "Relaxed and comfortable (0)", tone: "ok" },
    { min: 1, max: 3, label: "Mild discomfort (1–3)", tone: "info" },
    { min: 4, max: 6, label: "Moderate pain (4–6)", tone: "warn", action: "Treat per the prescription and local paediatric pain policy, then reassess." },
    { min: 7, max: 10, label: "Severe discomfort or pain (7–10)", tone: "alert", action: "Treat per the prescription and local paediatric pain policy, and reassess promptly. Escalate if pain is not controlled." },
  ],
  meta: {
    id: "flacc",
    title: "FLACC behavioural pain scale",
    population: "Children 2 months to 7 years who cannot self-report, originally validated after surgery.",
    sources: [
      "Merkel SI, Voepel-Lewis T, Shayevitz JR, Malviya S. The FLACC: a behavioral scale for scoring postoperative pain in young children. Pediatr Nurs. 1997;23(3):293–297.",
    ],
    limitations: [
      "Observe for 1 to 5 minutes (longer if asleep) before scoring.",
      "Use a self-report scale for children who can give one.",
      "Analgesic choice and doses come from the prescription; this tool only measures pain behaviour.",
    ],
    ...reviewed,
  },
};

export const OPTION_SCORES: ScoreDef[] = [GCS, RASS, BRADEN, ALDRETE, MORSE, FLACC];

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

/* ---------------------------- SOFA ---------------------------- */

export interface SofaInput {
  /** PaO₂ and its unit. */
  pao2: number | null;
  pao2Unit: "mmHg" | "kPa";
  /** Inspired oxygen, percent (21 to 100). */
  fio2Pct: number | null;
  /** Mechanical or non-invasive respiratory support. */
  respSupport: boolean | null;
  /** Platelets ×10⁹/L (same as ×10³/µL). */
  platelets: number | null;
  bilirubin: number | null;
  bilirubinUnit: "umol/L" | "mg/dL";
  /** Mean arterial pressure, mmHg. */
  map: number | null;
  /** Vasoactive doses in mcg/kg/min, given for at least 1 hour. Null or 0 = not running. */
  dopamine: number | null;
  dobutamine: boolean;
  adrenaline: number | null;
  noradrenaline: number | null;
  gcs: number | null;
  creatinine: number | null;
  creatinineUnit: "umol/L" | "mg/dL";
  /** Urine output over 24 h, mL. Optional. */
  urine24h: number | null;
  /** Known baseline SOFA, for the change. Optional. */
  baseline: number | null;
}

export interface SofaOrgan {
  id: "resp" | "coag" | "liver" | "cardio" | "cns" | "renal";
  name: string;
  points: number | null;
  detail: string;
}

export interface SofaResult {
  organs: SofaOrgan[];
  total: number | null;
  /** Sum of the organs scored so far. */
  partial: number;
  missing: string[];
  delta: number | null;
  warnings: string[];
}

const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);
const KPA_TO_MMHG = 7.50062;

export function sofa(i: SofaInput): SofaResult {
  const organs: SofaOrgan[] = [];
  const warnings: string[] = [];

  // Respiration: PaO₂/FiO₂ in mmHg. 3 and 4 need respiratory support.
  if (ok(i.pao2) && ok(i.fio2Pct) && i.fio2Pct >= 21 && i.fio2Pct <= 100 && i.respSupport !== null) {
    const pao2 = i.pao2Unit === "kPa" ? i.pao2 * KPA_TO_MMHG : i.pao2;
    const pf = pao2 / (i.fio2Pct / 100);
    let p = pf >= 400 ? 0 : pf >= 300 ? 1 : 2;
    if (pf < 200 && i.respSupport) p = pf < 100 ? 4 : 3;
    const note = pf < 200 && !i.respSupport ? " (3 and 4 require respiratory support, so 2)" : "";
    organs.push({ id: "resp", name: "Respiration", points: p, detail: `PaO₂/FiO₂ = ${pao2.toFixed(0)} ÷ ${(i.fio2Pct / 100).toFixed(2)} = ${pf.toFixed(0)} mmHg${note}` });
  } else {
    if (ok(i.fio2Pct) && (i.fio2Pct < 21 || i.fio2Pct > 100)) warnings.push("FiO₂ must be between 21 and 100%.");
    organs.push({ id: "resp", name: "Respiration", points: null, detail: "Needs PaO₂, FiO₂ and whether on respiratory support" });
  }

  if (ok(i.platelets)) {
    const x = i.platelets;
    organs.push({ id: "coag", name: "Coagulation", points: x >= 150 ? 0 : x >= 100 ? 1 : x >= 50 ? 2 : x >= 20 ? 3 : 4, detail: `Platelets ${x} ×10⁹/L` });
  } else organs.push({ id: "coag", name: "Coagulation", points: null, detail: "Needs platelets" });

  if (ok(i.bilirubin)) {
    const x = i.bilirubin;
    const p =
      i.bilirubinUnit === "mg/dL"
        ? x < 1.2 ? 0 : x < 2 ? 1 : x < 6 ? 2 : x < 12 ? 3 : 4
        : x < 20 ? 0 : x <= 32 ? 1 : x <= 101 ? 2 : x <= 204 ? 3 : 4;
    organs.push({ id: "liver", name: "Liver", points: p, detail: `Bilirubin ${x} ${i.bilirubinUnit === "mg/dL" ? "mg/dL" : "µmol/L"}` });
  } else organs.push({ id: "liver", name: "Liver", points: null, detail: "Needs bilirubin" });

  {
    const dop = ok(i.dopamine) && i.dopamine > 0 ? i.dopamine : 0;
    const adr = ok(i.adrenaline) && i.adrenaline > 0 ? i.adrenaline : 0;
    const nor = ok(i.noradrenaline) && i.noradrenaline > 0 ? i.noradrenaline : 0;
    const anyVaso = dop > 0 || adr > 0 || nor > 0 || i.dobutamine;
    let p: number | null = null;
    const why: string[] = [];
    if (dop > 15 || adr > 0.1 || nor > 0.1) {
      p = 4;
      why.push(dop > 15 ? `dopamine ${dop} > 15` : adr > 0.1 ? `adrenaline ${adr} > 0.1` : `noradrenaline ${nor} > 0.1`);
    } else if (dop > 5 || adr > 0 || nor > 0) {
      p = 3;
      why.push(dop > 5 ? `dopamine ${dop} > 5` : adr > 0 ? `adrenaline ${adr} ≤ 0.1` : `noradrenaline ${nor} ≤ 0.1`);
    } else if (dop > 0 || i.dobutamine) {
      p = 2;
      why.push(dop > 0 ? `dopamine ${dop} ≤ 5` : "dobutamine (any dose)");
    } else if (ok(i.map)) {
      p = i.map < 70 ? 1 : 0;
      why.push(`MAP ${i.map} mmHg`);
    }
    organs.push({ id: "cardio", name: "Cardiovascular", points: p, detail: p === null ? "Needs MAP, or the vasoactive drugs running" : `${why.join(", ")}${anyVaso ? " mcg/kg/min" : ""}` });
  }

  if (ok(i.gcs)) {
    if (i.gcs < 3 || i.gcs > 15) {
      warnings.push("GCS must be between 3 and 15.");
      organs.push({ id: "cns", name: "Central nervous system", points: null, detail: "GCS out of range" });
    } else {
      const g = i.gcs;
      organs.push({ id: "cns", name: "Central nervous system", points: g === 15 ? 0 : g >= 13 ? 1 : g >= 10 ? 2 : g >= 6 ? 3 : 4, detail: `GCS ${g}` });
    }
  } else organs.push({ id: "cns", name: "Central nervous system", points: null, detail: "Needs GCS" });

  {
    let byCr: number | null = null;
    if (ok(i.creatinine)) {
      const x = i.creatinine;
      byCr =
        i.creatinineUnit === "mg/dL"
          ? x < 1.2 ? 0 : x < 2 ? 1 : x < 3.5 ? 2 : x < 5 ? 3 : 4
          : x < 110 ? 0 : x <= 170 ? 1 : x <= 299 ? 2 : x <= 440 ? 3 : 4;
    }
    const byUo = ok(i.urine24h) ? (i.urine24h < 200 ? 4 : i.urine24h < 500 ? 3 : 0) : null;
    const p = byCr === null && byUo === null ? null : Math.max(byCr ?? 0, byUo ?? 0);
    const parts = [ok(i.creatinine) ? `creatinine ${i.creatinine} ${i.creatinineUnit === "mg/dL" ? "mg/dL" : "µmol/L"} → ${byCr}` : null, ok(i.urine24h) ? `urine ${i.urine24h} mL/24 h → ${byUo}` : null].filter(Boolean);
    organs.push({ id: "renal", name: "Renal", points: p, detail: p === null ? "Needs creatinine or 24-hour urine output" : `${parts.join("; ")}${parts.length > 1 ? " (higher counts)" : ""}` });
  }

  const missing = organs.filter((o) => o.points === null).map((o) => o.name);
  const partial = organs.reduce((s, o) => s + (o.points ?? 0), 0);
  const total = missing.length ? null : partial;
  const delta = total !== null && ok(i.baseline) ? total - i.baseline : null;
  return { organs, total, partial, missing, delta, warnings };
}

export const SOFA_META: ContentMeta = {
  id: "sofa",
  title: "Sequential Organ Failure Assessment (SOFA)",
  population: "Adult ICU patients. Score the worst value in each 24-hour period.",
  sources: [
    "Vincent JL, Moreno R, Takala J, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707–710.",
    "Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801–810: a rise of 2 or more from baseline indicates organ dysfunction.",
  ],
  limitations: [
    "Vasoactive doses are those in the original table, in mcg/kg/min, given for at least 1 hour. They score the drug that is running; they are not dosing advice.",
    "GCS should be the patient's best estimate without sedation; sedated patients are hard to score.",
    "Assume a baseline of 0 only if there is no known prior organ dysfunction.",
    "Not validated for children; use a paediatric SOFA.",
  ],
  ...reviewed,
};

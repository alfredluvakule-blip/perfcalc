/**
 * Structured clinical record forms, defined as data so hospitals can extend
 * them later. A form only collects and prints what the clinician enters; it
 * does not make clinical decisions.
 */
import type { Bi } from "./checklists";

export type Field =
  | { id: string; kind: "text"; label: Bi; placeholder?: string }
  | { id: string; kind: "textarea"; label: Bi; rows?: number }
  | { id: string; kind: "number"; label: Bi; unit?: string }
  | { id: string; kind: "choice"; label: Bi; options: { value: string; label: Bi; detail?: Bi }[] }
  | { id: string; kind: "check"; label: Bi };

export interface FormSection {
  id: string;
  title: Bi;
  fields: Field[];
}

export interface FormDef {
  id: string;
  title: Bi;
  version: string;
  source: string;
  sections: FormSection[];
}

export type FormValues = Record<string, string | number | boolean | null | undefined>;

const b = (en: string, sw: string): Bi => ({ en, sw });
const yes = { value: "yes", label: b("Yes", "Ndiyo") };
const no = { value: "no", label: b("No", "Hapana") };

export function filledCount(def: FormDef, v: FormValues): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (const s of def.sections)
    for (const f of s.fields) {
      total++;
      const x = v[f.id];
      if (f.kind === "check" ? x === true : x !== undefined && x !== null && String(x).trim() !== "") filled++;
    }
  return { filled, total };
}

/* ---------------------------- anaesthesia ---------------------------- */

export const ASA_CLASSES = [
  { value: "I", label: b("ASA I", "ASA I"), detail: b("A normal healthy patient", "Mgonjwa mwenye afya ya kawaida") },
  { value: "II", label: b("ASA II", "ASA II"), detail: b("A patient with mild systemic disease", "Mgonjwa mwenye ugonjwa mdogo wa mwili mzima") },
  { value: "III", label: b("ASA III", "ASA III"), detail: b("A patient with severe systemic disease", "Mgonjwa mwenye ugonjwa mkubwa wa mwili mzima") },
  { value: "IV", label: b("ASA IV", "ASA IV"), detail: b("Severe systemic disease that is a constant threat to life", "Ugonjwa mkubwa unaotishia maisha wakati wote") },
  { value: "V", label: b("ASA V", "ASA V"), detail: b("A moribund patient not expected to survive without the operation", "Mgonjwa mahututi asiyetarajiwa kupona bila upasuaji") },
  { value: "VI", label: b("ASA VI", "ASA VI"), detail: b("A declared brain-dead patient whose organs are being removed for donor purposes", "Mgonjwa aliyetangazwa kufa kwa ubongo, viungo kwa ajili ya mchango") },
];

export const MALLAMPATI = [
  { value: "I", label: b("Class I", "Daraja I"), detail: b("Soft palate, fauces, uvula and pillars visible", "Kaakaa laini, koo, kidaka na nguzo vinaonekana") },
  { value: "II", label: b("Class II", "Daraja II"), detail: b("Soft palate, fauces and uvula visible", "Kaakaa laini, koo na kidaka vinaonekana") },
  { value: "III", label: b("Class III", "Daraja III"), detail: b("Soft palate and base of uvula visible", "Kaakaa laini na shina la kidaka vinaonekana") },
  { value: "IV", label: b("Class IV", "Daraja IV"), detail: b("Soft palate not visible, hard palate only", "Kaakaa laini halionekani, kaakaa gumu tu") },
];

export const PREOP: FormDef = {
  id: "preop",
  title: b("Pre-anaesthetic assessment", "Tathmini kabla ya nusukaputi"),
  version: "0.1",
  source:
    "Structure follows common pre-anaesthetic assessment practice. ASA Physical Status Classification System (American Society of Anesthesiologists, last amended 13 December 2020). Mallampati classification as modified by Samsoon GL, Young JR. Anaesthesia. 1987;42(5):487–490.",
  sections: [
    {
      id: "id",
      title: b("Patient and procedure", "Mgonjwa na upasuaji"),
      fields: [
        { id: "ref", kind: "text", label: b("Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)") },
        { id: "procedure", kind: "text", label: b("Planned procedure", "Upasuaji uliopangwa") },
        { id: "urgency", kind: "choice", label: b("Urgency", "Uharaka"), options: [{ value: "elective", label: b("Elective", "Wa kupangwa") }, { value: "emergency", label: b("Emergency", "Wa dharura") }] },
        { id: "weight", kind: "number", label: b("Weight", "Uzito"), unit: "kg" },
        { id: "height", kind: "number", label: b("Height", "Urefu"), unit: "cm" },
      ],
    },
    {
      id: "history",
      title: b("History", "Historia"),
      fields: [
        { id: "medical", kind: "textarea", label: b("Medical history", "Historia ya magonjwa") },
        { id: "surgical", kind: "textarea", label: b("Previous surgery and anaesthesia (including problems)", "Upasuaji na nusukaputi zilizopita (pamoja na matatizo)") },
        { id: "allergies", kind: "text", label: b("Allergies and reactions", "Mzio na athari") },
        { id: "medications", kind: "textarea", label: b("Current medications", "Dawa anazotumia sasa") },
        { id: "fastSolids", kind: "text", label: b("Last solid food (time)", "Chakula kigumu cha mwisho (saa)") },
        { id: "fastClear", kind: "text", label: b("Last clear fluid (time)", "Kinywaji safi cha mwisho (saa)") },
      ],
    },
    {
      id: "airway",
      title: b("Airway", "Njia ya hewa"),
      fields: [
        { id: "mallampati", kind: "choice", label: b("Mallampati (modified)", "Mallampati (iliyorekebishwa)"), options: MALLAMPATI },
        { id: "tmd", kind: "number", label: b("Thyromental distance", "Umbali wa thyromental"), unit: "cm" },
        { id: "mouth", kind: "number", label: b("Mouth opening (inter-incisor)", "Kufungua mdomo (kati ya meno)"), unit: "cm" },
        { id: "neck", kind: "choice", label: b("Neck movement", "Kujongea kwa shingo"), options: [{ value: "full", label: b("Full", "Kamili") }, { value: "reduced", label: b("Reduced", "Imepungua") }, { value: "fixed", label: b("Fixed", "Haijongei") }] },
        { id: "dentition", kind: "text", label: b("Dentition (loose, capped, dentures)", "Meno (yanayolegea, bandia)") },
        { id: "difficult", kind: "choice", label: b("Predicted difficult airway", "Njia ngumu ya hewa inatarajiwa"), options: [yes, no] },
        { id: "airwayNotes", kind: "textarea", label: b("Airway notes and plan", "Maelezo na mpango wa njia ya hewa") },
      ],
    },
    {
      id: "systems",
      title: b("Systems and investigations", "Mifumo na vipimo"),
      fields: [
        { id: "cvs", kind: "textarea", label: b("Cardiovascular assessment", "Tathmini ya moyo na mishipa") },
        { id: "resp", kind: "textarea", label: b("Respiratory assessment", "Tathmini ya mfumo wa kupumua") },
        { id: "labs", kind: "textarea", label: b("Relevant laboratory results", "Matokeo muhimu ya maabara") },
        { id: "ecg", kind: "textarea", label: b("ECG and echocardiography", "ECG na echocardiography") },
      ],
    },
    {
      id: "plan",
      title: b("Risk and plan", "Hatari na mpango"),
      fields: [
        { id: "asa", kind: "choice", label: b("ASA physical status", "Hali ya mwili kwa ASA"), options: ASA_CLASSES },
        { id: "asaE", kind: "check", label: b("Emergency (add E to the ASA class)", "Dharura (ongeza E kwenye daraja la ASA)") },
        { id: "risk", kind: "textarea", label: b("Anaesthesia risk assessment", "Tathmini ya hatari ya nusukaputi") },
        { id: "technique", kind: "text", label: b("Planned technique", "Mbinu iliyopangwa") },
        { id: "consent", kind: "check", label: b("Anaesthesia discussed and consent obtained", "Nusukaputi imeelezwa na ridhaa imepatikana") },
        { id: "assessor", kind: "text", label: b("Assessed by", "Imetathminiwa na") },
      ],
    },
  ],
};

/* ---------------------------- ICU daily review ---------------------------- */

const ta = (id: string, en: string, sw: string): Field => ({ id, kind: "textarea", label: b(en, sw), rows: 2 });

export const ICU_DAILY: FormDef = {
  id: "icu-daily",
  title: b("ICU daily review", "Mapitio ya kila siku ya ICU"),
  version: "0.1",
  source:
    "Systematic A to E review with the daily care bundle headings requested by the hospital (airway, breathing, circulation, disability, exposure, lines, infection, nutrition, skin, mobility, psychological support, family, discharge). Headings only; content is the clinician's.",
  sections: [
    { id: "day", title: b("Patient and day", "Mgonjwa na siku"), fields: [{ id: "ref", kind: "text", label: b("Bed or reference (printed only, never saved)", "Kitanda au rejea (inachapishwa tu)") }, { id: "icuDay", kind: "number", label: b("ICU day", "Siku ya ICU") }, { id: "problems", kind: "textarea", label: b("Active problems", "Matatizo yaliyopo") }] },
    { id: "a", title: b("A: Airway", "A: Njia ya hewa"), fields: [ta("airway", "Airway, tube size, position at lips, cuff", "Njia ya hewa, ukubwa wa mrija, kina, cuff")] },
    { id: "b", title: b("B: Breathing", "B: Kupumua"), fields: [ta("vent", "Ventilation mode and settings, ABG, plan to wean", "Mfumo wa mashine na mipangilio, ABG, mpango wa kuachisha")] },
    { id: "c", title: b("C: Circulation", "C: Mzunguko wa damu"), fields: [ta("circ", "Haemodynamics, vasoactive drugs, fluid balance", "Hali ya mzunguko, dawa za kuongeza presha, uwiano wa maji")] },
    { id: "d", title: b("D: Disability", "D: Hali ya neva"), fields: [ta("neuro", "GCS or RASS, sedation target, CAM-ICU, pain", "GCS au RASS, lengo la usingizi, CAM-ICU, maumivu")] },
    { id: "e", title: b("E: Exposure", "E: Uchunguzi wa mwili"), fields: [ta("exposure", "Temperature, wounds, drains", "Joto, vidonda, mirija ya kutoa majimaji")] },
    { id: "lines", title: b("Lines and tubes", "Mistari na mirija"), fields: [ta("lines", "Each line or tube, insertion date, still needed?", "Kila mstari au mrija, tarehe ya kuwekwa, bado unahitajika?")] },
    { id: "inf", title: b("Infection", "Maambukizi"), fields: [ta("infection", "Cultures, antimicrobials and day, review date", "Vipimo vya vimelea, dawa na siku, tarehe ya kupitia")] },
    { id: "nut", title: b("Nutrition", "Lishe"), fields: [ta("nutrition", "Route, target, glucose control", "Njia, lengo, udhibiti wa sukari")] },
    { id: "skin", title: b("Skin integrity", "Hali ya ngozi"), fields: [ta("skin", "Braden, pressure areas, repositioning", "Braden, maeneo ya mgandamizo, kugeuza")] },
    { id: "mob", title: b("Mobility", "Kutembea na mazoezi"), fields: [ta("mobility", "Mobility level, physiotherapy", "Kiwango cha kujongea, fiziotherapia")] },
    { id: "psy", title: b("Psychological support", "Msaada wa kisaikolojia"), fields: [ta("psych", "Sleep, delirium prevention, communication", "Usingizi, kuzuia kuchanganyikiwa, mawasiliano")] },
    { id: "fam", title: b("Family communication", "Mawasiliano na familia"), fields: [ta("family", "Who was updated, what was discussed", "Nani amepewa taarifa, nini kilijadiliwa")] },
    {
      id: "plan",
      title: b("Plan and discharge readiness", "Mpango na utayari wa kuruhusiwa"),
      fields: [ta("plan", "Plan for today", "Mpango wa leo"), { id: "discharge", kind: "choice", label: b("Ready for ICU discharge", "Tayari kutoka ICU"), options: [yes, no] }, { id: "reviewer", kind: "text", label: b("Reviewed by", "Imepitiwa na") }],
    },
  ],
};

/* ---------------------------- pressure injury ---------------------------- */

export const NPIAP_STAGES = [
  { value: "1", label: b("Stage 1", "Hatua ya 1"), detail: b("Non-blanchable erythema of intact skin", "Wekundu usiopotea kwa kubonyeza, ngozi haijavunjika") },
  { value: "2", label: b("Stage 2", "Hatua ya 2"), detail: b("Partial-thickness skin loss with exposed dermis", "Upotevu wa sehemu ya ngozi, dermis inaonekana") },
  { value: "3", label: b("Stage 3", "Hatua ya 3"), detail: b("Full-thickness skin loss; fat may be visible, no fascia, muscle, tendon or bone", "Upotevu wa ngozi yote; mafuta yanaweza kuonekana") },
  { value: "4", label: b("Stage 4", "Hatua ya 4"), detail: b("Full-thickness skin and tissue loss with exposed fascia, muscle, tendon, ligament, cartilage or bone", "Upotevu wa ngozi na tishu; misuli, kano au mfupa vinaonekana") },
  { value: "U", label: b("Unstageable", "Haipimiki hatua"), detail: b("Full-thickness loss obscured by slough or eschar", "Upotevu kamili uliofunikwa na tishu iliyokufa") },
  { value: "DTPI", label: b("Deep tissue pressure injury", "Jeraha la tishu za ndani"), detail: b("Persistent non-blanchable deep red, maroon or purple discoloration", "Rangi nyekundu iliyokolea, zambarau isiyopotea") },
  { value: "MDRPI", label: b("Medical device related", "Linalohusiana na kifaa"), detail: b("Caused by a medical device; stage it with the system above", "Limesababishwa na kifaa; lipe hatua kwa mfumo ulio juu") },
  { value: "MMPI", label: b("Mucosal membrane", "Utando wa ndani"), detail: b("On a mucous membrane; cannot be staged", "Kwenye utando wa ndani; haipimiki hatua") },
];

export const NPIAP_SOURCE =
  "National Pressure Injury Advisory Panel (NPIAP) pressure injury stages, revised 2016. Edsberg LE, et al. Revised National Pressure Ulcer Advisory Panel Pressure Injury Staging System. J Wound Ostomy Continence Nurs. 2016;43(6):585–597.";

export interface WoundEntry {
  id: string;
  at: string;
  location: string;
  stage: string;
  lengthCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  exudate?: string;
  dressing?: string;
  note?: string;
}

export interface TurnEntry {
  id: string;
  at: string;
  position: string;
  by?: string;
}

export interface PressureState {
  bed: string;
  braden: number | null;
  /** Repositioning interval in minutes, set from the care plan. No default. */
  intervalMin: number | null;
  mattress: string;
  nutrition: string;
  turns: TurnEntry[];
  wounds: WoundEntry[];
}

/** When the next repositioning is due, or null if no interval or no turn yet. */
export function nextTurnDue(s: PressureState): Date | null {
  if (!s.intervalMin || s.intervalMin <= 0 || !s.turns.length) return null;
  const last = s.turns.reduce((a, t) => (t.at > a ? t.at : a), s.turns[0].at);
  return new Date(new Date(last).getTime() + s.intervalMin * 60_000);
}

/** Turns in a 24-hour window and the longest gap between them (minutes), for the daily report. */
export function turnCompliance(turns: TurnEntry[], start: Date, intervalMin: number | null) {
  const end = start.getTime() + 24 * 3_600_000;
  const times = turns
    .map((t) => new Date(t.at).getTime())
    .filter((t) => t >= start.getTime() && t < end)
    .sort((a, c) => a - c);
  let longest = 0;
  for (let i = 1; i < times.length; i++) longest = Math.max(longest, (times[i] - times[i - 1]) / 60_000);
  const expected = intervalMin && intervalMin > 0 ? Math.floor((24 * 60) / intervalMin) : null;
  const late = intervalMin ? times.slice(1).filter((t, i) => (t - times[i]) / 60_000 > intervalMin).length : 0;
  return { count: times.length, expected, longestGapMin: times.length > 1 ? longest : null, lateTurns: late };
}

export const PACU: FormDef = {
  id: "pacu",
  title: b("Post-anaesthesia recovery (PACU)", "Uponaji baada ya nusukaputi (PACU)"),
  version: "0.1",
  source:
    "Headings from the requested PACU workflow. Modified Aldrete Score: Aldrete JA, J Clin Anesth 1995;7:89–91 (score it in Clinical scores). Discharge criteria are those of the local recovery policy.",
  sections: [
    { id: "arr", title: b("Arrival", "Kuwasili"), fields: [{ id: "ref", kind: "text", label: b("Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)") }, { id: "arrival", kind: "text", label: b("Arrival time", "Saa ya kuwasili") }, { id: "handover", kind: "textarea", label: b("Handover from anaesthetist", "Makabidhiano kutoka kwa mtaalamu wa nusukaputi") }] },
    { id: "airway", title: b("Airway and breathing", "Njia ya hewa na kupumua"), fields: [{ id: "airway", kind: "textarea", label: b("Airway assessment", "Tathmini ya njia ya hewa") }, { id: "oxygen", kind: "text", label: b("Oxygen and SpO₂", "Oksijeni na SpO₂") }] },
    {
      id: "comfort",
      title: b("Pain and nausea", "Maumivu na kichefuchefu"),
      fields: [
        { id: "pain", kind: "number", label: b("Pain score (0 to 10)", "Alama ya maumivu (0 hadi 10)") },
        { id: "ponv", kind: "choice", label: b("Nausea and vomiting", "Kichefuchefu na kutapika"), options: [{ value: "none", label: b("None", "Hakuna") }, { value: "nausea", label: b("Nausea", "Kichefuchefu") }, { value: "vomiting", label: b("Vomiting", "Kutapika") }] },
        { id: "analgesia", kind: "textarea", label: b("Analgesia and antiemetics given", "Dawa za maumivu na kichefuchefu zilizotolewa") },
      ],
    },
    {
      id: "discharge",
      title: b("Discharge from recovery", "Kuruhusiwa kutoka uponaji"),
      fields: [
        { id: "aldrete", kind: "number", label: b("Modified Aldrete score (0 to 10)", "Alama ya Aldrete (0 hadi 10)") },
        { id: "bleeding", kind: "check", label: b("Surgical site and drains checked", "Eneo la upasuaji na mirija vimeangaliwa") },
        { id: "criteria", kind: "check", label: b("Local discharge criteria met", "Vigezo vya hospitali vya kuruhusu vimetimizwa") },
        { id: "dest", kind: "text", label: b("Discharged to", "Ameruhusiwa kwenda") },
        { id: "by", kind: "text", label: b("Discharged by", "Ameruhusiwa na") },
      ],
    },
  ],
};


/* ---------------------------- intraoperative record ---------------------------- */

const chk = (id: string, en: string, sw: string): Field => ({ id, kind: "check", label: b(en, sw) });
const tx = (id: string, en: string, sw: string): Field => ({ id, kind: "text", label: b(en, sw) });
const nm = (id: string, en: string, sw: string, unit?: string): Field => ({ id, kind: "number", label: b(en, sw), unit });

export const CORMACK_LEHANE = [
  { value: "1", label: b("Grade 1", "Daraja 1"), detail: b("Most of the glottis visible", "Sehemu kubwa ya glottis inaonekana") },
  { value: "2", label: b("Grade 2", "Daraja 2"), detail: b("Only the posterior part of the glottis visible", "Sehemu ya nyuma ya glottis tu inaonekana") },
  { value: "3", label: b("Grade 3", "Daraja 3"), detail: b("Only the epiglottis visible", "Epiglottis tu inaonekana") },
  { value: "4", label: b("Grade 4", "Daraja 4"), detail: b("No glottic structure visible", "Hakuna sehemu ya glottis inayoonekana") },
];

export const INTRAOP: FormDef = {
  id: "intraop",
  title: b("Intraoperative anaesthesia record", "Rekodi ya nusukaputi wakati wa upasuaji"),
  version: "0.1",
  source:
    "Headings from the requested anaesthesia workflow. Monitoring list: Klein AA, et al. Recommendations for standards of monitoring during anaesthesia and recovery 2021. Anaesthesia. 2021;76(9):1212–1223. Laryngoscopy grade: Cormack RS, Lehane J. Anaesthesia. 1984;39(11):1105–1111. Drugs and doses are recorded as given; the record does not suggest any.",
  sections: [
    {
      id: "case",
      title: b("Patient, team and times", "Mgonjwa, timu na muda"),
      fields: [
        tx("ref", "Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)"),
        tx("procedure", "Procedure", "Upasuaji"),
        tx("anaesthetist", "Anaesthetist or anaesthesia provider", "Mtoa nusukaputi"),
        tx("surgeon", "Surgeon", "Daktari wa upasuaji"),
        tx("tStart", "Anaesthesia start time", "Saa ya kuanza nusukaputi"),
        tx("tKnife", "Surgery start time", "Saa ya kuanza upasuaji"),
        tx("tEnd", "Surgery end time", "Saa ya kumaliza upasuaji"),
        tx("tOut", "Out of theatre", "Saa ya kutoka chumba cha upasuaji"),
      ],
    },
    {
      id: "checks",
      title: b("Before induction", "Kabla ya kuanza"),
      fields: [
        chk("signIn", "WHO Surgical Safety Checklist sign-in done", "Orodha ya WHO (sign-in) imekamilika"),
        chk("machine", "Anaesthetic machine and suction checked", "Mashine ya nusukaputi na kifyonzaji vimekaguliwa"),
        chk("emergencyDrugs", "Emergency drugs and difficult airway equipment available", "Dawa za dharura na vifaa vya njia ngumu ya hewa vipo"),
        chk("fasting", "Fasting status confirmed", "Hali ya kufunga imethibitishwa"),
      ],
    },
    {
      id: "tech",
      title: b("Technique", "Mbinu"),
      fields: [
        {
          id: "technique",
          kind: "choice",
          label: b("Anaesthetic technique", "Aina ya nusukaputi"),
          options: [
            { value: "ga", label: b("General", "Ya jumla") },
            { value: "regional", label: b("Regional (spinal, epidural, block)", "Ya sehemu (spinal, epidural, block)") },
            { value: "combined", label: b("General with regional", "Ya jumla na ya sehemu") },
            { value: "sedation", label: b("Sedation", "Usingizi mwepesi") },
            { value: "local", label: b("Local with monitoring", "Ganzi ya eneo pamoja na uangalizi") },
          ],
        },
        { id: "regionalDetail", kind: "textarea", label: b("Regional: site, needle, level, drug and volume as given", "Ya sehemu: eneo, sindano, kiwango, dawa na ujazo uliotolewa") },
      ],
    },
    {
      id: "airway",
      title: b("Airway", "Njia ya hewa"),
      fields: [
        tx("device", "Device and size (for example ETT 7.5 cuffed, LMA 4)", "Kifaa na ukubwa (mfano ETT 7.5, LMA 4)"),
        tx("depth", "Depth at lips or teeth", "Kina kwenye midomo au meno"),
        { id: "cl", kind: "choice", label: b("Laryngoscopy view (Cormack–Lehane)", "Muonekano wa laringoskopi (Cormack–Lehane)"), options: CORMACK_LEHANE },
        nm("attempts", "Intubation attempts", "Majaribio ya kuingiza mrija"),
        tx("airwayAids", "Aids used (bougie, video laryngoscope)", "Vifaa saidizi (bougie, video laryngoscope)"),
        chk("etco2Confirmed", "Tube position confirmed by capnography", "Mahali pa mrija pamethibitishwa kwa capnography"),
      ],
    },
    {
      id: "monitoring",
      title: b("Monitoring", "Uangalizi"),
      fields: [
        chk("mEcg", "ECG", "ECG"),
        chk("mNibp", "Non-invasive blood pressure", "Shinikizo la damu (kifaa cha nje)"),
        chk("mSpo2", "Pulse oximetry", "Oksimita"),
        chk("mCapno", "Capnography", "Capnography"),
        chk("mAgent", "Inspired oxygen and agent monitoring", "Uangalizi wa oksijeni na dawa ya gesi"),
        chk("mTemp", "Temperature", "Joto"),
        chk("mNmt", "Neuromuscular monitoring", "Uangalizi wa misuli (NMT)"),
        tx("invasive", "Invasive lines (arterial, central) and site", "Mistari ya ndani (ateri, kati) na mahali"),
        tx("ivAccess", "IV access (size, site)", "Kanula (ukubwa, mahali)"),
      ],
    },
    {
      id: "drugs",
      title: b("Drugs given", "Dawa zilizotolewa"),
      fields: [
        { id: "induction", kind: "textarea", label: b("Induction: drug, dose, route, time", "Kuanza: dawa, kipimo, njia, saa"), rows: 3 },
        { id: "maintenance", kind: "textarea", label: b("Maintenance: agent or infusion and settings", "Kuendeleza: dawa ya gesi au infusion na mipangilio"), rows: 2 },
        { id: "otherDrugs", kind: "textarea", label: b("Analgesia, antibiotics, antiemetics, vasopressors and others: drug, dose, time", "Dawa za maumivu, antibiotiki, kichefuchefu, vasopressor na nyinginezo: dawa, kipimo, saa"), rows: 4 },
        tx("antibioticTime", "Antibiotic prophylaxis time (if given)", "Saa ya antibiotiki ya kinga (kama imetolewa)"),
      ],
    },
    {
      id: "fluids",
      title: b("Fluids, blood and losses", "Maji, damu na upotevu"),
      fields: [
        nm("crystalloid", "Crystalloid", "Crystalloid", "mL"),
        nm("colloid", "Colloid", "Colloid", "mL"),
        tx("blood", "Blood products (type, units, unit numbers)", "Bidhaa za damu (aina, uniti, namba)"),
        nm("ebl", "Estimated blood loss", "Makadirio ya damu iliyopotea", "mL"),
        nm("urine", "Urine output", "Mkojo", "mL"),
      ],
    },
    {
      id: "events",
      title: b("Events and complications", "Matukio na matatizo"),
      fields: [{ id: "events", kind: "textarea", label: b("Time, event, action taken", "Saa, tukio, hatua iliyochukuliwa"), rows: 4 }],
    },
    {
      id: "emergence",
      title: b("Emergence and handover", "Kuamka na makabidhiano"),
      fields: [
        tx("reversal", "Reversal given (drug, dose) and NMT result", "Dawa ya kurejesha (dawa, kipimo) na matokeo ya NMT"),
        tx("extubation", "Extubation time and condition", "Saa ya kutoa mrija na hali"),
        tx("handoverTo", "Handed over to (PACU or ICU nurse)", "Amekabidhiwa kwa (muuguzi wa PACU au ICU)"),
        { id: "postopPlan", kind: "textarea", label: b("Post-operative instructions (analgesia, oxygen, fluids, monitoring)", "Maelekezo baada ya upasuaji (maumivu, oksijeni, maji, uangalizi)") },
      ],
    },
  ],
};

/* ---------------------------- nursing (E) ---------------------------- */

export const NURSING_ADMISSION: FormDef = {
  id: "nursing-admission",
  title: b("Nursing admission assessment", "Tathmini ya uuguzi wakati wa kulazwa"),
  version: "0.1",
  source:
    "Structured by systems and activities of daily living, the usual headings of a nursing admission assessment. Use Clinical scores for Braden and Morse, and follow local policy for reassessment frequency.",
  sections: [
    {
      id: "adm",
      title: b("Admission", "Kulazwa"),
      fields: [
        tx("ref", "Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)"),
        tx("reason", "Reason for admission", "Sababu ya kulazwa"),
        tx("from", "Admitted from", "Ametoka wapi"),
        tx("allergies", "Allergies and reactions", "Mzio na athari"),
        tx("alerts", "Alerts (infection, safeguarding, DNACPR)", "Tahadhari (maambukizi, ulinzi, DNACPR)"),
      ],
    },
    {
      id: "obs",
      title: b("Baseline observations", "Vipimo vya mwanzo"),
      fields: [
        nm("temp", "Temperature", "Joto", "°C"),
        nm("pulse", "Pulse", "Mapigo ya moyo", "/min"),
        tx("bp", "Blood pressure", "Shinikizo la damu"),
        nm("rr", "Respiration rate", "Kasi ya kupumua", "/min"),
        nm("spo2", "SpO₂", "SpO₂", "%"),
        nm("weight", "Weight", "Uzito", "kg"),
        nm("pain", "Pain score (0 to 10)", "Alama ya maumivu (0 hadi 10)"),
        nm("glucose", "Blood glucose", "Sukari ya damu", "mmol/L"),
      ],
    },
    {
      id: "adl",
      title: b("Systems and daily living", "Mifumo na shughuli za kila siku"),
      fields: [
        tx("breathing", "Breathing", "Kupumua"),
        tx("eating", "Eating, drinking and swallowing", "Kula, kunywa na kumeza"),
        tx("elimination", "Elimination (urine, bowels, catheter)", "Haja ndogo na kubwa (katheta)"),
        tx("mobility", "Mobility and aids", "Kujongea na vifaa saidizi"),
        tx("hygiene", "Personal hygiene and dressing", "Usafi binafsi na kuvaa"),
        tx("sleep", "Sleep and rest", "Usingizi na mapumziko"),
        tx("skin", "Skin and wounds", "Ngozi na vidonda"),
        nm("braden", "Braden score", "Alama ya Braden"),
        nm("morse", "Morse fall score", "Alama ya Morse ya kuanguka"),
        {
          id: "language",
          kind: "choice",
          label: b("Preferred language", "Lugha anayopendelea"),
          options: [
            { value: "sw", label: b("Kiswahili", "Kiswahili") },
            { value: "en", label: b("English", "Kiingereza") },
            { value: "other", label: b("Other (interpreter needed?)", "Nyingine (mkalimani?)") },
          ],
        },
        tx("communication", "Communication, sight and hearing", "Mawasiliano, kuona na kusikia"),
        tx("psych", "Mood, anxiety, spiritual and cultural needs", "Hisia, wasiwasi, mahitaji ya kiroho na kitamaduni"),
      ],
    },
    {
      id: "social",
      title: b("Social", "Kijamii"),
      fields: [
        tx("nok", "Next of kin and phone (printed only, never saved)", "Ndugu wa karibu na simu (inachapishwa tu)"),
        tx("home", "Home situation and support", "Hali ya nyumbani na msaada"),
        tx("assessedBy", "Assessed by", "Imefanywa na"),
      ],
    },
  ],
};

const problem = (k: number): FormSection => ({
  id: `p${k}`,
  title: b(`Problem ${k}`, `Tatizo la ${k}`),
  fields: [
    tx(`p${k}dx`, "Nursing diagnosis or problem", "Utambuzi wa kiuguzi au tatizo"),
    { id: `p${k}goal`, kind: "textarea", label: b("Goal (measurable, with a time frame)", "Lengo (linalopimika, lenye muda)"), rows: 2 },
    { id: `p${k}int`, kind: "textarea", label: b("Nursing interventions", "Hatua za kiuguzi"), rows: 3 },
    { id: `p${k}eval`, kind: "textarea", label: b("Evaluation (met, partly met, not met, and why)", "Tathmini (limefikiwa, kiasi, halijafikiwa, na kwa nini)"), rows: 2 },
  ],
});

export const CARE_PLAN: FormDef = {
  id: "care-plan",
  title: b("Nursing care plan", "Mpango wa huduma ya uuguzi"),
  version: "0.1",
  source:
    "Follows the nursing process: assessment, diagnosis, planning, implementation and evaluation. Problem wording is the nurse's own or from the hospital's approved nursing diagnosis list.",
  sections: [
    { id: "pt", title: b("Patient", "Mgonjwa"), fields: [tx("ref", "Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)"), tx("date", "Date", "Tarehe"), tx("nurse", "Nurse", "Muuguzi")] },
    problem(1),
    problem(2),
    problem(3),
  ],
};

export const DISCHARGE_PLAN: FormDef = {
  id: "discharge-plan",
  title: b("Discharge planning", "Mpango wa kuruhusiwa"),
  version: "0.1",
  source: "Common discharge planning headings. Follow-up, medicines and referral details come from the medical team and the hospital's discharge policy.",
  sections: [
    { id: "pt", title: b("Patient", "Mgonjwa"), fields: [tx("ref", "Patient name or ID (printed only, never saved)", "Jina au namba ya mgonjwa (inachapishwa tu)"), tx("date", "Planned discharge date", "Tarehe ya kuruhusiwa"), tx("dest", "Discharged to (home, other facility)", "Anakwenda (nyumbani, kituo kingine)")] },
    {
      id: "edu",
      title: b("Education given", "Elimu iliyotolewa"),
      fields: [
        chk("meds", "Medicines explained (name, purpose, dose, times, side effects)", "Dawa zimeelezwa (jina, kazi, kipimo, saa, madhara)"),
        chk("wound", "Wound, drain or catheter care taught", "Utunzaji wa kidonda, mrija au katheta umefundishwa"),
        chk("danger", "Danger signs and when to return taught", "Dalili za hatari na wakati wa kurudi zimefundishwa"),
        chk("diet", "Diet and activity advice given", "Ushauri wa chakula na shughuli umetolewa"),
        chk("teachBack", "Understanding checked by teach-back", "Uelewa umethibitishwa kwa kurudia maelezo"),
        tx("eduLanguage", "Language used and who was taught", "Lugha iliyotumika na aliyefundishwa"),
      ],
    },
    {
      id: "follow",
      title: b("Follow-up", "Ufuatiliaji"),
      fields: [
        tx("appointment", "Follow-up appointment (clinic, date)", "Miadi ya kurudi (kliniki, tarehe)"),
        tx("referral", "Referrals (physiotherapy, nutrition, community)", "Rufaa (fiziotherapia, lishe, jamii)"),
        tx("equipment", "Equipment and supplies", "Vifaa na mahitaji"),
        tx("transport", "Transport", "Usafiri"),
        tx("documents", "Documents given (summary, prescriptions)", "Nyaraka zilizotolewa (muhtasari, maagizo ya dawa)"),
        tx("by", "Discharged by", "Ameruhusiwa na"),
      ],
    },
  ],
};

export const FORMS: FormDef[] = [PREOP, PACU, ICU_DAILY, INTRAOP, NURSING_ADMISSION, CARE_PLAN, DISCHARGE_PLAN];

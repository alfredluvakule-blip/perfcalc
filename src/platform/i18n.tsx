import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/* English and Kiswahili interface strings. Clinical wording in Kiswahili
   must be reviewed by a native-speaking clinician before clinical use. */

export type Lang = "en" | "sw";

const en = {
  appName: "NurseAnaesthesia Pro",
  tagline: "Clinical calculators, nursing care and critical care assistant",
  dashboard: "Dashboard",
  search: "Search modules and tools",
  noMatch: "No module matches that search.",
  ready: "Ready",
  partial: "Partly built",
  planned: "Planned",
  open: "Open",
  back: "Dashboard",
  language: "Kiswahili",
  dark: "Dark",
  light: "Light",
  disclaimer:
    "For clinical reference only. Not a substitute for professional judgment, local policy or emergency protocols. Clinical content is in draft until approved by qualified clinicians.",
  draftBanner: "Draft content: not yet reviewed by a qualified clinician. Verify every result before clinical use.",
  modPerfusion: "Perfusion (PerfCalc TZ)",
  modPerfusionDesc: "Cardiopulmonary bypass flow, haemodilution, prime, drugs, equipment and case sheet.",
  modInfusion: "Infusion and syringe pump",
  modInfusionDesc: "Dose to rate and back in any unit, syringe preparation and label, double check, formulary limits.",
  modFluids: "Fluid management",
  modFluidsDesc: "Maintenance, deficit, fluid balance chart, urine output and % fluid overload.",
  modAnaesthesia: "Anaesthesia assistant",
  modAnaesthesiaDesc: "Preoperative assessment, airway, anaesthesia record and recovery.",
  modIcu: "ICU clinical assistant",
  modIcuDesc: "Observations, ventilator chart, scores and daily review.",
  modNursing: "Nursing care assistant",
  modNursingDesc: "Assessment, care plans, medication records, handover and discharge.",
  modChecklists: "Checklist library",
  modChecklistsDesc: "ICU, anaesthesia, theatre and nursing checklists in English and Kiswahili.",
  modPressure: "Pressure injury",
  modPressureDesc: "Braden scale, staging, repositioning reminders and daily report.",
  modEmergency: "Emergency and resuscitation",
  modEmergencyDesc: "Arrest, anaphylaxis, airway and sepsis checklists with guideline versions.",
  modLibrary: "Reference library",
  modLibraryDesc: "Guidelines and documents uploaded by your hospital.",
  modAi: "AI clinical assistant",
  modAiDesc: "Explains calculations, drafts notes and handovers; never prescribes.",
  modReports: "Documentation and reports",
  modReportsDesc: "Records and charts exported as PDF, Word and Excel.",
  modAnalytics: "Dashboard and analytics",
  modAnalyticsDesc: "Personal and hospital-level compliance and activity.",
  modFormulary: "Hospital formulary",
  modFormularyDesc: "Approved infusion concentrations, dose limits and route rules for this hospital.",
  modScores: "Clinical scores",
  modScoresDesc: "GCS, NEWS2, RASS, CAM-ICU, Braden, Modified Aldrete and Morse fall scale, with sources.",
  modAudit: "Audit log",
  modAuditDesc: "Calculations confirmed, double checks and changes on this device.",
  plannedPhase: "Planned for phase",
  plannedNote: "This module is in the development plan. Tools marked Ready can be used now.",
};

type Dict = typeof en;

const sw: Dict = {
  appName: "NurseAnaesthesia Pro",
  tagline: "Vikokotoo vya kliniki, huduma za uuguzi na msaidizi wa wagonjwa mahututi",
  dashboard: "Dashibodi",
  search: "Tafuta moduli na zana",
  noMatch: "Hakuna moduli inayolingana na utafutaji huo.",
  ready: "Tayari",
  partial: "Imejengwa kwa sehemu",
  planned: "Imepangwa",
  open: "Fungua",
  back: "Dashibodi",
  language: "English",
  dark: "Giza",
  light: "Mwanga",
  disclaimer:
    "Kwa marejeo ya kliniki tu. Haichukui nafasi ya uamuzi wa kitaalamu, sera za hospitali au itifaki za dharura. Maudhui ya kliniki ni rasimu hadi yaidhinishwe na wataalamu waliohitimu.",
  draftBanner: "Maudhui ya rasimu: bado hayajakaguliwa na mtaalamu aliyehitimu. Hakiki kila jibu kabla ya kutumia kwa mgonjwa.",
  modPerfusion: "Perfusion (PerfCalc TZ)",
  modPerfusionDesc: "Mtiririko wa mashine ya moyo na mapafu, uchanganyaji wa damu, prime, dawa, vifaa na fomu ya kesi.",
  modInfusion: "Infyusheni na pampu ya sindano",
  modInfusionDesc: "Dozi kwenda kiwango na kurudi kwa kipimo chochote, kuandaa sindano na lebo, uhakiki wa pili, mipaka ya fomulari.",
  modFluids: "Usimamizi wa maji",
  modFluidsDesc: "Maji ya kudumisha, upungufu, chati ya uwiano wa maji, mkojo na asilimia ya maji kupita kiasi.",
  modAnaesthesia: "Msaidizi wa nusukaputi",
  modAnaesthesiaDesc: "Tathmini kabla ya upasuaji, njia ya hewa, rekodi ya nusukaputi na uponaji.",
  modIcu: "Msaidizi wa ICU",
  modIcuDesc: "Vipimo vya mgonjwa, chati ya mashine ya kupumua, alama na mapitio ya kila siku.",
  modNursing: "Msaidizi wa huduma za uuguzi",
  modNursingDesc: "Tathmini, mipango ya huduma, rekodi za dawa, makabidhiano na kuruhusiwa.",
  modChecklists: "Maktaba ya orodha hakiki",
  modChecklistsDesc: "Orodha hakiki za ICU, nusukaputi, chumba cha upasuaji na uuguzi kwa Kiingereza na Kiswahili.",
  modPressure: "Vidonda vya kulala",
  modPressureDesc: "Kipimo cha Braden, hatua za kidonda, vikumbusho vya kugeuza mgonjwa na ripoti ya kila siku.",
  modEmergency: "Dharura na ufufuaji",
  modEmergencyDesc: "Orodha hakiki za moyo kusimama, anaphylaxis, njia ya hewa na sepsis pamoja na toleo la mwongozo.",
  modLibrary: "Maktaba ya marejeo",
  modLibraryDesc: "Miongozo na nyaraka zilizopakiwa na hospitali yako.",
  modAi: "Msaidizi wa AI wa kliniki",
  modAiDesc: "Hufafanua hesabu, huandaa maelezo na makabidhiano; haiandiki dawa kamwe.",
  modReports: "Nyaraka na ripoti",
  modReportsDesc: "Rekodi na chati kama PDF, Word na Excel.",
  modAnalytics: "Dashibodi na takwimu",
  modAnalyticsDesc: "Utekelezaji na shughuli kwa mtumiaji na kwa hospitali.",
  modFormulary: "Fomulari ya hospitali",
  modFormularyDesc: "Viwango vya dawa vilivyoidhinishwa, mipaka ya dozi na sheria za njia kwa hospitali hii.",
  modScores: "Alama za kliniki",
  modScoresDesc: "GCS, NEWS2, RASS, CAM-ICU, Braden, Aldrete iliyorekebishwa na kipimo cha Morse cha kuanguka, pamoja na vyanzo.",
  modAudit: "Kumbukumbu za ukaguzi",
  modAuditDesc: "Hesabu zilizothibitishwa, uhakiki wa pili na mabadiliko kwenye kifaa hiki.",
  plannedPhase: "Imepangwa awamu ya",
  plannedNote: "Moduli hii iko kwenye mpango wa maendeleo. Zana zilizoandikwa Tayari zinaweza kutumika sasa.",
};

export type TKey = keyof Dict;
const DICTS: Record<Lang, Dict> = { en, sw };
const KEY = "nap-lang";

function initialLang(): Lang {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "en" || v === "sw") return v;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith("sw") ? "sw" : "en";
}

interface I18n {
  lang: Lang;
  t: (key: TKey) => string;
  toggleLang: () => void;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next: Lang = l === "en" ? "sw" : "en";
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = next;
      return next;
    });
  }, []);
  const value = useMemo(() => ({ lang, t: (k: TKey) => DICTS[lang][k] ?? en[k], toggleLang }), [lang, toggleLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}

/** Every key exists in both languages (checked by a test). */
export const _dicts = DICTS;

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Gauge,
  BarChart3,
  BedDouble,
  BookMarked,
  Bot,
  ClipboardCheck,
  Droplets,
  FileText,
  HeartPulse,
  History,
  ListChecks,
  Siren,
  Stethoscope,
  Syringe,
  UserRound,
  UserCog,
} from "lucide-react";
import type { TKey } from "./i18n";

export type Role = "nurse" | "anaesthetist" | "icu" | "theatre" | "perfusionist" | "admin" | "educator";
export type ModuleStatus = "ready" | "partial" | "planned";

export interface ModuleDef {
  id: string;
  letter?: string;
  title: TKey;
  description: TKey;
  icon: LucideIcon;
  status: ModuleStatus;
  /** Plan phase for what is not built yet (see docs/PLATFORM_PLAN.md). */
  phase?: number;
  /** Who the module is for. Used for filtering now and for access control once accounts exist. */
  roles: Role[];
  keywords: string;
}

const ALL: Role[] = ["nurse", "anaesthetist", "icu", "theatre", "perfusionist", "admin", "educator"];

export const MODULES: ModuleDef[] = [
  { id: "infusion", letter: "A", title: "modInfusion", description: "modInfusionDesc", icon: Syringe, status: "partial", phase: 4, roles: ALL, keywords: "tiva tci syringe pump vasopressor inotrope noradrenaline insulin heparin label dilution mcg/kg/min sindano" },
  { id: "fluids", letter: "B", title: "modFluids", description: "modFluidsDesc", icon: Droplets, status: "partial", phase: 2, roles: ALL, keywords: "maintenance deficit dehydration balance urine overload burns intake output maji" },
  { id: "perfusion", title: "modPerfusion", description: "modPerfusionDesc", icon: HeartPulse, status: "ready", roles: ["perfusionist", "anaesthetist", "theatre"], keywords: "cpb bypass flow bsa haematocrit prime heparin protamine cardioplegia cannula oxygenator perfcalc" },
  { id: "anaesthesia", letter: "C", title: "modAnaesthesia", description: "modAnaesthesiaDesc", icon: Stethoscope, status: "partial", phase: 2, roles: ["anaesthetist", "theatre"], keywords: "asa mallampati airway intraoperative record vital signs cormack lehane pacu aldrete nusukaputi" },
  { id: "icu", letter: "D", title: "modIcu", description: "modIcuDesc", icon: Activity, status: "partial", phase: 2, roles: ["icu", "nurse"], keywords: "ventilator observation chart gcs rass cam-icu sofa apache news2 abg daily review" },
  { id: "nursing", letter: "E", title: "modNursing", description: "modNursingDesc", icon: UserRound, status: "partial", phase: 3, roles: ["nurse"], keywords: "admission assessment care plan nursing process diagnosis handover sbar discharge teaching wound fall uuguzi" },
  { id: "scores", title: "modScores", description: "modScoresDesc", icon: Gauge, status: "partial", phase: 2, roles: ALL, keywords: "gcs glasgow news2 rass cam-icu delirium braden aldrete morse falls early warning sofa sepsis flacc paediatric pain alama" },
  { id: "checklists", letter: "F", title: "modChecklists", description: "modChecklistsDesc", icon: ListChecks, status: "partial", phase: 2, roles: ALL, keywords: "who surgical safety vap clabsi cauti count time-out orodha" },
  { id: "pressure", letter: "G", title: "modPressure", description: "modPressureDesc", icon: BedDouble, status: "partial", phase: 2, roles: ["nurse", "icu"], keywords: "braden bed sore staging repositioning vidonda" },
  { id: "emergency", letter: "H", title: "modEmergency", description: "modEmergencyDesc", icon: Siren, status: "planned", phase: 4, roles: ALL, keywords: "cardiac arrest bls als anaphylaxis sepsis shock defibrillator dharura" },
  { id: "library", letter: "I", title: "modLibrary", description: "modLibraryDesc", icon: BookMarked, status: "planned", phase: 4, roles: ALL, keywords: "guidelines documents pdf upload maktaba" },
  { id: "ai", letter: "J", title: "modAi", description: "modAiDesc", icon: Bot, status: "planned", phase: 5, roles: ALL, keywords: "assistant explain abg ecg notes revision questions" },
  { id: "reports", letter: "K", title: "modReports", description: "modReportsDesc", icon: FileText, status: "planned", phase: 2, roles: ALL, keywords: "pdf word excel export charts ripoti" },
  { id: "analytics", letter: "L", title: "modAnalytics", description: "modAnalyticsDesc", icon: BarChart3, status: "planned", phase: 5, roles: ["admin", "educator"], keywords: "compliance statistics takwimu" },
  { id: "formulary", title: "modFormulary", description: "modFormularyDesc", icon: ClipboardCheck, status: "ready", roles: ["admin", "anaesthetist", "icu"], keywords: "concentration limits approved drugs hospital fomulari" },
  { id: "account", title: "modAccount", description: "modAccountDesc", icon: UserCog, status: "partial", phase: 3, roles: ALL, keywords: "sign in login account role invite staff admin sync server akaunti" },
  { id: "audit", title: "modAudit", description: "modAuditDesc", icon: History, status: "ready", roles: ALL, keywords: "log history double check ukaguzi" },
];

export function findModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}

/**
 * Clinical content registry. Every calculator and reference in the platform
 * declares where its method comes from, which population it applies to, and
 * whether a qualified clinician has reviewed it. The UI shows this beside
 * every result.
 */

export type ContentStatus = "draft" | "approved";

export interface ContentMeta {
  id: string;
  title: string;
  version: string;
  /** Who the method applies to, in plain words. */
  population: string;
  sources: string[];
  /** Date the content was written or last changed (ISO date). */
  updatedOn: string;
  status: ContentStatus;
  /** Filled in when a clinician approves it. */
  reviewedBy?: string;
  reviewedOn?: string;
  limitations: string[];
}

export const CONTENT: Record<string, ContentMeta> = {
  infusion: {
    id: "infusion",
    title: "Continuous infusion and syringe pump calculator",
    version: "0.1.0",
    population: "Adults, children and neonates. The arithmetic is the same; doses and concentrations are not, and come only from the prescription and the hospital formulary.",
    sources: [
      "Dose-rate arithmetic by dimensional analysis: rate (mL/h) = amount per hour ÷ concentration. No drug-specific constants are built in.",
      "Concentrations, dose limits and route rules: the hospital's approved formulary, entered under Formulary.",
    ],
    updatedOn: "2026-11-15",
    status: "draft",
    limitations: [
      "Does not know the drug: it cannot tell whether a dose or concentration is appropriate unless the hospital formulary sets limits.",
      "Does not account for dead space in lines, priming volume, or pump start-up delay.",
      "Fixed-rate mode only. Target-controlled infusion (TCI) is planned and is not offered yet.",
    ],
  },
  syringe: {
    id: "syringe",
    title: "Syringe preparation calculator",
    version: "0.1.0",
    population: "Any patient. Ampoule strength is read from the ampoule in hand.",
    sources: ["Dilution arithmetic: final concentration = total drug ÷ final volume.", "Diluent choice, stability and expiry: the hospital's injectable medicines guide."],
    updatedOn: "2026-11-15",
    status: "draft",
    limitations: [
      "Does not check diluent compatibility or stability.",
      "Expiry on the label is what the preparer enters from local policy; the app does not calculate it.",
    ],
  },
  maintenance: {
    id: "maintenance",
    title: "Maintenance fluid",
    version: "0.1.0",
    population:
      "Holliday-Segar was derived for children beyond the neonatal period and is often applied to adults by weight. Not for neonates: use the unit's mL/kg/day protocol with the per-kg method.",
    sources: [
      "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832.",
      "Per-kg method: rate from the hospital protocol (for example neonatal day-of-life rates), entered by the user.",
    ],
    updatedOn: "2026-11-15",
    status: "draft",
    limitations: [
      "A starting estimate only. Many protocols restrict volume in acutely ill patients (for example raised ADH, heart failure, renal impairment).",
      "Does not choose the fluid type or electrolyte content.",
      "Does not replace ongoing losses or deficits; add those separately.",
    ],
  },
  deficit: {
    id: "deficit",
    title: "Fluid deficit from % dehydration",
    version: "0.1.0",
    population: "Children and adults where % dehydration has been estimated clinically or from a recent weight.",
    sources: ["Arithmetic: 1% of body weight ≈ 10 mL/kg of water (1 kg ≈ 1 L). Deficit (mL) = weight (kg) × % × 10."],
    updatedOn: "2026-11-15",
    status: "draft",
    limitations: ["Clinical estimates of % dehydration are imprecise.", "Rate and fluid of replacement follow the local protocol (for example WHO plans for diarrhoeal dehydration)."],
  },
  balance: {
    id: "balance",
    title: "Fluid balance chart",
    version: "0.1.0",
    population: "Any inpatient. Urine output in mL/kg/h uses the weight entered.",
    sources: [
      "Net balance = total intake − total output; cumulative balance adds the balance carried in.",
      "Percentage fluid overload = (intake − output in L) ÷ admission weight (kg) × 100. Goldstein SL, et al. Outcome in children receiving continuous venovenous hemofiltration. Pediatrics. 2001;107(6):1309–1312.",
    ],
    updatedOn: "2026-11-15",
    status: "draft",
    limitations: [
      "Insensible losses are not counted unless entered as an output.",
      "% fluid overload was described in critically ill children; interpret with care in adults.",
      "Totals are only as complete as the entries.",
    ],
  },
};

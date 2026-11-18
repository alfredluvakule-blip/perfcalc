# NurseAnaesthesia Pro: audit of PerfCalc TZ and phased plan

Status: draft, written 15 Nov 2026. No clinical content in this plan or in the code has been reviewed by a qualified clinician yet. Nothing here is approved for clinical use.

## 1. Audit of PerfCalc TZ (as found on `main`, commit ab8ae02)

### Framework and build

| Item | Finding |
|---|---|
| Framework | React 18 + TypeScript (strict), built with Vite 5 |
| Styling | Tailwind CSS 3 with shadcn-style HSL tokens, light and dark themes |
| Offline | vite-plugin-pwa (Workbox): every asset precached, installable on Android, iOS, Windows, Mac |
| Routing | none; one page with ten Radix tabs, tab chosen by URL hash (`#sheet`, `#drugs`) or last saved tab |
| State | one React context (`CaseContext`) holding one patient case; numbers only saved to `localStorage` |
| Backend | none; no accounts, no database, no network calls |
| Tests | Vitest, 30 formula tests in `src/lib/perfusion.test.ts`, all passing |
| Deploy | GitHub Actions: test, build, publish to GitHub Pages at `/perfcalc/`; Vercel config also present; one-file HTML build |

### Data structures and calculation logic

- `src/lib/perfusion-data.ts`: every clinical constant in one file (blood volume bands, flow bands, tubing, circuits, cannulae, oxygenators, heparin, protamine, tranexamic acid, cardioplegia, CPB drugs, anaesthesia and emergency bolus doses, local anaesthetic maxima, eight infusion presets, electrolytes, targets, checklists, emergencies, sources).
- `src/lib/perfusion.ts`: pure functions: BSA (Mosteller, DuBois, Haycock), EBV, CI and weight-based pump flow, tubing volume from geometry, haematocrit on bypass, red cell volume, maximum crystalloid prime, ultrafiltration, CaO2, DO2, flow for DO2i, SVR, infusion rate and dose (mcg/kg/min only, concentration in mg), potassium deficit, bicarbonate dose, Holliday-Segar maintenance, paediatric airway estimates, equipment picks, weight-based dose rows with caps, and `deriveCase()` that computes everything for the case.

### Working features (all preserved)

1. Shared patient strip (adult or paediatric, weight, height, age, sex, haematocrit) with adult and paediatric examples.
2. Flow and BSA: three BSA formulas, CI or mL/kg/min flow, DO2i and SVR.
3. Haemodilution: EBV, haematocrit on bypass, red cells to add or replace, maximum prime, ultrafiltration.
4. Drug dosages: heparin, protamine with ratio ceiling warning, tranexamic acid presets, cardioplegia volumes and redosing, other CPB drugs.
5. Prime volume: circuit presets that follow patient size, editable components and tubing.
6. Quick reference: targets, temperature rules, hypothermia levels, formulas, sources.
7. Electrolytes: potassium and bicarbonate correction.
8. Anaesthesia: bolus dose tables by group, infusion calculator with presets, airway sizes, maintenance fluid.
9. Equipment calculation and CPB techniques reference.
10. Printable case sheet with a plain-text copy; names and file numbers never stored.
11. Install button, update banner, offline use, dark mode, team photo banner and gallery.

### Gaps against the new brief

- One patient and one specialty (perfusion). No dashboard, no module structure, no navigation beyond tabs.
- Infusion maths supports only mcg/kg/min with concentration in mg. No units/h, mg/h, mcg/min, no unit checking, no syringe preparation, no label, no remaining volume or empty time, no double check, no configurable limits.
- **Safety finding:** the existing Anaesthesia tab pre-fills eight standard infusion concentrations and dose ranges (`INFUSION_PRESETS`). The new brief says the app must not assume a standard concentration. Those presets are kept unchanged for now so nothing is removed, but they need a clinician decision: approve them as the hospital formulary, or remove the pre-fill. The new infusion calculator does not pre-fill anything.
- No fluid balance chart, no scoring tools, no nursing, ICU, theatre or emergency workspaces, no checklist library, no Kiswahili, no accounts, roles, audit log or database, no AI assistant, no document export beyond print.

### Decision on technology: retain

The current stack is already the one the brief suggests (React, TypeScript, PWA). Migration to Next.js would bring server rendering the app does not need and would break the one-file offline build. Plan: keep Vite + React + TypeScript + Tailwind + PWA and grow it into a modular app. Add a backend (Supabase with PostgreSQL is the recommended option) in Phase 3, behind an offline-first local store, so every calculator keeps working with no signal.

## 2. Architecture

```
src/
  platform/        app shell: dashboard, header, language, theme, search, hash router
  modules/         one folder per module, each registered in platform/modules.ts
    perfusion/     the existing PerfCalc TZ app, mounted unchanged
    infusion/      Module A
    fluids/        Module B
    ...            C to L as they are built
  lib/clinical/    pure calculation engines with no React: units, infusion, syringe, fluids, scores
  lib/content/     clinical content registry: every formula, checklist and reference carries
                   source, version, population, author, reviewer, review date and status
  lib/formulary/   hospital formulary: drugs, concentrations, dose limits, route rules.
                   Empty by default. Filled and approved by the hospital, exported and imported as a file.
  lib/audit/       append-only audit log of calculations, double checks and edits
  lib/i18n/        English and Kiswahili strings
```

Rules every module follows:

1. **Calculation engines are pure functions** with unit tests, boundary tests and error tests. The UI only displays what the engine returns.
2. **Every calculator shows** inputs with units, the formula, numbered steps, the result, warnings, the reference, and the content status and review date (the shared `CalcReport` component).
3. **No clinical number is invented.** Drug concentrations and dose limits come only from what the user enters or from the hospital formulary. Formulas come from cited published sources and name the population they apply to. Values that differ between hospitals are configurable fields.
4. **Units are typed.** Mass (g, mg, mcg, ng), units, mmol and mEq are separate families and never converted into each other. Time (min, h) and per-kg dosing are explicit.
5. **Content status** is shown on screen: Draft (not reviewed), Approved (with reviewer and date). Only Approved content should be used clinically; the hospital decides who can approve.
6. **Offline first.** All calculators, references and downloaded checklists work with no network. Records sync when a backend is added.

## 3. Phased plan

Each phase ships working features, keeps every existing feature, and passes the test suite before merging.

### Phase 1: platform shell, infusions, fluid balance (this pull request)

- Dashboard with every module A to L plus Perfusion, search, English and Kiswahili, dark and light mode. Old links (`#sheet`, `#drugs`) still open PerfCalc.
- PerfCalc TZ mounted unchanged as the Perfusion module.
- Module A (part): unit-safe infusion calculator (dose to rate and rate to dose) for mcg/kg/min, mcg/kg/h, mg/kg/h, mcg/min, mg/h, units/h, units/kg/h, mmol/h and more; total drug and fluid over a duration; syringe remaining volume and empty time; configurable limits; weight and concentration confirmation; independent double-check; route warning from the formulary.
- Module A4: syringe preparation calculator and printable syringe label.
- Hospital formulary editor (empty by default, export and import JSON).
- Module B (part): maintenance fluid with a choice of method and population, deficit from % dehydration, fluid balance chart with intake and output entries, net and cumulative balance, urine output in mL/kg/h, % fluid overload, and a chart.
- Local audit log.
- Unit tests for every new engine.

### Phase 2: scores, checklists, anaesthesia and nursing records (offline, no backend)

Phase 2a (scores and checklist library) is built: GCS, NEWS2, RASS, CAM-ICU, Braden, Modified Aldrete, Morse; WHO Surgical Safety Checklist, SBAR and the hospital checklist editor. Phase 2b is built: pre-anaesthetic assessment, PACU record, ICU daily review, pressure injury module (repositioning reminders, NPIAP staging, daily report). Phase 2c is built: SOFA and FLACC, intraoperative anaesthesia record with a timed vital signs chart, ICU observation and ventilator charts (print and CSV export), and the nursing module (E): admission assessment, care plan, discharge planning. Moved to later phases: APACHE II and blood gas interpretation (need a validated implementation), the medication administration record (needs accounts and secure storage, Phase 3), and the difficult airway checklist (needs a locally approved algorithm; can be built now in the hospital checklist editor).

- Scoring engine with GCS, RASS, CAM-ICU, SOFA, APACHE II, Braden, NEWS2, Modified Aldrete, FLACC and Numeric pain scales, Morse fall scale. Each with formula, interpretation, limitations and population, cited to the original publication.
- Checklist engine: versioned checklists (English and Kiswahili) with source and version, tick, sign, print to PDF, save on the device. First set: WHO Surgical Safety Checklist (WHO 2009 text), anaesthesia machine checkout, SBAR handover, and the hospital's own lists entered through the editor. Remaining checklists from the brief drafted from cited guidelines and marked Draft until reviewed.
- Module C: preoperative assessment form (ASA, Mallampati, airway), PACU with Modified Aldrete, printable anaesthesia record.
- Module E and G: nursing assessment, care plan builder (clinician confirms each item), Braden, pressure injury staging (NPIAP 2016), repositioning schedule with on-device reminders, daily pressure injury report.
- Module D: ICU observation chart, ventilator chart, daily review (A to E, lines, infection, nutrition, skin, mobility, family, discharge).
- PDF export for every record (browser print to PDF first, generated PDF after).

### Phase 3: backend, accounts, roles, audit

Phase 3a is built (18 Nov 2026): Supabase tables prefixed `nap_` in the existing "perfusionist" project, chosen by the owner. Invitation-only staff accounts with roles, hospital administrator screen (invite, change role, suspend), server audit log with an offline outbox, versioned formulary and checklist tables with admin approval (screens next). RLS tested locally (`npm run test:rls`) and checked on the live database inside a rolled-back transaction. Next in Phase 3: share the hospital formulary and checklists through the server with approval, then offline sync of records once the data protection review allows patient data.


- Supabase (PostgreSQL, Auth, Row Level Security, Storage). Hospitals, departments, users, roles (nurse, anaesthetist, ICU, theatre, administrator, educator).
- Per-hospital formulary, concentrations, protocols, checklists, with approval workflow and version history.
- Server audit log (append-only table) for calculations, records and checklist changes.
- Offline store (IndexedDB) with background sync and conflict handling; patient data encrypted at rest on the device.
- Security tests: RLS policy tests, auth tests, dependency scanning.
- Data protection: Tanzania Personal Data Protection Act 2022 compliance review before any patient data is stored on a server.

### Phase 4: emergency, TCI, reference library, reports

- Module H: cardiac arrest, paediatric, neonatal, anaphylaxis, airway and defibrillator checklists, each showing guideline name and version (for example the current Resuscitation Council UK or AHA algorithms the hospital adopts).
- Module A1 TCI: Marsh and Schnider (propofol), Minto (remifentanil), Eleveld (propofol and remifentanil). Three-compartment simulation with model-specific inputs and limits (age, weight, BMI ranges of the source studies). Validated against published reference outputs before release, and marked as a teaching and planning aid unless the hospital approves it.
- Module I: reference library with upload (PDF, Word), search, download, offline copies.
- Module K: Word (docx) and Excel (xlsx) export for records and charts.

### Phase 5: AI assistant and analytics

- Module J: AI assistant through a server function (the API key never reaches the device). Safety layer: educational versus patient-specific labelling, no prescribing or diagnosis, flags missing information and emergencies, points to protocols and senior review. Every answer logged.
- Module L: user and hospital dashboards (assessments done, checklists completed, missed observations, compliance) from the database.

### Phase 6: validation and deployment readiness

- Clinical validation test set reviewed by the hospital's clinicians (expected answers for each calculator).
- Cross-device tests (Playwright on phone, tablet and desktop sizes; offline tests with the service worker).
- Clinical safety case and hazard log, sign-off by named clinicians, then release.

## 4. What needs the owner's decision

1. Backend: **decided 15 Nov 2026: Supabase (PostgreSQL)**, set up in Phase 3. Creating the project still needs the owner's go-ahead.
2. Who approves clinical content at each hospital, and which guideline versions the hospital follows.
3. Whether the existing PerfCalc infusion presets become approved formulary entries or are removed.
4. Kiswahili: a native-speaking clinician should review all translations.
5. AI provider and budget for Module J.

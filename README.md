# NurseAnaesthesia Pro (including PerfCalc TZ)

Clinical calculators, nursing care and critical care assistant for nurses, anaesthesia and ICU teams, growing out of PerfCalc TZ, the cardiopulmonary bypass calculator for cardiovascular perfusion in Tanzania. PerfCalc TZ is kept whole as the Perfusion module.

The audit of PerfCalc TZ, the architecture and the phased plan for every module are in [`docs/PLATFORM_PLAN.md`](docs/PLATFORM_PLAN.md).

**All new clinical content is draft and has not been reviewed by a qualified clinician.** Do not use it clinically until your clinicians have approved it.

**Open or install:** https://alfredluvakule-blip.github.io/perfcalc/

The app installs on phones and computers and works with no internet once installed.

| Device | How to install |
|---|---|
| Android | Open the link in Chrome, tap **Install app** (or ⋮ menu › Install app) |
| iPhone / iPad | Open the link in Safari, tap Share › **Add to Home Screen** |
| Windows / Mac | Open the link in Edge or Chrome, click **Install app** (or the install icon in the address bar). It then appears in the Start menu |

## What it does

The app opens on a dashboard of modules (English or Kiswahili, light or dark). Built so far:

- **Infusion and syringe pump** (`src/modules/infusion`): dose to mL/h and back in mcg/kg/min, mg/h, units/h, mmol/h and other units; refuses to convert between unit families (mass, units, mmol, mEq); total drug and fluid over a duration; syringe empty time; optional dose limits and pump range; weight and concentration must be confirmed before the result shows; independent double check; syringe preparation with a printable label. No concentration or dose limit is built in.
- **Hospital formulary** (`src/lib/clinical/formulary.ts`): empty by default. Approved concentrations, dose limits and central-line rules entered by the hospital, with a required source; exported and imported as a JSON file.
- **Fluid management** (`src/modules/fluids`): fluid balance chart with intake and output entries, net and cumulative balance, urine output in mL/kg/h, % fluid overload and a chart; maintenance fluid (Holliday-Segar or a protocol mL/kg/day rate) and deficit from % dehydration.
- **Clinical scores** (`src/modules/scores`): GCS (with NT), NEWS2 with the RCP response, RASS, CAM-ICU, Braden, Modified Aldrete and Morse fall scale, each citing its original publication, with Kiswahili option labels.
- **Checklist library** (`src/modules/checklists`): WHO Surgical Safety Checklist (2009 text) and SBAR handover built in, in English and Kiswahili; hospitals write their own checklists from approved protocols in the editor (versioned, sourced, export and import); tick, print or save as PDF, and keep completion records on the device. The other checklists named in the plan are listed as awaiting the hospital's approved content.
- **Anaesthesia** (`src/modules/anaesthesia`): pre-anaesthetic assessment (history, fasting, airway with Mallampati, ASA class, plan, consent), PerfCalc's paediatric tube and LMA estimates, and a PACU recovery record; all printable.
- **ICU daily review** (`src/modules/icu`): A to E, lines, infection, nutrition, skin, mobility, psychological support, family and discharge readiness; printable.
- **Pressure injury** (`src/modules/pressure`): Braden category, repositioning log with reminders at the care-plan interval, NPIAP 2016 staging and wound log, and a printable daily prevention report.
- **Phase 2c additions:** SOFA (with change from baseline) and FLACC in Clinical scores; an intraoperative anaesthesia record with a timed vital signs chart; ICU observation and ventilator charts with CSV export for Excel; and a nursing module (admission assessment, care plan by the nursing process, discharge planning).
- **Staff account (optional, Phase 3):** sign in with the hospital's Supabase backend (`supabase/`). Invitation-only staff accounts with roles, an administrator screen to invite staff and manage roles, and the audit log copied to the hospital's server log (queued offline, uploaded when back online). No patient data is sent. `npm run test:rls` tests the access rules on a local PostgreSQL.
- **Audit log** on the device for confirmed calculations, double checks, printed labels and formulary changes.
- **Perfusion (PerfCalc TZ)**, unchanged, described below. Old links such as `#sheet` and `#drugs` still open it.

Every new calculator shows its inputs, formula, numbered steps, warnings, source, population, limitations and review status. The other modules (anaesthesia, ICU, nursing, checklists, pressure injury, emergency, library, AI assistant, reports, analytics) appear on the dashboard as planned, with their phase.

### PerfCalc TZ (Perfusion module)

Ten tabs share one patient, entered once (adult or paediatric): Flow & BSA, Hemodilution, Drug Dosages, Prime Volume, Quick Reference, Electrolytes, Anesthesia, Equipment Calculation, CPB Techniques, and a printable Case Sheet. Every result shows its formula.

Only calculator numbers and settings are stored, in the device's own browser storage. Names and file numbers typed on the case sheet are never saved.

## Clinical content

New modules keep their calculation engines in [`src/lib/clinical/`](src/lib/clinical/) (pure functions, tested in `clinical.test.ts`) and their source, version and review status in [`content.ts`](src/lib/clinical/content.ts).

For PerfCalc TZ, every clinical number lives in [`src/lib/perfusion-data.ts`](src/lib/perfusion-data.ts): doses, ranges, cannula and circuit tables, checklists. The formulas are in [`src/lib/perfusion.ts`](src/lib/perfusion.ts) and are checked by `src/lib/perfusion.test.ts`.

All defaults are textbook or guideline starting values, **not a hospital protocol**. Review them against BMH protocols before clinical use. Cannula flow capacities, oxygenator examples and circuit prime volumes are generic approximations and should be replaced with the figures for the equipment in stock.

## Team photos

The three team photos are in `src/assets/` (`perfusion-team-1.jpg` to `-3.jpg`) and are described in `src/lib/photos.ts`: caption, alt text and which part stays in view. They appear in the animated banner at the top (`src/components/HeroBanner.tsx`) and in the gallery at the bottom. Visitors can hide the banner; the choice is remembered on their device. To change a photo, replace the file and keep its name. Adding `perfusion-bg.png` gives the title bar a background image.

## Development

```bash
npm install
npm run dev          # local preview
npm test             # formula and calculator checks
node scripts/smoke-e2e.cjs   # phone, tablet and desktop smoke test against `npx vite preview --port 4173`
npm run build        # production build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. The Vercel projects linked to this repo build it too, using `vercel.json` (served from the site root).

Stack: React 18, TypeScript, Vite, Tailwind CSS (shadcn tokens), vite-plugin-pwa.

The earlier design canvas is still published at `Perfusion Tanzania.dc.html`.

---

For clinical reference only. Always verify calculations and apply clinical judgment. Not a substitute for professional training.

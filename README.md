# PerfCalc TZ

Cardiopulmonary bypass calculator and reference for cardiovascular perfusion in Tanzania.

**Open or install:** https://alfredluvakule-blip.github.io/perfcalc/

The app installs on phones and computers and works with no internet once installed.

| Device | How to install |
|---|---|
| Android | Open the link in Chrome, tap **Install app** (or ⋮ menu › Install app) |
| iPhone / iPad | Open the link in Safari, tap Share › **Add to Home Screen** |
| Windows / Mac | Open the link in Edge or Chrome, click **Install app** (or the install icon in the address bar). It then appears in the Start menu |

## What it does

Ten tabs share one patient, entered once (adult or paediatric): Flow & BSA, Hemodilution, Drug Dosages, Prime Volume, Quick Reference, Electrolytes, Anesthesia, Equipment Calculation, CPB Techniques, and a printable Case Sheet. Every result shows its formula.

Only calculator numbers and settings are stored, in the device's own browser storage. Names and file numbers typed on the case sheet are never saved.

## Clinical content

Every clinical number lives in [`src/lib/perfusion-data.ts`](src/lib/perfusion-data.ts): doses, ranges, cannula and circuit tables, checklists. The formulas are in [`src/lib/perfusion.ts`](src/lib/perfusion.ts) and are checked by `src/lib/perfusion.test.ts`.

All defaults are textbook or guideline starting values, **not a hospital protocol**. Review them against BMH protocols before clinical use. Cannula flow capacities, oxygenator examples and circuit prime volumes are generic approximations and should be replaced with the figures for the equipment in stock.

## Team photos

Add `perfusion-team-1.jpg`, `perfusion-team-2.jpg`, `perfusion-team-3.png` and `perfusion-bg.png` to `src/assets/` and they appear in the header and gallery. Without them the app builds and hides the gallery.

## Development

```bash
npm install
npm run dev          # local preview
npm test             # formula checks
npm run build        # production build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. The Vercel projects linked to this repo build it too, using `vercel.json` (served from the site root).

Stack: React 18, TypeScript, Vite, Tailwind CSS (shadcn tokens), vite-plugin-pwa.

The earlier design canvas is still published at `Perfusion Tanzania.dc.html`.

---

For clinical reference only. Always verify calculations and apply clinical judgment. Not a substitute for professional training.

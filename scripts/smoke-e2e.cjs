/* Cross-device smoke test at phone, tablet and desktop sizes.
   Run against a preview build:
     npm run build && npx vite preview --port 4173
     node scripts/smoke-e2e.cjs          (needs Playwright with Chromium)
   Exits with code 1 if a check fails or the page logs an error. */
const fs = require("fs");
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:4173";
const SHOTS = process.env.SHOTS_DIR || "smoke-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

(async () => {
  const browser = await chromium.launch();
  const sizes = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1366, height: 900 } };
  for (const [name, viewport] of Object.entries(sizes)) {
    const p = await browser.newPage({ viewport });
    p.on("pageerror", (e) => failures.push(`${name}: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && failures.push(`${name} console: ${m.text()}`));

    await p.goto(`${BASE}/`);
    await p.waitForSelector("text=Infusion and syringe pump");
    check(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${name}: dashboard has no sideways scroll`);
    await p.screenshot({ path: `${SHOTS}/${name}-dashboard.png`, fullPage: true });

    await p.goto(`${BASE}/#sheet`);
    check(await p.isVisible("text=PerfCalc TZ"), `${name}: old #sheet link opens PerfCalc TZ`);

    await p.goto(`${BASE}/#/infusion`);
    await p.getByLabel("Drug name").first().fill("Test drug");
    await p.getByLabel("Drug in syringe").fill("4");
    await p.getByLabel("Total volume").fill("50");
    await p.getByLabel("Prescribed dose").first().fill("0.1");
    await p.getByLabel("Weight (required)").fill("70");
    check(await p.isVisible("text=Confirm the weight and concentration"), `${name}: result hidden until confirmed`);
    await p.getByText("I have confirmed the weight").click();
    await p.getByText("I have confirmed the syringe").click();
    const rate = await p.locator("text=Pump rate").first().locator("..").innerText();
    check(/5\.25/.test(rate), `${name}: 0.1 mcg/kg/min × 70 kg with 4 mg in 50 mL = 5.25 mL/h`);
    await p.getByLabel("Checker's rate").fill("5.25");
    check(await p.isVisible("text=The two calculations agree."), `${name}: double check matches`);
    await p.getByLabel("Checker's rate").fill("52.5");
    check(await p.isVisible("text=do not agree"), `${name}: double check mismatch is flagged`);
    if (name === "phone") await p.screenshot({ path: `${SHOTS}/${name}-infusion.png`, fullPage: true });
    await p.getByLabel("Dose unit").first().selectOption("units/h");
    check(await p.isVisible("text=cannot be converted"), `${name}: mg concentration with units/h dose is refused`);

    await p.goto(`${BASE}/#/fluids`);
    await p.getByLabel("Weight now").fill("70");
    await p.getByLabel("Volume", { exact: true }).fill("500");
    await p.getByRole("button", { name: "Add entry" }).click();
    check(await p.isVisible("text=+500"), `${name}: fluid entry counted in the balance`);
    if (name === "phone") await p.screenshot({ path: `${SHOTS}/${name}-fluids.png`, fullPage: true });

    await p.goto(`${BASE}/#/scores`);
    await p.getByRole("button", { name: /^3\s*To sound/ }).click();
    await p.getByRole("button", { name: /^4\s*Confused/ }).click();
    await p.getByRole("button", { name: /^6\s*Obeys commands/ }).click();
    check(await p.isVisible("text=E3 V4 M6"), `${name}: GCS E3 V4 M6 = 13`);
    await p.getByRole("tab", { name: "NEWS2" }).click();
    await p.getByLabel("Respiration rate").fill("16");
    await p.getByLabel("SpO₂", { exact: true }).fill("98");
    await p.getByRole("button", { name: "Air", exact: true }).click();
    await p.getByLabel("Systolic BP").fill("120");
    await p.getByLabel("Pulse").fill("75");
    await p.getByLabel("Temperature").fill("37");
    await p.getByRole("button", { name: "New confusion, V, P or U" }).click();
    check(await p.isVisible("text=Low-medium (single 3)"), `${name}: NEWS2 single 3 is low-medium`);
    if (name === "phone") await p.screenshot({ path: `${SHOTS}/${name}-news2.png`, fullPage: true });

    await p.goto(`${BASE}/#/checklists`);
    await p.getByText("WHO Surgical Safety Checklist").first().click();
    await p.getByRole("button", { name: /Pulse oximeter on patient/ }).click();
    check(await p.isVisible("text=1 / 19"), `${name}: WHO checklist ticks count`);
    if (name === "phone") await p.screenshot({ path: `${SHOTS}/${name}-checklist.png`, fullPage: true });

    await p.goto(`${BASE}/#/icu`);
    check(await p.isVisible("text=Planned for phase"), `${name}: planned module shows its phase`);
    await p.close();
  }
  await browser.close();
  if (failures.length) {
    console.error("\nFailures:\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("\nAll smoke checks passed.");
})();

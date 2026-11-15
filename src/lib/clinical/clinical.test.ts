import { describe, expect, it } from "vitest";
import { UnitError, convertAmount, parseDoseUnit, compatible, DOSE_UNITS } from "./units";
import { calculateInfusion, convertDoseRate, type InfusionInput } from "./infusion";
import { prepareSyringe } from "./syringe";
import { deficitMl, hollidaySegarDaily, maintenance, summariseBalance, type FluidEntry } from "./fluids";
import { parseFormularyFile, validateEntry, exportFormulary, type FormularyEntry } from "./formulary";

/* The test values below are arbitrary numbers chosen to check arithmetic.
   They are not recommended doses or concentrations. */

describe("units", () => {
  it("converts within the mass family", () => {
    expect(convertAmount(1, "mg", "mcg")).toBe(1000);
    expect(convertAmount(1, "g", "mg")).toBe(1000);
    expect(convertAmount(500, "ng", "mcg")).toBe(0.5);
  });
  it("refuses to convert between families", () => {
    expect(() => convertAmount(1, "units", "mg")).toThrow(UnitError);
    expect(() => convertAmount(1, "mmol", "mEq")).toThrow(UnitError);
    expect(compatible("mg", "mcg")).toBe(true);
    expect(compatible("units", "mcg")).toBe(false);
  });
  it("parses every offered dose unit", () => {
    for (const u of DOSE_UNITS) expect(() => parseDoseUnit(u)).not.toThrow();
    expect(parseDoseUnit("mcg/kg/min")).toEqual({ amount: "mcg", perKg: true, per: "min" });
    expect(parseDoseUnit("units/h")).toEqual({ amount: "units", perKg: false, per: "h" });
  });
  it("rejects malformed dose units", () => {
    expect(() => parseDoseUnit("mcg")).toThrow(UnitError);
    expect(() => parseDoseUnit("mcg/lb/min")).toThrow(UnitError);
    expect(() => parseDoseUnit("mcg/kg/day")).toThrow(UnitError);
    expect(() => parseDoseUnit("drops/h")).toThrow(UnitError);
  });
});

const base: InfusionInput = {
  mode: "dose-to-rate",
  concentration: { amount: 4, unit: "mg", volumeMl: 50 },
  weightKg: 70,
  doseUnit: "mcg/kg/min",
  dose: 0.1,
};

describe("infusion: dose to rate", () => {
  it("mcg/kg/min with a mg concentration", () => {
    // 0.1 × 70 × 60 = 420 mcg/h; 4 mg/50 mL = 80 mcg/mL; 420 / 80 = 5.25 mL/h
    const r = calculateInfusion(base);
    expect(r.ok).toBe(true);
    expect(r.rateMlH).toBeCloseTo(5.25, 10);
    expect(r.amountPerHour).toBeCloseTo(0.42, 10); // mg/h
    expect(r.steps.length).toBeGreaterThan(2);
  });
  it("agrees with PerfCalc's original infusionRate formula", async () => {
    const { infusionRate } = await import("../perfusion");
    expect(calculateInfusion(base).rateMlH).toBeCloseTo(infusionRate(0.1, 70, 4, 50)!, 10);
  });
  it("non-weight-based units/h", () => {
    const r = calculateInfusion({ ...base, concentration: { amount: 50, unit: "units", volumeMl: 50 }, doseUnit: "units/h", dose: 3, weightKg: null });
    expect(r.ok).toBe(true);
    expect(r.rateMlH).toBeCloseTo(3, 10);
  });
  it("mg/h with a g concentration", () => {
    const r = calculateInfusion({ ...base, concentration: { amount: 2, unit: "g", volumeMl: 100 }, doseUnit: "mg/h", dose: 500, weightKg: null });
    expect(r.rateMlH).toBeCloseTo(25, 10);
  });
  it("mcg/min", () => {
    const r = calculateInfusion({ ...base, doseUnit: "mcg/min", dose: 10, weightKg: null });
    // 10 × 60 = 600 mcg/h ÷ 80 = 7.5
    expect(r.rateMlH).toBeCloseTo(7.5, 10);
  });
  it("mmol/kg/h", () => {
    const r = calculateInfusion({ ...base, concentration: { amount: 20, unit: "mmol", volumeMl: 100 }, doseUnit: "mmol/kg/h", dose: 0.1, weightKg: 10 });
    expect(r.rateMlH).toBeCloseTo(5, 10);
  });
});

describe("infusion: rate to dose", () => {
  it("round-trips with dose to rate", () => {
    const fwd = calculateInfusion(base);
    const back = calculateInfusion({ ...base, mode: "rate-to-dose", rateMlH: fwd.rateMlH, dose: null });
    expect(back.dose).toBeCloseTo(0.1, 10);
  });
  it("units/kg/h", () => {
    const r = calculateInfusion({ mode: "rate-to-dose", concentration: { amount: 50, unit: "units", volumeMl: 50 }, weightKg: 25, doseUnit: "units/kg/h", rateMlH: 2.5 });
    expect(r.dose).toBeCloseTo(0.1, 10);
  });
});

describe("infusion: safety and errors", () => {
  it("blocks incompatible units", () => {
    const r = calculateInfusion({ ...base, doseUnit: "units/h" });
    expect(r.ok).toBe(false);
    expect(r.rateMlH).toBeNull();
    expect(r.errors.join(" ")).toMatch(/cannot be converted/);
  });
  it("needs weight for per-kg doses only", () => {
    expect(calculateInfusion({ ...base, weightKg: null }).ok).toBe(false);
    expect(calculateInfusion({ ...base, weightKg: 0 }).ok).toBe(false);
    expect(calculateInfusion({ ...base, doseUnit: "mcg/min", weightKg: null }).ok).toBe(true);
  });
  it("never assumes a concentration", () => {
    expect(calculateInfusion({ ...base, concentration: { amount: null, unit: "mg", volumeMl: 50 } }).ok).toBe(false);
    expect(calculateInfusion({ ...base, concentration: { amount: 4, unit: "mg", volumeMl: null } }).ok).toBe(false);
  });
  it("rejects zero, negative and non-numeric doses", () => {
    expect(calculateInfusion({ ...base, dose: 0 }).ok).toBe(false);
    expect(calculateInfusion({ ...base, dose: -1 }).ok).toBe(false);
    expect(calculateInfusion({ ...base, dose: NaN }).ok).toBe(false);
    expect(calculateInfusion({ ...base, dose: Infinity }).ok).toBe(false);
  });
  it("flags an unusual weight but still calculates", () => {
    const r = calculateInfusion({ ...base, weightKg: 700 });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /unusual/.test(w.text))).toBe(true);
  });
  it("applies hard and soft limits only when given", () => {
    expect(calculateInfusion(base).warnings.filter((w) => w.severity !== "info")).toHaveLength(0);
    const soft = calculateInfusion({ ...base, limits: { unit: "mcg/kg/min", softMax: 0.05 } });
    expect(soft.blocked).toBe(false);
    expect(soft.warnings.some((w) => w.severity === "caution")).toBe(true);
    const hard = calculateInfusion({ ...base, limits: { unit: "mcg/kg/min", hardMax: 0.05 } });
    expect(hard.blocked).toBe(true);
    const low = calculateInfusion({ ...base, limits: { unit: "mcg/kg/min", hardMin: 0.2 } });
    expect(low.blocked).toBe(true);
  });
  it("checks limits written in a different compatible unit", () => {
    // 0.1 mcg/kg/min × 70 kg = 7 mcg/min
    const r = calculateInfusion({ ...base, limits: { unit: "mcg/min", hardMax: 6 } });
    expect(r.blocked).toBe(true);
    const ok = calculateInfusion({ ...base, limits: { unit: "mcg/min", hardMax: 8 } });
    expect(ok.blocked).toBe(false);
  });
  it("warns when limits cannot be compared", () => {
    const r = calculateInfusion({ ...base, limits: { unit: "units/h", hardMax: 1 } });
    expect(r.blocked).toBe(false);
    expect(r.warnings.some((w) => /could not be checked/.test(w.text))).toBe(true);
  });
  it("pump limits", () => {
    const r = calculateInfusion({ ...base, pump: { minRateMlH: 6 } });
    expect(r.warnings.some((w) => /lowest rate/.test(w.text))).toBe(true);
  });
});

describe("infusion: syringe time and totals", () => {
  it("time to empty and totals over a duration", () => {
    const r = calculateInfusion({ ...base, concentration: { amount: 50, unit: "units", volumeMl: 50 }, doseUnit: "units/h", dose: 5, weightKg: null, remainingMl: 30, durationH: 8 });
    expect(r.hoursToEmpty).toBeCloseTo(6, 10);
    expect(r.totalFluidMl).toBeCloseTo(40, 10);
    expect(r.totalDrug).toBeCloseTo(40, 10);
    expect(r.remainingAfterMl).toBeCloseTo(-10, 10);
    expect(r.warnings.some((w) => /empties/.test(w.text))).toBe(true);
  });
  it("defaults remaining volume to the full syringe", () => {
    const r = calculateInfusion(base);
    expect(r.hoursToEmpty).toBeCloseTo(50 / 5.25, 10);
  });
});

describe("dose rate conversion", () => {
  it("converts between per-kg and absolute, minutes and hours", () => {
    expect(convertDoseRate(0.1, "mcg/kg/min", "mcg/min", 70)).toBeCloseTo(7, 10);
    expect(convertDoseRate(0.1, "mcg/kg/min", "mg/h", 70)).toBeCloseTo(0.42, 10);
    expect(convertDoseRate(1, "mcg/kg/h", "ng/kg/min", 10)).toBeCloseTo(1000 / 60, 10);
  });
  it("refuses without weight or across families", () => {
    expect(() => convertDoseRate(1, "mcg/kg/min", "mcg/min", null)).toThrow(UnitError);
    expect(() => convertDoseRate(1, "units/h", "mg/h", 70)).toThrow(UnitError);
  });
});

describe("syringe preparation", () => {
  it("from a number of ampoules", () => {
    const r = prepareSyringe({ drug: "Test", ampouleAmount: 4, ampouleUnit: "mg", ampouleVolumeMl: 4, ampoules: 2, finalVolumeMl: 50, mode: "from-ampoules" });
    expect(r.ok).toBe(true);
    expect(r.totalDrug).toBe(8);
    expect(r.drugVolumeMl).toBeCloseTo(8, 10);
    expect(r.diluentMl).toBeCloseTo(42, 10);
    expect(r.finalConcentration).toBeCloseTo(0.16, 10);
  });
  it("to a target concentration in another mass unit", () => {
    const r = prepareSyringe({ drug: "Test", ampouleAmount: 10, ampouleUnit: "mg", ampouleVolumeMl: 1, finalVolumeMl: 50, targetConcentration: 100, targetUnit: "mcg", mode: "to-concentration" });
    expect(r.ok).toBe(true);
    expect(r.totalDrug).toBeCloseTo(5, 10);
    expect(r.ampoulesUsed).toBeCloseTo(0.5, 10);
    expect(r.drugVolumeMl).toBeCloseTo(0.5, 10);
    expect(r.diluentMl).toBeCloseTo(49.5, 10);
    expect(r.warnings.join(" ")).toMatch(/part of an ampoule/);
  });
  it("errors when the drug volume exceeds the syringe", () => {
    const r = prepareSyringe({ drug: "Test", ampouleAmount: 1, ampouleUnit: "g", ampouleVolumeMl: 20, ampoules: 3, finalVolumeMl: 50, mode: "from-ampoules" });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/more than/);
  });
  it("refuses incompatible target units and missing inputs", () => {
    expect(prepareSyringe({ drug: "T", ampouleAmount: 1000, ampouleUnit: "units", ampouleVolumeMl: 1, finalVolumeMl: 50, targetConcentration: 1, targetUnit: "mg", mode: "to-concentration" }).ok).toBe(false);
    expect(prepareSyringe({ drug: "T", ampouleAmount: null, ampouleUnit: "mg", ampouleVolumeMl: 1, finalVolumeMl: 50, ampoules: 1, mode: "from-ampoules" }).ok).toBe(false);
  });
});

describe("fluids", () => {
  it("Holliday-Segar hourly and daily at the band edges", () => {
    expect(maintenance("holliday-segar", 10).mlPerHour).toBe(40);
    expect(maintenance("holliday-segar", 20).mlPerHour).toBe(60);
    expect(maintenance("holliday-segar", 70).mlPerHour).toBe(110);
    expect(hollidaySegarDaily(10)).toBe(1000);
    expect(hollidaySegarDaily(20)).toBe(1500);
    expect(hollidaySegarDaily(70)).toBe(2500);
  });
  it("per-kg method needs the protocol rate", () => {
    expect(maintenance("per-kg-day", 3).ok).toBe(false);
    const r = maintenance("per-kg-day", 3, 60);
    expect(r.mlPerDay).toBe(180);
    expect(r.mlPerHour).toBeCloseTo(7.5, 10);
  });
  it("rejects missing weight", () => {
    expect(maintenance("holliday-segar", null).ok).toBe(false);
    expect(maintenance("holliday-segar", -5).ok).toBe(false);
  });
  it("deficit", () => {
    expect(deficitMl(12, 5)).toBe(600);
    expect(deficitMl(null, 5)).toBeNull();
    expect(deficitMl(12, 0)).toBeNull();
  });
  it("balance, urine output and fluid overload", () => {
    const start = new Date("2026-01-01T08:00:00Z");
    const end = new Date("2026-01-01T14:00:00Z");
    const e: FluidEntry[] = [
      { id: "1", time: "2026-01-01T09:00:00Z", kind: "iv", volumeMl: 500 },
      { id: "2", time: "2026-01-01T10:30:00Z", kind: "oral", volumeMl: 200 },
      { id: "3", time: "2026-01-01T12:00:00Z", kind: "urine", volumeMl: 210 },
      { id: "4", time: "2026-01-01T13:00:00Z", kind: "drain", volumeMl: 90 },
      { id: "5", time: "2026-01-01T15:00:00Z", kind: "iv", volumeMl: 999 }, // outside the window
    ];
    const s = summariseBalance(e, { start, end, weightKg: 70, admissionWeightKg: 20, carriedInMl: 100 });
    expect(s.intakeMl).toBe(700);
    expect(s.outputMl).toBe(300);
    expect(s.netMl).toBe(400);
    expect(s.cumulativeMl).toBe(500);
    expect(s.hours).toBe(6);
    expect(s.urineMlKgH).toBeCloseTo(210 / 70 / 6, 10);
    expect(s.fluidOverloadPct).toBeCloseTo(2.5, 10);
    expect(s.series[0]).toEqual({ t: 0, net: 100 });
    expect(s.series[s.series.length - 1]).toEqual({ t: 6, net: 500 });
  });
  it("ignores negative and invalid entries", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date("2026-01-02T00:00:00Z");
    const s = summariseBalance(
      [
        { id: "a", time: "bad", kind: "iv", volumeMl: 100 },
        { id: "b", time: "2026-01-01T01:00:00Z", kind: "iv", volumeMl: -100 },
      ],
      { start, end, weightKg: null },
    );
    expect(s.intakeMl).toBe(0);
    expect(s.urineMlKgH).toBeNull();
    expect(s.fluidOverloadPct).toBeNull();
  });
});

describe("formulary", () => {
  const entry: FormularyEntry = {
    id: "x",
    drug: "Test drug",
    population: "adult",
    doseUnit: "mcg/kg/min",
    concentrations: [{ amount: 1, unit: "mg", volumeMl: 50 }],
    softMax: 1,
    hardMax: 2,
    route: "central-only",
    source: "Hospital protocol v1",
  };
  it("requires a source and valid limits", () => {
    expect(validateEntry(entry)).toEqual([]);
    expect(validateEntry({ ...entry, source: "" }).length).toBe(1);
    expect(validateEntry({ ...entry, softMax: 3 }).join(" ")).toMatch(/above the hard maximum/);
    expect(validateEntry({ ...entry, doseUnit: "drops/min" }).length).toBe(1);
  });
  it("round-trips through a file and drops bad entries", () => {
    const text = JSON.stringify(exportFormulary([entry, { ...entry, id: "y", source: "" }]));
    const { entries, problems } = parseFormularyFile(text);
    expect(entries).toHaveLength(1);
    expect(problems).toHaveLength(1);
    expect(parseFormularyFile("not json").problems).toHaveLength(1);
    expect(parseFormularyFile("{}").problems).toHaveLength(1);
  });
});

describe("platform", () => {
  it("has every interface string in both languages", async () => {
    const { _dicts } = await import("../../platform/i18n");
    const en = Object.keys(_dicts.en).sort();
    expect(Object.keys(_dicts.sw).sort()).toEqual(en);
    for (const k of en) expect((_dicts.sw as Record<string, string>)[k].length).toBeGreaterThan(0);
  });
  it("keeps the original PerfCalc links working", async () => {
    const { parseRoute } = await import("../../platform/router");
    expect(parseRoute("#sheet")).toBe("perfusion");
    expect(parseRoute("#drugs")).toBe("perfusion");
    expect(parseRoute("#/perfusion")).toBe("perfusion");
    expect(parseRoute("#/infusion")).toBe("infusion");
    expect(parseRoute("")).toBe("home");
    expect(parseRoute("#/")).toBe("home");
  });
  it("every module has a title, description and status", async () => {
    const { MODULES } = await import("../../platform/modules");
    const { _dicts } = await import("../../platform/i18n");
    const ids = new Set<string>();
    for (const m of MODULES) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
      expect(_dicts.en[m.title]).toBeTruthy();
      expect(_dicts.en[m.description]).toBeTruthy();
      if (m.status !== "ready") expect(m.phase).toBeGreaterThan(0);
    }
    for (const l of "ABCDEFGHIJKL") expect(MODULES.some((m) => m.letter === l)).toBe(true);
  });
});

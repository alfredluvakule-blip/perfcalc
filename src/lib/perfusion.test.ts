import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASE, PAED_EXAMPLE, bsa, bicarbonateDose, cao2, deriveCase, do2, doseForWeight, ebvPerKgDefault,
  flowForDo2i, flowPerKgDefault, hctOnBypass, infusionDose, infusionRate, maintenanceFluid, maxPrimeForHct,
  potassiumDeficit, rbcVolume, svr, tubingMlPerMetre, ultrafiltrationVolume, airway,
} from "./perfusion";
import { ANAESTHESIA_GROUPS, CPB_DRUGS } from "./perfusion-data";

describe("body surface area", () => {
  it("Mosteller 70 kg, 170 cm", () => expect(bsa(70, 170, "mosteller")).toBeCloseTo(1.818, 3));
  it("DuBois 70 kg, 170 cm", () => expect(bsa(70, 170, "dubois")).toBeCloseTo(1.810, 2));
  it("Haycock 3.5 kg, 50 cm", () => expect(bsa(3.5, 50, "haycock")).toBeCloseTo(0.224, 2));
  it("needs both inputs", () => expect(bsa(70, null)).toBeNull());
});

describe("blood volume and flow bands", () => {
  it("EBV per kg", () => {
    expect(ebvPerKgDefault(3, "M")).toBe(85);
    expect(ebvPerKgDefault(10, "M")).toBe(85);
    expect(ebvPerKgDefault(15, "F")).toBe(80);
    expect(ebvPerKgDefault(25, "F")).toBe(75);
    expect(ebvPerKgDefault(35, "F")).toBe(70);
    expect(ebvPerKgDefault(70, "M")).toBe(70);
    expect(ebvPerKgDefault(70, "F")).toBe(65);
  });
  it("flow per kg", () => {
    expect(flowPerKgDefault(2.5)).toBe(200);
    expect(flowPerKgDefault(8)).toBe(150);
    expect(flowPerKgDefault(12)).toBe(125);
    expect(flowPerKgDefault(25)).toBe(100);
    expect(flowPerKgDefault(40)).toBe(75);
    expect(flowPerKgDefault(70)).toBe(65);
  });
});

describe("tubing", () => {
  it("volume per metre", () => {
    expect(tubingMlPerMetre("3/16")).toBeCloseTo(17.8, 1);
    expect(tubingMlPerMetre("1/4")).toBeCloseTo(31.7, 1);
    expect(tubingMlPerMetre("3/8")).toBeCloseTo(71.3, 1);
    expect(tubingMlPerMetre("1/2")).toBeCloseTo(126.7, 1);
  });
});

describe("haemodilution", () => {
  it("adult predicted Hct", () => expect(hctOnBypass(4900, 40, 1400)).toBeCloseTo(31.11, 2));
  it("infant predicted Hct", () => expect(hctOnBypass(425, 36, 350)).toBeCloseTo(19.74, 2));
  it("red cells added on top reach the target exactly", () => {
    const v = rbcVolume(425, 36, 350, 30, 60, "add")!;
    expect(v).toBeCloseTo(265, 0);
    expect((425 * 36 + v * 60) / (425 + 350 + v)).toBeCloseTo(30, 6);
  });
  it("red cells replacing prime reach the target exactly", () => {
    const v = rbcVolume(425, 36, 350, 30, 60, "replace")!;
    expect(v).toBeCloseTo(132.5, 1);
    expect((425 * 36 + v * 60) / (425 + 350)).toBeCloseTo(30, 6);
  });
  it("no red cells when already above target", () => expect(rbcVolume(4900, 40, 1400, 24, 60, "add")).toBe(0));
  it("max prime", () => {
    const p = maxPrimeForHct(4900, 40, 24)!;
    expect(hctOnBypass(4900, 40, p)).toBeCloseTo(24, 6);
  });
  it("ultrafiltration volume", () => {
    const v = ultrafiltrationVolume(1000, 25, 35)!;
    expect(v).toBeCloseTo(285.7, 1);
    expect((1000 * 25) / (1000 - v)).toBeCloseTo(35, 6);
  });
});

describe("oxygen delivery and resistance", () => {
  it("CaO2", () => expect(cao2(8, 100, 200)).toBeCloseTo(11.32, 2));
  it("DO2 and index", () => {
    const d = do2(4.4, 11.32)!;
    expect(d).toBeCloseTo(498.1, 1);
    expect(d / 1.818).toBeCloseTo(274, 0);
  });
  it("flow for DO2i 280", () => {
    const f = flowForDo2i(280, 1.818, 11.32)!;
    expect(do2(f, 11.32)! / 1.818).toBeCloseTo(280, 6);
  });
  it("SVR", () => expect(svr(70, 5, 4.4)).toBeCloseTo(1181.8, 1));
});

describe("drugs and electrolytes", () => {
  it("infusion rate and inverse", () => {
    const r = infusionRate(0.05, 70, 4, 50)!;
    expect(r).toBeCloseTo(2.625, 3);
    expect(infusionDose(r, 70, 4, 50)).toBeCloseTo(0.05, 6);
  });
  it("rule of 6: 6 x kg mg in 100 mL at 1 mL/h = 1 mcg/kg/min", () => {
    expect(infusionDose(1, 12, 6 * 12, 100)).toBeCloseTo(1, 6);
  });
  it("potassium", () => expect(potassiumDeficit(3.2, 4.5, 70, 0.3)).toBeCloseTo(27.3, 1));
  it("potassium never negative", () => expect(potassiumDeficit(5.2, 4.5, 70, 0.3)).toBe(0));
  it("bicarbonate", () => expect(bicarbonateDose(6, 70, 0.3)).toBeCloseTo(126, 6));
  it("4-2-1", () => {
    expect(maintenanceFluid(8)).toBe(32);
    expect(maintenanceFluid(15)).toBe(50);
    expect(maintenanceFluid(25)).toBe(65);
    expect(maintenanceFluid(70)).toBe(110);
  });
  it("airway", () => {
    const a = airway(4, 16);
    expect(a.uncuffed).toBe(5);
    expect(a.cuffed).toBe(4.5);
    expect(a.depthOral).toBe(14);
    expect(a.lma).toBe("2");
    const baby = airway(10 / 12, 8);
    expect(baby.uncuffed).toBe(4);
    expect(baby.cuffed).toBe(3.5);
    expect(baby.depthOral).toBe(12);
    expect(baby.lma).toBe("1.5");
  });
  it("dose rows respect ceilings", () => {
    const neo = ANAESTHESIA_GROUPS.flatMap((g) => g.rows).find((r) => r.drug === "Neostigmine")!;
    expect(doseForWeight(neo, 100, "adult")).toEqual({ text: "4 to 5 mg", capped: true });
    const adr = ANAESTHESIA_GROUPS.flatMap((g) => g.rows).find((r) => r.drug.startsWith("Adrenaline"))!;
    expect(doseForWeight(adr, 8, "paed").text).toBe("80 mcg");
    expect(doseForWeight(adr, 70, "adult").text).toBe("1 mg");
    const man = CPB_DRUGS.find((r) => r.drug === "Mannitol")!;
    expect(doseForWeight(man, 70, "adult").text).toBe("17.5 to 35 g");
  });
});

describe("whole case", () => {
  it("default adult", () => {
    const d = deriveCase(DEFAULT_CASE);
    expect(d.bsa).toBeCloseTo(1.818, 3);
    expect(d.ebv).toBe(4900);
    expect(d.basis).toBe("ci");
    expect(d.flow).toBeCloseTo(4.36, 2);
    expect(d.preset.id).toBe("adult");
    expect(d.prime).toBeCloseTo(260 + 150 + 300 + 142.5 + 253.4 + 114.0, 0);
    expect(d.heparinIU).toBe(21000);
    expect(d.heparinMl).toBeCloseTo(4.2, 6);
    expect(d.protamineMg).toBe(210);
    expect(d.protamineMl).toBe(21);
    expect(d.cpg.volume).toBe(1000);
    expect(d.cpg.capped).toBe(true);
    expect(d.cpg.blood).toBe(200);
    expect(d.cpg.crystalloid).toBe(800);
    expect(d.equip.arterial?.fr).toBe(18);
    expect(d.equip.pack?.venous).toBe("1/2");
    expect(d.equip.twoStage?.size).toBe("32/40 Fr");
    expect(d.rbcMl).toBe(0);
    expect(d.equip.oxygenator?.label).toContain("Adult (to 7");
  });
  it("example infant", () => {
    const d = deriveCase({ ...DEFAULT_CASE, ...PAED_EXAMPLE });
    expect(d.ebv).toBe(680);
    expect(d.basis).toBe("kg");
    expect(d.flow).toBeCloseTo(1.2, 6);
    expect(d.preset.id).toBe("infant");
    expect(d.targetHct).toBe(28);
    expect(d.hctCpb!).toBeLessThan(28);
    expect(d.rbcMl!).toBeGreaterThan(0);
    const after = (680 * 36 + d.rbcMl! * 60) / (680 + d.prime + d.rbcMl!);
    expect(after).toBeCloseTo(28, 6);
    expect(d.heparinIU).toBe(2400);
    expect(d.cpg.volume).toBe(160);
    expect(d.equip.arterial?.fr).toBe(10);
    expect(d.equip.pack?.label).toBe("Infant");
    expect(d.equip.oxygenator?.label).toContain("Neonatal (to 1.5");
  });
  it("manual prime override wins", () => {
    const d = deriveCase({ ...DEFAULT_CASE, primeOverride: 1000 });
    expect(d.prime).toBe(1000);
    expect(d.hctCpb).toBeCloseTo((4900 * 40) / 5900, 6);
  });
  it("empty weight gives no numbers, no crash", () => {
    const d = deriveCase({ ...DEFAULT_CASE, weight: null });
    expect(d.flow).toBeNull();
    expect(d.heparinIU).toBeNull();
    expect(d.cpg.volume).toBeNull();
  });
});

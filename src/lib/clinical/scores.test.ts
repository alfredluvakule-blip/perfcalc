import { describe, expect, it } from "vitest";
import {
  ALDRETE,
  BRADEN,
  GCS,
  MORSE,
  FLACC,
  sofa,
  type SofaInput,
  OPTION_SCORES,
  RASS,
  camIcu,
  news2,
  news2Pulse,
  news2RespRate,
  news2Spo2Scale1,
  news2Spo2Scale2,
  news2Systolic,
  news2Temp,
  scoreTotal,
  type News2Input,
} from "./scores";

describe("option scores are internally consistent", () => {
  for (const def of OPTION_SCORES) {
    it(`${def.short}: bands cover every possible total exactly once`, () => {
      const min = def.items.reduce((s, i) => s + Math.min(...i.options.map((o) => o.points)), 0);
      const max = def.items.reduce((s, i) => s + Math.max(...i.options.map((o) => o.points)), 0);
      for (let t = min; t <= max; t++) {
        expect(def.bands.filter((b) => t >= b.min && t <= b.max)).toHaveLength(1);
      }
    });
    it(`${def.short}: every item has a Kiswahili label and a source`, () => {
      for (const item of def.items) {
        expect(item.sw).toBeTruthy();
        for (const o of item.options) expect(o.sw).toBeTruthy();
      }
      expect(def.meta.sources.length).toBeGreaterThan(0);
    });
  }
  it("published ranges", () => {
    const range = (d: typeof GCS) => [d.items.reduce((s, i) => s + Math.min(...i.options.map((o) => o.points)), 0), d.items.reduce((s, i) => s + Math.max(...i.options.map((o) => o.points)), 0)];
    expect(range(GCS)).toEqual([3, 15]);
    expect(range(RASS)).toEqual([-5, 4]);
    expect(range(BRADEN)).toEqual([6, 23]);
    expect(range(ALDRETE)).toEqual([0, 10]);
    expect(range(MORSE)).toEqual([0, 125]);
    expect(range(FLACC)).toEqual([0, 10]);
  });
});

describe("GCS", () => {
  it("totals and bands", () => {
    const r = scoreTotal(GCS, { E: 3, V: 4, M: 6 });
    expect(r.total).toBe(13);
    expect(r.breakdown).toBe("E3 V4 M6");
    expect(r.band?.label).toMatch(/Mild/);
    expect(scoreTotal(GCS, { E: 1, V: 1, M: 4 }).band?.label).toMatch(/Severe/);
  });
  it("not testable gives no total", () => {
    const r = scoreTotal(GCS, { E: 4, V: "NT", M: 6 });
    expect(r.total).toBeNull();
    expect(r.breakdown).toBe("E4 VNT M6");
    expect(r.notTestable).toEqual(["Verbal response"]);
  });
  it("missing and invalid answers", () => {
    expect(scoreTotal(GCS, { E: 4, M: 6 }).missing).toEqual(["Verbal response"]);
    expect(scoreTotal(GCS, { E: 7, V: 5, M: 6 }).missing).toEqual(["Eye opening"]);
  });
});

describe("Braden and Aldrete bands", () => {
  it("Braden", () => {
    expect(scoreTotal(BRADEN, { S: 4, Mo: 4, A: 4, Mb: 4, N: 4, F: 3 }).band?.label).toMatch(/Not at risk/);
    expect(scoreTotal(BRADEN, { S: 2, Mo: 2, A: 2, Mb: 2, N: 2, F: 2 }).band?.label).toMatch(/High risk/);
    expect(scoreTotal(BRADEN, { S: 1, Mo: 1, A: 1, Mb: 1, N: 1, F: 1 }).band?.label).toMatch(/Very high/);
  });
  it("Aldrete discharge threshold at 9", () => {
    expect(scoreTotal(ALDRETE, { Ac: 2, R: 2, C: 2, Co: 2, O: 1 }).band?.tone).toBe("ok");
    expect(scoreTotal(ALDRETE, { Ac: 2, R: 2, C: 2, Co: 1, O: 1 }).band?.tone).toBe("warn");
  });
});

describe("NEWS2 parameter boundaries (RCP 2017 chart)", () => {
  it("respiration rate", () => {
    expect([8, 9, 11, 12, 20, 21, 24, 25].map(news2RespRate)).toEqual([3, 1, 1, 0, 0, 2, 2, 3]);
  });
  it("SpO2 scale 1", () => {
    expect([91, 92, 93, 94, 95, 96].map(news2Spo2Scale1)).toEqual([3, 2, 2, 1, 1, 0]);
  });
  it("SpO2 scale 2", () => {
    expect([83, 84, 85, 86, 87, 88, 92].map((s) => news2Spo2Scale2(s, true))).toEqual([3, 2, 2, 1, 1, 0, 0]);
    expect([93, 94, 95, 96, 97].map((s) => news2Spo2Scale2(s, true))).toEqual([1, 1, 2, 2, 3]);
    expect([93, 97, 100].map((s) => news2Spo2Scale2(s, false))).toEqual([0, 0, 0]);
  });
  it("systolic", () => {
    expect([90, 91, 100, 101, 110, 111, 219, 220].map(news2Systolic)).toEqual([3, 2, 2, 1, 1, 0, 0, 3]);
  });
  it("pulse", () => {
    expect([40, 41, 50, 51, 90, 91, 110, 111, 130, 131].map(news2Pulse)).toEqual([3, 1, 1, 0, 0, 1, 1, 2, 2, 3]);
  });
  it("temperature", () => {
    expect([35.0, 35.1, 36.0, 36.1, 38.0, 38.1, 39.0, 39.1].map(news2Temp)).toEqual([3, 1, 1, 0, 0, 1, 1, 2]);
  });
});

describe("NEWS2 aggregate", () => {
  const normal: News2Input = { respRate: 16, spo2: 98, spo2Scale: 1, onOxygen: false, systolic: 120, pulse: 75, consciousness: "A", tempC: 37 };
  it("all normal scores 0", () => {
    const r = news2(normal);
    expect(r.total).toBe(0);
    expect(r.risk).toBe("low");
  });
  it("single 3 makes low-medium", () => {
    const r = news2({ ...normal, consciousness: "CVPU" });
    expect(r.total).toBe(3);
    expect(r.risk).toBe("low-medium");
  });
  it("medium and high", () => {
    expect(news2({ ...normal, onOxygen: true, pulse: 115, tempC: 38.5 }).risk).toBe("medium"); // 2 + 2 + 1
    expect(news2({ ...normal, respRate: 26, systolic: 88, onOxygen: true }).risk).toBe("high"); // 3 + 3 + 2
  });
  it("incomplete when anything is missing", () => {
    const r = news2({ ...normal, tempC: null });
    expect(r.complete).toBe(false);
    expect(r.total).toBeNull();
    expect(r.missing).toEqual(["Temperature"]);
    expect(news2({ ...normal, spo2Scale: 2, onOxygen: null }).complete).toBe(false);
  });
});

describe("CAM-ICU", () => {
  it("unable to assess at RASS -4 or -5", () => {
    expect(camIcu({ rass: -4, acuteChange: true, attentionErrors: 5, thinkingErrors: 3 }).result).toBe("unable");
  });
  it("negative without feature 1 or feature 2", () => {
    expect(camIcu({ rass: 0, acuteChange: false, attentionErrors: null, thinkingErrors: null }).result).toBe("negative");
    expect(camIcu({ rass: 0, acuteChange: true, attentionErrors: 2, thinkingErrors: null }).result).toBe("negative");
  });
  it("positive with 1 + 2 + altered RASS", () => {
    expect(camIcu({ rass: -2, acuteChange: true, attentionErrors: 3, thinkingErrors: null }).result).toBe("positive");
  });
  it("RASS 0 needs feature 4", () => {
    expect(camIcu({ rass: 0, acuteChange: true, attentionErrors: 3, thinkingErrors: null }).result).toBe("incomplete");
    expect(camIcu({ rass: 0, acuteChange: true, attentionErrors: 3, thinkingErrors: 2 }).result).toBe("positive");
    expect(camIcu({ rass: 0, acuteChange: true, attentionErrors: 3, thinkingErrors: 1 }).result).toBe("negative");
  });
});

describe("SOFA (Vincent 1996)", () => {
  const base: SofaInput = {
    pao2: 95, pao2Unit: "mmHg", fio2Pct: 21, respSupport: false,
    platelets: 250, bilirubin: 10, bilirubinUnit: "umol/L",
    map: 85, dopamine: null, dobutamine: false, adrenaline: null, noradrenaline: null,
    gcs: 15, creatinine: 80, creatinineUnit: "umol/L", urine24h: null, baseline: null,
  };
  const pts = (i: Partial<SofaInput>, id: string) => sofa({ ...base, ...i }).organs.find((o) => o.id === id)?.points;

  it("normal values score 0", () => {
    const r = sofa(base);
    expect(r.total).toBe(0);
    expect(r.missing).toEqual([]);
  });
  it("respiration needs support for 3 and 4", () => {
    expect(pts({ pao2: 60, fio2Pct: 40, respSupport: false }, "resp")).toBe(2); // P/F 150, no support
    expect(pts({ pao2: 60, fio2Pct: 40, respSupport: true }, "resp")).toBe(3);
    expect(pts({ pao2: 60, fio2Pct: 80, respSupport: true }, "resp")).toBe(4); // P/F 75
    expect(pts({ pao2: 120, fio2Pct: 40, respSupport: false }, "resp")).toBe(1); // 300
    expect(pts({ pao2: 16, pao2Unit: "kPa", fio2Pct: 40, respSupport: true }, "resp")).toBe(1); // 120 mmHg / 0.4 = 300
  });
  it("platelets boundaries", () => {
    expect([150, 149, 100, 99, 50, 49, 20, 19].map((x) => pts({ platelets: x }, "coag"))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it("bilirubin in both units", () => {
    expect([19, 20, 32, 33, 101, 102, 204, 205].map((x) => pts({ bilirubin: x }, "liver"))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    expect([1.1, 1.2, 1.9, 2.0, 5.9, 6.0, 11.9, 12].map((x) => pts({ bilirubin: x, bilirubinUnit: "mg/dL" }, "liver"))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it("cardiovascular", () => {
    expect(pts({ map: 69 }, "cardio")).toBe(1);
    expect(pts({ dobutamine: true }, "cardio")).toBe(2);
    expect(pts({ dopamine: 5 }, "cardio")).toBe(2);
    expect(pts({ dopamine: 6 }, "cardio")).toBe(3);
    expect(pts({ noradrenaline: 0.1 }, "cardio")).toBe(3);
    expect(pts({ noradrenaline: 0.11 }, "cardio")).toBe(4);
    expect(pts({ dopamine: 16 }, "cardio")).toBe(4);
    expect(pts({ map: null }, "cardio")).toBeNull();
  });
  it("GCS bands", () => {
    expect([15, 14, 13, 12, 10, 9, 6, 5, 3].map((g) => pts({ gcs: g }, "cns"))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("renal takes the worse of creatinine and urine", () => {
    expect([109, 110, 170, 171, 299, 300, 440, 441].map((x) => pts({ creatinine: x }, "renal"))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    expect(pts({ creatinine: 150, urine24h: 400 }, "renal")).toBe(3);
    expect(pts({ creatinine: 150, urine24h: 150 }, "renal")).toBe(4);
    expect(pts({ creatinine: null, urine24h: 1500 }, "renal")).toBe(0);
  });
  it("missing organs give no total but a partial sum, and the change from baseline", () => {
    const r = sofa({ ...base, platelets: null, gcs: 9 });
    expect(r.total).toBeNull();
    expect(r.partial).toBe(3);
    expect(r.missing).toEqual(["Coagulation"]);
    expect(sofa({ ...base, gcs: 9, baseline: 0 }).delta).toBe(3);
  });
});

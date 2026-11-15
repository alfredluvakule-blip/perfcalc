import { describe, expect, it } from "vitest";
import { ASA_CLASSES, FORMS, MALLAMPATI, NPIAP_STAGES, filledCount, nextTurnDue, turnCompliance, type PressureState } from "./forms";

describe("forms", () => {
  it("every form is bilingual, sourced and has unique field ids", () => {
    for (const f of FORMS) {
      expect(f.source.length).toBeGreaterThan(20);
      const ids = f.sections.flatMap((s) => s.fields.map((x) => x.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of f.sections) {
        expect(s.title.sw).toBeTruthy();
        for (const x of s.fields) {
          expect(x.label.sw).toBeTruthy();
          if (x.kind === "choice") for (const o of x.options) expect(o.label.sw).toBeTruthy();
        }
      }
    }
  });
  it("published classifications are complete", () => {
    expect(ASA_CLASSES.map((a) => a.value)).toEqual(["I", "II", "III", "IV", "V", "VI"]);
    expect(MALLAMPATI.map((a) => a.value)).toEqual(["I", "II", "III", "IV"]);
    expect(NPIAP_STAGES.map((a) => a.value)).toEqual(["1", "2", "3", "4", "U", "DTPI", "MDRPI", "MMPI"]);
  });
  it("counts filled fields; false checks and blank text do not count", () => {
    const f = FORMS[0];
    const { total } = filledCount(f, {});
    expect(filledCount(f, {}).filled).toBe(0);
    expect(filledCount(f, { procedure: "Hernia repair", consent: false, allergies: "  ", weight: 0 }).filled).toBe(2);
    expect(total).toBeGreaterThan(10);
  });
});

describe("repositioning", () => {
  const base: PressureState = { bed: "4", braden: 12, intervalMin: 120, mattress: "", nutrition: "", turns: [], wounds: [] };
  it("next turn is last turn plus interval, and needs both", () => {
    expect(nextTurnDue(base)).toBeNull();
    const s = { ...base, turns: [{ id: "a", at: "2026-01-01T08:00:00.000Z", position: "L" }, { id: "b", at: "2026-01-01T10:00:00.000Z", position: "R" }] };
    expect(nextTurnDue(s)?.toISOString()).toBe("2026-01-01T12:00:00.000Z");
    expect(nextTurnDue({ ...s, intervalMin: null })).toBeNull();
  });
  it("daily compliance", () => {
    const at = (h: number, m = 0) => ({ id: `${h}${m}`, at: new Date(Date.UTC(2026, 0, 1, h, m)).toISOString(), position: "x" });
    const r = turnCompliance([at(8), at(10), at(12, 30), at(14), at(9 + 24)], new Date(Date.UTC(2026, 0, 1, 8)), 120);
    expect(r.count).toBe(4);
    expect(r.expected).toBe(12);
    expect(r.longestGapMin).toBe(150);
    expect(r.lateTurns).toBe(1);
    expect(turnCompliance([], new Date(), null)).toEqual({ count: 0, expected: null, longestGapMin: null, lateTurns: 0 });
  });
});

import { describe, expect, it } from "vitest";
import { CHARTS, INTRAOP_VITALS, chartToCsv, nowHHMM, sortRows, type ChartRow } from "./charts";

describe("charts", () => {
  it("every column has a Kiswahili label and unique id; every chart cites a source", () => {
    for (const c of CHARTS) {
      expect(c.source.length).toBeGreaterThan(20);
      const ids = c.columns.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const col of c.columns) expect(col.label.sw).toBeTruthy();
    }
  });
  it("formats the time", () => {
    expect(nowHHMM(new Date(2026, 0, 1, 7, 5))).toBe("07:05");
  });
  it("sorts and exports CSV with units and escaping", () => {
    const rows: ChartRow[] = [
      { id: "b", time: "10:15", hr: 80, note: 'Bolus, "fluids"' },
      { id: "a", time: "10:00", hr: 72, sbp: 120, note: null },
    ];
    expect(sortRows(rows).map((r) => r.id)).toEqual(["a", "b"]);
    const csv = chartToCsv(INTRAOP_VITALS, rows).trim().split("\n");
    expect(csv[0]).toBe("Time,Heart rate (/min),Systolic (mmHg),Diastolic (mmHg),MAP (mmHg),SpO₂ (%),EtCO₂ (kPa or mmHg),Resp. rate (/min),Temp (°C),\"Drugs, events, notes\"");
    expect(csv[1]).toBe("10:00,72,120,,,,,,,");
    expect(csv[2]).toBe('10:15,80,,,,,,,,"Bolus, ""fluids"""');
  });
});

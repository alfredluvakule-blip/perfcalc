import { describe, expect, it } from "vitest";
import { BUILT_IN, REQUESTED, SBAR, WHO_SSC, itemsFromLines, linesFromItems, parseChecklistFile, progress, validateChecklist, completionRate } from "./checklists";

describe("built-in checklists", () => {
  it("are valid, sourced and fully bilingual with unique item ids", () => {
    for (const c of BUILT_IN) {
      expect(validateChecklist(c)).toEqual([]);
      const ids = c.sections.flatMap((s) => s.items.map((i) => i.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const sec of c.sections) {
        expect(sec.title.sw).toBeTruthy();
        for (const it of sec.items) expect(it.text.sw).toBeTruthy();
      }
    }
  });
  it("WHO checklist has the three published phases", () => {
    expect(WHO_SSC.sections.map((s) => s.id)).toEqual(["sign-in", "time-out", "sign-out"]);
    expect(WHO_SSC.sections.map((s) => s.items.length)).toEqual([7, 7, 5]);
  });
  it("lists every checklist named in the brief", () => {
    expect(REQUESTED.filter((r) => r.category === "icu")).toHaveLength(18);
    expect(REQUESTED.filter((r) => r.category === "anaesthesia")).toHaveLength(15);
    // WHO checklist itself is built in, so 9 more theatre titles plus SBAR built in leaves 9 nursing titles.
    expect(REQUESTED.filter((r) => r.category === "theatre")).toHaveLength(9);
    expect(REQUESTED.filter((r) => r.category === "nursing")).toHaveLength(9);
  });
});

describe("progress", () => {
  it("counts ticks and text answers", () => {
    expect(progress(SBAR, {}).done).toBe(0);
    const p = progress(SBAR, { s1: "Bed 4, new hypotension", b1: "  ", a1: "BP 80/40", r1: "Review in 15 min" });
    expect(p.done).toBe(3);
    expect(p.outstanding.map((o) => o.section)).toEqual(["Background"]);
    const all = Object.fromEntries(WHO_SSC.sections.flatMap((s) => s.items.map((i) => [i.id, true])));
    expect(progress(WHO_SSC, all).complete).toBe(true);
    expect(progress(WHO_SSC, { ...all, so2: false }).complete).toBe(false);
  });
});

describe("hospital checklists", () => {
  it("parses one item per line with optional Kiswahili", () => {
    const items = itemsFromLines("Check A | Angalia A\n\n  Check B  \n");
    expect(items).toEqual([
      { id: "i1", text: { en: "Check A", sw: "Angalia A" } },
      { id: "i2", text: { en: "Check B", sw: "" } },
    ]);
    expect(linesFromItems(items)).toBe("Check A | Angalia A\nCheck B");
  });
  it("requires title, version, source and items", () => {
    const bad = { id: "x", title: { en: "", sw: "" }, version: "", source: "", sections: [] };
    expect(validateChecklist(bad as never).length).toBe(4);
  });
  it("imports a file and rejects bad entries", () => {
    const good = { ...WHO_SSC, id: "h1", origin: "built-in" };
    const text = JSON.stringify({ format: "nurseanaesthesia-pro/checklists", version: 1, exportedOn: "", checklists: [good, { ...good, source: "" }] });
    const r = parseChecklistFile(text);
    expect(r.checklists).toHaveLength(1);
    expect(r.checklists[0].origin).toBe("hospital");
    expect(r.problems).toHaveLength(1);
    expect(parseChecklistFile("[]").problems).toHaveLength(1);
  });
  it("completion rate", () => {
    expect(completionRate([])).toBeNull();
    const rec = (done: number) => ({ id: "r", checklistId: "c", title: "t", version: "1", at: "", done, total: 4, outstanding: [] });
    expect(completionRate([rec(4), rec(3)])).toBe(50);
  });
});

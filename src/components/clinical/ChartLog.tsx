import { useState } from "react";
import { Download, Plus, Printer, Trash2 } from "lucide-react";
import { chartToCsv, nowHHMM, sortRows, type ChartDef, type ChartRow } from "@/lib/clinical/charts";
import { newId } from "@/lib/clinical/audit";
import { useI18n } from "@/platform/i18n";
import { Button, Pill } from "@/components/calculators/shared";

/* A timed chart: one row per observation time. Kept only while the app is open;
   print or export to file it. Records values; does not judge them. */

export default function ChartLog({ def, rows, onChange }: { def: ChartDef; rows: ChartRow[]; onChange: (r: ChartRow[]) => void }) {
  const { lang } = useI18n();
  const L = (x: { en: string; sw: string }) => (lang === "sw" && x.sw ? x.sw : x.en);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const sorted = sortRows(rows);
  const update = (id: string, key: string, value: string | number | null) => onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const download = () => {
    const blob = new Blob([chartToCsv(def, rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${def.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="primary" icon={Plus} onClick={() => onChange([...rows, { id: newId(), time: nowHHMM() }])}>
          Add row now
        </Button>
        <Button
          icon={Printer}
          onClick={() => {
            setPrintedAt(new Date().toLocaleString("en-GB"));
            setTimeout(() => window.print(), 50);
          }}
        >
          Print or save as PDF
        </Button>
        <Button icon={Download} onClick={download} disabled={!rows.length}>
          Export for Excel (CSV)
        </Button>
        <Pill tone="info">{rows.length} {rows.length === 1 ? "row" : "rows"}</Pill>
      </div>
      <p className="text-xs text-muted-foreground print:hidden">Kept only while the app is open. Edit the time if the reading was taken earlier. Scroll sideways on a phone.</p>
      <section className="rounded-lg border bg-card p-3 print:border-0 print:p-0">
        <h2 className="mb-2 text-lg font-bold">{L(def.title)}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-1 py-1 font-medium">Time</th>
                {def.columns.map((c) => (
                  <th key={c.id} className="px-1 py-1 align-bottom font-medium">
                    {L(c.label)}
                    {c.unit ? <span className="block font-normal">{c.unit}</span> : null}
                  </th>
                ))}
                <th className="print:hidden" aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={def.columns.length + 2} className="px-1 py-4 text-center text-muted-foreground">
                    No observations yet. Press “Add row now”.
                  </td>
                </tr>
              ) : null}
              {sorted.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="sticky left-0 z-10 bg-card px-1 py-1">
                    <input aria-label="Time" type="time" value={r.time} onChange={(e) => update(r.id, "time", e.target.value)} className="h-10 w-[6.5rem] rounded border border-input bg-background px-1 tabular-nums" />
                  </td>
                  {def.columns.map((c) => {
                    const v = r[c.id];
                    return (
                      <td key={c.id} className="px-1 py-1">
                        <input
                          aria-label={`${c.label.en} at ${r.time}`}
                          inputMode={c.kind === "number" ? "decimal" : undefined}
                          value={v === null || v === undefined ? "" : String(v)}
                          onChange={(e) => {
                            const s = e.target.value;
                            if (c.kind === "text") return update(r.id, c.id, s);
                            if (s.trim() === "") return update(r.id, c.id, null);
                            const num = Number(s.replace(",", "."));
                            update(r.id, c.id, Number.isFinite(num) && !/[.,]$/.test(s) ? num : s);
                          }}
                          className={`h-10 rounded border border-input bg-background px-1.5 tabular-nums ${c.wide ? "w-44" : "w-16"}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 print:hidden">
                    <button type="button" aria-label={`Remove row ${r.time}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} className="grid h-10 w-10 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {L(def.title)} v{def.version}. {def.source}
          {printedAt ? ` Printed ${printedAt}.` : ""}
        </p>
      </section>
    </div>
  );
}

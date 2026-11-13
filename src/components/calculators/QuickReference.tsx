import { useState } from "react";
import { ArrowLeftRight, BookOpen, FileText, Sigma, Thermometer } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt } from "@/lib/perfusion";
import { CPB_TARGETS, FORMULAS, HYPOTHERMIA_LEVELS, SOURCES, TEMPERATURE_RULES } from "@/lib/perfusion-data";
import { cn } from "@/lib/utils";
import { Grid, KeyValueTable, Note, NumberField, Panel, Result, SelectField, TabIntro } from "./shared";

interface Conversion {
  id: string;
  label: string;
  from: string;
  to: string;
  convert: (x: number) => number;
  back: (x: number) => number;
}

const CONVERSIONS: Conversion[] = [
  { id: "glucose", label: "Glucose", from: "mmol/L", to: "mg/dL", convert: (x) => x * 18.016, back: (x) => x / 18.016 },
  { id: "lactate", label: "Lactate", from: "mmol/L", to: "mg/dL", convert: (x) => x * 9.01, back: (x) => x / 9.01 },
  { id: "creatinine", label: "Creatinine", from: "µmol/L", to: "mg/dL", convert: (x) => x / 88.4, back: (x) => x * 88.4 },
  { id: "pressure", label: "Pressure", from: "kPa", to: "mmHg", convert: (x) => x * 7.50062, back: (x) => x / 7.50062 },
  { id: "hb", label: "Haemoglobin to haematocrit", from: "g/dL", to: "%", convert: (x) => x * 3, back: (x) => x / 3 },
  { id: "temp", label: "Temperature", from: "°C", to: "°F", convert: (x) => (x * 9) / 5 + 32, back: (x) => ((x - 32) * 5) / 9 },
  { id: "weight", label: "Weight", from: "kg", to: "lb", convert: (x) => x * 2.20462, back: (x) => x / 2.20462 },
  { id: "length", label: "Length", from: "cm", to: "in", convert: (x) => x / 2.54, back: (x) => x * 2.54 },
];

const QuickReference = () => {
  const { state: s } = useCase();
  const paed = s.group === "paed";
  const [convId, setConvId] = useState(CONVERSIONS[0].id);
  const [value, setValue] = useState<number | null>(5.5);
  const [reverse, setReverse] = useState(false);
  const conv = CONVERSIONS.find((c) => c.id === convId)!;
  const result = value === null ? null : reverse ? conv.back(value) : conv.convert(value);

  return (
    <div className="space-y-4">
      <TabIntro>Targets and limits to keep in view during a case. The column for the current patient type is highlighted.</TabIntro>

      <Panel title="Targets on bypass" icon={BookOpen}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Parameter</th>
                <th className={cn("px-3 py-2 text-left font-semibold", !paed && "text-primary")}>Adult</th>
                <th className={cn("px-3 py-2 text-left font-semibold", paed && "text-primary")}>Paediatric</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CPB_TARGETS.map((row) => (
                <tr key={row.parameter}>
                  <td className="px-3 py-2 text-muted-foreground">{row.parameter}</td>
                  <td className={cn("px-3 py-2 tabular-nums", !paed ? "bg-accent/50 font-medium" : "")}>{row.adult}</td>
                  <td className={cn("px-3 py-2 tabular-nums", paed ? "bg-accent/50 font-medium" : "")}>{row.paed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Temperature" icon={Thermometer}>
        <KeyValueTable head={["Rule", "Limit"]} rows={TEMPERATURE_RULES.map((r) => [r.rule, r.value])} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HYPOTHERMIA_LEVELS.map((h) => (
            <Result key={h.level} label={`${h.level} hypothermia`} value={h.range} />
          ))}
        </div>
        <Note>Hypothermia bands are named differently between textbooks and arch-surgery consensus papers; use the definitions in your protocol.</Note>
      </Panel>

      <Panel title="Unit converter" icon={ArrowLeftRight}>
        <Grid cols={3}>
          <SelectField
            label="Convert"
            value={convId}
            onChange={(v) => {
              setConvId(v);
              setValue(null);
            }}
            options={CONVERSIONS.map((c) => ({ value: c.id, label: c.label }))}
            className="col-span-2 sm:col-span-1"
          />
          <NumberField label="Value" unit={reverse ? conv.to : conv.from} value={value} onChange={setValue} allowNegative={conv.id === "temp"} />
          <Result label="Result" value={fmt(result, 2)} unit={reverse ? conv.from : conv.to} tone="info" />
        </Grid>
        <button
          type="button"
          onClick={() => setReverse((r) => !r)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Swap direction: now {reverse ? `${conv.to} to ${conv.from}` : `${conv.from} to ${conv.to}`}
        </button>
      </Panel>

      <Panel title="Formulas used in this app" icon={Sigma}>
        <dl className="divide-y rounded-md border text-sm">
          {FORMULAS.map((f) => (
            <div key={f.name} className="grid gap-x-3 gap-y-0.5 px-3 py-2 sm:grid-cols-[14rem_1fr]">
              <dt className="text-muted-foreground">{f.name}</dt>
              <dd className="font-mono text-xs leading-relaxed sm:text-[13px]">{f.formula}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Sources and assumptions" icon={FileText}>
        <ul className="max-w-[75ch] list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {SOURCES.map((src) => (
            <li key={src}>{src}</li>
          ))}
        </ul>
        <Note tone="warn">
          Every default in this app is a starting value to be checked against the hospital's own protocols and the equipment's instructions for use.
        </Note>
      </Panel>
    </div>
  );
};

export default QuickReference;

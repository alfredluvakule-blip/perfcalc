import { useState } from "react";
import { Brain, Calculator, ClipboardPlus } from "lucide-react";
import { CAMICU_META, NEWS2_META, OPTION_SCORES, camIcu, news2, scoreTotal, type Answers, type News2Input, type ScoreDef } from "@/lib/clinical/scores";
import { logAudit } from "@/lib/clinical/audit";
import { cn } from "@/lib/utils";
import { useI18n } from "@/platform/i18n";
import { Button, Grid, Note, NumberField, Panel, Pill, Result, Segmented, TextField } from "@/components/calculators/shared";
import { InputsTable, SourceBox, Steps, Warnings } from "@/components/clinical/CalcReport";

const toneMap = { ok: "ok", info: "info", warn: "warn", alert: "alert" } as const;

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function RecordBar({ summary }: { summary: string | null }) {
  const [by, setBy] = useState("");
  const [at, setAt] = useState<string | null>(null);
  if (!summary) return null;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField label="Assessed by (initials)" value={by} onChange={setBy} className="w-40" />
      <Button
        icon={ClipboardPlus}
        onClick={() => {
          logAudit("score-recorded", summary, by);
          setAt(new Date().toLocaleTimeString("en-GB"));
        }}
      >
        Record in the audit log
      </Button>
      {at ? <span className="text-xs text-muted-foreground">Recorded at {at}</span> : null}
    </div>
  );
}

function OptionScore({ def }: { def: ScoreDef }) {
  const { lang } = useI18n();
  const [a, setA] = useState<Answers>({});
  const r = scoreTotal(def, a);
  const label = (en: string, sw?: string) => (lang === "sw" && sw ? sw : en);

  return (
    <div className="space-y-4">
      <Note>{def.population}</Note>
      {def.items.map((item) => (
        <Panel key={item.id} title={label(item.label, item.sw)} aside={typeof a[item.id] === "number" ? <Pill tone="info">{String(a[item.id])}</Pill> : a[item.id] === "NT" ? <Pill>NT</Pill> : null}>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.options.map((o) => (
              <Choice key={o.points} selected={a[item.id] === o.points} onClick={() => setA({ ...a, [item.id]: o.points })}>
                <span className="w-7 shrink-0 font-semibold tabular-nums">{o.points > 0 && def.id === "rass" ? `+${o.points}` : o.points}</span>
                <span>{label(o.label, o.sw)}</span>
              </Choice>
            ))}
            {item.allowNotTestable ? (
              <Choice selected={a[item.id] === "NT"} onClick={() => setA({ ...a, [item.id]: "NT" })}>
                <span className="w-7 shrink-0 font-semibold">NT</span>
                <span>Not testable (record the reason)</span>
              </Choice>
            ) : null}
          </div>
        </Panel>
      ))}
      <Panel title={`${def.short} result`} icon={Calculator} aside={<Button onClick={() => setA({})} className="h-8 text-xs">Clear</Button>}>
        {r.missing.length ? <Note tone="warn">Still to score: {r.missing.join(", ")}.</Note> : null}
        {r.notTestable.length ? <Note tone="warn">Not testable: {r.notTestable.join(", ")}. No total is given; report the components ({r.breakdown}).</Note> : null}
        {r.total !== null ? (
          <Grid cols={2}>
            <Result big tone={r.band ? toneMap[r.band.tone] : "neutral"} label={def.short} value={String(r.total)} sub={def.id === "gcs" ? r.breakdown : undefined} />
            <Result label="Category" value={r.band?.label ?? "—"} tone={r.band ? toneMap[r.band.tone] : "neutral"} />
          </Grid>
        ) : null}
        {r.band?.action ? <Warnings items={[{ severity: r.band.tone === "alert" ? "caution" : "info", text: r.band.action }]} /> : null}
        {r.total !== null ? <Steps formula={`${def.short} = ${def.items.map((i) => i.label.toLowerCase()).join(" + ")}`} steps={[`${def.items.map((i) => a[i.id]).join(" + ")} = ${r.total}`]} /> : null}
        <RecordBar summary={r.total !== null ? `${def.short} ${r.total}${def.id === "gcs" ? ` (${r.breakdown})` : ""}: ${r.band?.label ?? ""}` : r.notTestable.length && !r.missing.length ? `${def.short} ${r.breakdown}` : null} />
      </Panel>
      <SourceBox meta={def.meta} />
    </div>
  );
}

function News2() {
  const [i, setI] = useState<News2Input>({ respRate: null, spo2: null, spo2Scale: 1, onOxygen: null, systolic: null, pulse: null, consciousness: null, tempC: null });
  const r = news2(i);
  const riskTone = r.risk === "high" ? "alert" : r.risk === "medium" ? "warn" : r.risk === "low-medium" ? "warn" : "ok";
  return (
    <div className="space-y-4">
      <Note>{NEWS2_META.population}</Note>
      <Panel title="Observations" icon={Calculator}>
        <Grid cols={3}>
          <NumberField label="Respiration rate" unit="/min" value={i.respRate} onChange={(v) => setI({ ...i, respRate: v })} />
          <NumberField label="SpO₂" unit="%" value={i.spo2} onChange={(v) => setI({ ...i, spo2: v })} />
          <Segmented label="Air or oxygen" value={i.onOxygen === null ? "" : i.onOxygen ? "o2" : "air"} onChange={(v) => setI({ ...i, onOxygen: v === "o2" })} options={[{ value: "air", label: "Air" }, { value: "o2", label: "Oxygen" }]} />
          <NumberField label="Systolic BP" unit="mmHg" value={i.systolic} onChange={(v) => setI({ ...i, systolic: v })} />
          <NumberField label="Pulse" unit="/min" value={i.pulse} onChange={(v) => setI({ ...i, pulse: v })} />
          <NumberField label="Temperature" unit="°C" value={i.tempC} onChange={(v) => setI({ ...i, tempC: v })} />
          <Segmented
            label="Consciousness (ACVPU)"
            value={i.consciousness ?? ""}
            onChange={(v) => setI({ ...i, consciousness: v as "A" | "CVPU" })}
            options={[{ value: "A", label: "Alert" }, { value: "CVPU", label: "New confusion, V, P or U" }]}
            className="col-span-2"
          />
          <Segmented
            label="SpO₂ scale"
            value={String(i.spo2Scale) as "1" | "2"}
            onChange={(v) => setI({ ...i, spo2Scale: v === "2" ? 2 : 1 })}
            options={[{ value: "1", label: "Scale 1" }, { value: "2", label: "Scale 2" }]}
          />
        </Grid>
        {i.spo2Scale === 2 ? <Note tone="warn">Scale 2 is only for confirmed hypercapnic respiratory failure, decided and documented by a clinician.</Note> : null}
      </Panel>
      <Panel title="NEWS2 result" icon={Calculator}>
        {!r.complete ? <Note tone="warn">Still to enter: {r.missing.join(", ")}.</Note> : null}
        {r.complete ? (
          <>
            <Grid cols={2}>
              <Result big tone={riskTone} label="NEWS2" value={String(r.total)} />
              <Result label="Clinical risk" tone={riskTone} value={r.risk === "low-medium" ? "Low-medium (single 3)" : (r.risk ?? "—").replace(/^./, (c) => c.toUpperCase())} />
            </Grid>
            <Warnings items={[{ severity: r.risk === "high" || r.risk === "medium" ? "caution" : "info", text: r.response ?? "" }]} />
          </>
        ) : null}
        <InputsTable rows={r.parts.map((p) => [p.name, `${p.value} → ${p.points ?? "—"}`])} />
        <RecordBar summary={r.complete ? `NEWS2 ${r.total} (${r.risk})` : null} />
      </Panel>
      <SourceBox meta={NEWS2_META} />
    </div>
  );
}

function CamIcu() {
  const [rass, setRass] = useState<number | null>(null);
  const [f1, setF1] = useState<boolean | null>(null);
  const [att, setAtt] = useState<number | null>(null);
  const [think, setThink] = useState<number | null>(null);
  const r = camIcu({ rass, acuteChange: f1, attentionErrors: att, thinkingErrors: think });
  const yn = (v: boolean | null) => (v === null ? "" : v ? "yes" : "no");
  return (
    <div className="space-y-4">
      <Note>{CAMICU_META.population}</Note>
      <Panel title="CAM-ICU" icon={Brain}>
        <Grid cols={2}>
          <NumberField label="Current RASS (−5 to +4)" value={rass} onChange={setRass} allowNegative />
          <Segmented label="1. Acute change or fluctuating course" value={yn(f1)} onChange={(v) => setF1(v === "yes")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          <NumberField label="2. Inattention: errors in the letters test (out of 10)" value={att} onChange={setAtt} hint="More than 2 errors = present" />
          <NumberField label="4. Disorganised thinking: errors (questions + command)" value={think} onChange={setThink} hint="More than 1 error = present. Only needed when RASS is 0." />
        </Grid>
        <Result
          big
          tone={r.result === "positive" ? "alert" : r.result === "negative" ? "ok" : "warn"}
          label="CAM-ICU"
          value={r.result === "positive" ? "Positive" : r.result === "negative" ? "Negative" : r.result === "unable" ? "Unable to assess" : "Incomplete"}
          sub={r.explanation}
        />
        <Steps
          formula="delirium = feature 1 AND feature 2 AND (feature 3 OR feature 4)"
          steps={[
            `Feature 1 (acute change): ${r.features.f1 === null ? "—" : r.features.f1 ? "present" : "absent"}`,
            `Feature 2 (inattention, >2 errors): ${r.features.f2 === null ? "—" : r.features.f2 ? "present" : "absent"}`,
            `Feature 3 (RASS not 0): ${r.features.f3 === null ? "—" : r.features.f3 ? "present" : "absent"}`,
            `Feature 4 (disorganised thinking, >1 error): ${r.features.f4 === null ? "—" : r.features.f4 ? "present" : "absent"}`,
          ]}
        />
        <RecordBar summary={r.result === "positive" || r.result === "negative" || r.result === "unable" ? `CAM-ICU ${r.result} (RASS ${rass})` : null} />
      </Panel>
      <SourceBox meta={CAMICU_META} />
    </div>
  );
}

const TOOLS = [
  { id: "gcs", label: "GCS" },
  { id: "news2", label: "NEWS2" },
  { id: "rass", label: "RASS" },
  { id: "cam", label: "CAM-ICU" },
  { id: "braden", label: "Braden" },
  { id: "aldrete", label: "Aldrete" },
  { id: "morse", label: "Morse falls" },
];

export default function ScoresModule({ initial }: { initial?: string }) {
  const [tool, setTool] = useState(initial && TOOLS.some((t) => t.id === initial) ? initial : "gcs");
  const def = OPTION_SCORES.find((d) => d.id === tool);
  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Score">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tool === t.id}
            onClick={() => setTool(t.id)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tool === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tool === "news2" ? <News2 /> : tool === "cam" ? <CamIcu /> : def ? <OptionScore key={def.id} def={def} /> : null}
      <Note>SOFA, APACHE II and paediatric scores are planned next. Scores support clinical judgment and local escalation policy; they do not replace them.</Note>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Droplets, LineChart, Plus, Printer, Scale, Trash2 } from "lucide-react";
import { FLUID_KINDS, deficitMl, directionOf, maintenance, summariseBalance, type FluidEntry, type FluidKind, type MaintenanceMethod } from "@/lib/clinical/fluids";
import { CONTENT } from "@/lib/clinical/content";
import { newId } from "@/lib/clinical/audit";
import { show } from "@/lib/clinical/units";
import { Button, Grid, Note, NumberField, Panel, Result, Segmented, SelectField } from "@/components/calculators/shared";
import { Errors, InputsTable, SourceBox, Steps } from "@/components/clinical/CalcReport";

const KIND_LABEL: Record<FluidKind, string> = {
  iv: "IV fluid",
  oral: "Oral",
  enteral: "Enteral feed",
  blood: "Blood product",
  "other-in": "Other intake",
  urine: "Urine",
  drain: "Drain",
  vomit: "Vomit",
  ng: "NG aspirate",
  stool: "Stool",
  "other-out": "Other loss",
};

function localInput(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/* ---------------- maintenance and deficit ---------------- */

function Maintenance() {
  const [weight, setWeight] = useState<number | null>(null);
  const [method, setMethod] = useState<MaintenanceMethod>("holliday-segar");
  const [perKgDay, setPerKgDay] = useState<number | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const m = maintenance(method, weight, perKgDay);
  const def = deficitMl(weight, percent);

  return (
    <div className="space-y-4">
      <Panel title="Maintenance fluid" icon={Droplets}>
        <Grid cols={2}>
          <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} />
          <SelectField
            label="Method"
            value={method}
            onChange={(v) => setMethod(v as MaintenanceMethod)}
            options={[
              { value: "holliday-segar", label: "Holliday-Segar (4-2-1), not neonates" },
              { value: "per-kg-day", label: "mL/kg/day from local protocol" },
            ]}
          />
        </Grid>
        {method === "per-kg-day" ? (
          <NumberField label="Protocol rate" unit="mL/kg/day" value={perKgDay} onChange={setPerKgDay} hint="For neonates, use the unit's rate for the day of life. Nothing is pre-filled." />
        ) : (
          <Note>Holliday-Segar is a starting estimate for children beyond the neonatal period and, by weight, adults. Acutely ill patients often need less: follow the local protocol.</Note>
        )}
        <Errors items={m.errors} />
        {m.ok ? (
          <>
            <Grid cols={2}>
              <Result big tone="info" label="Maintenance" value={show(m.mlPerHour, 1)} unit="mL/h" />
              <Result big label="Per 24 hours" value={show(m.mlPerDay, 0)} unit="mL/day" />
            </Grid>
            <Steps steps={m.steps} />
          </>
        ) : null}
        <SourceBox meta={CONTENT.maintenance} />
      </Panel>

      <Panel title="Deficit from % dehydration" icon={Scale}>
        <Grid cols={2}>
          <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} />
          <NumberField label="Estimated dehydration" unit="%" value={percent} onChange={setPercent} hint="Clinical estimate or from a recent known weight" />
        </Grid>
        {def !== null ? (
          <>
            <Result big tone="info" label="Fluid deficit" value={show(def, 0)} unit="mL" />
            <Steps formula="deficit (mL) = weight (kg) × % dehydration × 10" steps={[`${show(weight)} kg × ${show(percent)} % × 10 = ${show(def, 0)} mL`]} />
          </>
        ) : (
          <Note tone="warn">Enter weight and % dehydration.</Note>
        )}
        <SourceBox meta={CONTENT.deficit} />
      </Panel>
    </div>
  );
}

/* ---------------- fluid balance chart ---------------- */

interface BalanceState {
  entries: FluidEntry[];
  weight: number | null;
  admissionWeight: number | null;
  carriedIn: number | null;
  start: string;
  hours: number | null;
}

const BAL_KEY = "nap-fluid-balance-v1";

function defaultStart(): string {
  const d = new Date();
  d.setHours(d.getHours() < 8 ? -16 : 8, 0, 0, 0);
  return localInput(d);
}

function loadBalance(): BalanceState {
  try {
    const raw = window.localStorage.getItem(BAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { entries: [], weight: null, admissionWeight: null, carriedIn: null, start: defaultStart(), hours: 24 };
}

function BalanceChart({ series, hours }: { series: { t: number; net: number }[]; hours: number }) {
  const W = 640;
  const H = 200;
  const pad = { l: 52, r: 12, t: 12, b: 28 };
  const vals = series.map((p) => p.net);
  const max = Math.max(100, ...vals);
  const min = Math.min(-100, ...vals);
  const x = (t: number) => pad.l + (t / Math.max(hours, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((max - v) / (max - min)) * (H - pad.t - pad.b);
  const path = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.net).toFixed(1)}`).join(" ");
  const ticks = [max, 0, min];
  const hourTicks = Array.from({ length: Math.floor(hours / 4) + 1 }, (_, i) => i * 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Cumulative net fluid balance by hour">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-foreground/50" : "stroke-border"} strokeWidth={1} />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
            {v > 0 ? "+" : ""}
            {Math.round(v)}
          </text>
        </g>
      ))}
      {hourTicks.map((h) => (
        <text key={h} x={x(h)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {h}h
        </text>
      ))}
      <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
      {series.map((p) => (
        <circle key={p.t} cx={x(p.t)} cy={y(p.net)} r={2.5} className="fill-primary" />
      ))}
    </svg>
  );
}

function Balance() {
  const [b, setB] = useState<BalanceState>(loadBalance);
  const [kind, setKind] = useState<FluidKind>("iv");
  const [vol, setVol] = useState<number | null>(null);
  const [time, setTime] = useState(() => localInput(new Date()));

  useEffect(() => {
    try {
      window.localStorage.setItem(BAL_KEY, JSON.stringify(b));
    } catch {
      /* ignore */
    }
  }, [b]);

  const start = new Date(b.start);
  const hours = b.hours && b.hours > 0 ? b.hours : 24;
  const end = new Date(start.getTime() + hours * 3_600_000);
  const s = useMemo(() => summariseBalance(b.entries, { start, end, weightKg: b.weight, admissionWeightKg: b.admissionWeight, carriedInMl: b.carriedIn }), [b]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    if (vol === null || vol < 0) return;
    const t = new Date(time);
    if (!Number.isFinite(t.getTime())) return;
    setB({ ...b, entries: [...b.entries, { id: newId(), time: t.toISOString(), kind, volumeMl: vol }] });
    setVol(null);
    setTime(localInput(new Date()));
  };

  const outside = b.entries.length - b.entries.filter((e) => { const t = new Date(e.time).getTime(); return t >= start.getTime() && t <= end.getTime(); }).length;
  const sorted = [...b.entries].sort((a, c) => c.time.localeCompare(a.time));

  return (
    <div className="space-y-4">
      <Panel title="Chart period and patient" icon={Scale} aside={<Button icon={Printer} onClick={() => window.print()}>Print</Button>}>
        <Grid cols={3}>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="nap-bal-start">
              Chart starts
            </label>
            <input id="nap-bal-start" type="datetime-local" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <NumberField label="Period" unit="h" value={b.hours} onChange={(v) => setB({ ...b, hours: v })} />
          <NumberField label="Weight now" unit="kg" value={b.weight} onChange={(v) => setB({ ...b, weight: v })} className="col-span-2 sm:col-span-1" />
          <NumberField label="Admission weight" unit="kg" value={b.admissionWeight} onChange={(v) => setB({ ...b, admissionWeight: v })} hint="For % fluid overload" />
          <NumberField label="Balance carried in" unit="mL" value={b.carriedIn} onChange={(v) => setB({ ...b, carriedIn: v })} allowNegative hint="Cumulative from earlier days, + or −" className="col-span-2 sm:col-span-2" />
        </Grid>
      </Panel>

      <Panel title="Add intake or output" icon={Plus}>
        <Grid cols={4}>
          <SelectField label="Type" value={kind} onChange={(v) => setKind(v as FluidKind)} options={FLUID_KINDS.map((k) => ({ value: k.kind, label: `${k.direction === "in" ? "In" : "Out"}: ${KIND_LABEL[k.kind]}` }))} className="col-span-2" />
          <NumberField label="Volume" unit="mL" value={vol} onChange={setVol} />
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="nap-bal-time">
              Time
            </label>
            <input id="nap-bal-time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm" />
          </div>
        </Grid>
        <Button variant="primary" icon={Plus} onClick={add} disabled={vol === null}>
          Add entry
        </Button>
      </Panel>

      <Panel title="Balance" icon={LineChart}>
        <Grid cols={4}>
          <Result label="Intake" value={show(s.intakeMl, 0)} unit="mL" />
          <Result label="Output" value={show(s.outputMl, 0)} unit="mL" />
          <Result big tone={s.netMl > 0 ? "info" : s.netMl < 0 ? "warn" : "neutral"} label="Net this period" value={`${s.netMl > 0 ? "+" : ""}${show(s.netMl, 0)}`} unit="mL" />
          <Result label="Cumulative" value={`${s.cumulativeMl > 0 ? "+" : ""}${show(s.cumulativeMl, 0)}`} unit="mL" sub={b.carriedIn ? `includes ${show(b.carriedIn, 0)} mL carried in` : undefined} />
          <Result label="Urine output" value={show(s.urineMlKgH, 2)} unit="mL/kg/h" sub={s.urineMlKgH === null ? "Needs weight now" : `${show(s.urineMl, 0)} mL over ${show(s.hours, 1)} h`} className="col-span-2" />
          <Result label="Fluid overload" value={show(s.fluidOverloadPct, 1)} unit="%" sub={s.fluidOverloadPct === null ? "Needs admission weight" : "Cumulative (in − out) ÷ admission weight"} className="col-span-2" />
        </Grid>
        {outside > 0 ? <Note tone="warn">{outside} entr{outside === 1 ? "y is" : "ies are"} outside this chart period and not counted.</Note> : null}
        <BalanceChart series={s.series} hours={s.hours || hours} />
        <InputsTable
          rows={FLUID_KINDS.filter((k) => s.byKind[k.kind]).map((k) => [`${k.direction === "in" ? "In" : "Out"}: ${KIND_LABEL[k.kind]}`, `${show(s.byKind[k.kind], 0)} mL`])}
        />
        <Steps
          formula="net = intake − output · urine output = urine ÷ weight ÷ hours · % overload = (cumulative mL ÷ 1000) ÷ admission kg × 100"
          steps={[
            `Net = ${show(s.intakeMl, 0)} − ${show(s.outputMl, 0)} = ${show(s.netMl, 0)} mL`,
            ...(s.urineMlKgH !== null ? [`Urine = ${show(s.urineMl, 0)} mL ÷ ${show(b.weight)} kg ÷ ${show(s.hours, 1)} h = ${show(s.urineMlKgH, 2)} mL/kg/h`] : []),
            ...(s.fluidOverloadPct !== null ? [`Overload = ${show(s.cumulativeMl / 1000, 3)} L ÷ ${show(b.admissionWeight)} kg × 100 = ${show(s.fluidOverloadPct, 1)} %`] : []),
          ]}
        />
        <SourceBox meta={CONTENT.balance} />
      </Panel>

      <Panel
        title={`Entries (${b.entries.length})`}
        icon={Droplets}
        aside={
          b.entries.length ? (
            <Button icon={Trash2} onClick={() => setB({ ...b, entries: [], carriedIn: null })} className="h-8 text-xs">
              Clear chart
            </Button>
          ) : null
        }
      >
        {sorted.length ? (
          <div className="divide-y rounded-md border text-sm">
            {sorted.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{new Date(e.time).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="min-w-0 flex-1">{KIND_LABEL[e.kind]}</span>
                <span className={`font-semibold tabular-nums ${directionOf(e.kind) === "in" ? "text-primary" : "text-amber-700 dark:text-amber-400"}`}>
                  {directionOf(e.kind) === "in" ? "+" : "−"}
                  {show(e.volumeMl, 0)} mL
                </span>
                <button type="button" aria-label="Delete entry" onClick={() => setB({ ...b, entries: b.entries.filter((x) => x.id !== e.id) })} className="flex h-9 w-9 items-center justify-center rounded hover:bg-muted">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Note>No entries yet. Entries are kept on this device only and hold no names.</Note>
        )}
      </Panel>
    </div>
  );
}

export default function FluidsModule() {
  const [tab, setTab] = useState<"balance" | "maintenance">("balance");
  return (
    <div className="space-y-4">
      <Segmented
        label="Tool"
        value={tab}
        onChange={setTab}
        options={[
          { value: "balance", label: "Fluid balance chart" },
          { value: "maintenance", label: "Maintenance and deficit" },
        ]}
      />
      {tab === "balance" ? <Balance /> : <Maintenance />}
    </div>
  );
}

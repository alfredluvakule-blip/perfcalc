import { useState } from "react";
import { Cable, ChevronDown, ClipboardCheck, GitBranch, Siren, Waves, Wrench } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt } from "@/lib/perfusion";
import {
  ARTERIAL_CANNULAE,
  EMERGENCIES,
  OXYGENATOR_CLASSES,
  PRE_BYPASS_CHECKLIST,
  TECHNIQUES,
  TUBING_PACKS,
  VENOUS_CANNULAE,
  WEANING_CHECKLIST,
} from "@/lib/perfusion-data";
import { cn } from "@/lib/utils";
import { Button, Grid, NeedPatient, Note, NumberField, Panel, Pill, Result, TabIntro } from "./shared";

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */

function FlowTable<T extends { maxFlow: number }>({
  rows,
  picked,
  head,
  label,
}: {
  rows: T[];
  picked: T | null;
  head: [string, string];
  label: (row: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <div className="grid grid-cols-2 gap-3 bg-muted/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={label(row)} className={cn("grid grid-cols-2 gap-3 px-3 py-1.5 tabular-nums", row === picked && "bg-accent/70 font-semibold")}>
            <span>{label(row)}</span>
            <span>{Number.isFinite(row.maxFlow) ? `to ${fmt(row.maxFlow, 2)} L/min` : "above"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const EquipmentCalculation = () => {
  const { state: s, derived: d } = useCase();
  if (s.weight === null || d.flow === null) return <NeedPatient what="weight and height" />;
  const e = d.equip;

  return (
    <div className="space-y-4">
      <TabIntro>
        Circuit and cannula sizes for a full flow of {fmt(d.flow, 2)} L/min. Each pick is the smallest size whose listed capacity covers that flow; the oxygenator also keeps a 20% reserve.
      </TabIntro>

      <Panel title="Suggested for this patient" icon={Wrench} aside={<Pill tone="info">Flow {fmt(d.flow, 2)} L/min</Pill>}>
        <Grid cols={2} className="sm:grid-cols-2 lg:grid-cols-4">
          <Result label="Oxygenator" value={e.oxygenator ? e.oxygenator.label.split(" (")[0] : "Above listed range"} sub={e.oxygenator ? `Rated to ${fmt(e.oxygenator.maxFlow, 1)} L/min, keeping a 20% reserve. e.g. ${e.oxygenator.examples}` : "Use the largest adult device or check the flow"} tone={e.oxygenator ? "neutral" : "alert"} className="col-span-2 lg:col-span-1" />
          <Result
            label="Arterial × venous line"
            value={e.pack ? `${e.pack.arterial}" × ${e.pack.venous}"` : "—"}
            sub={e.pack ? `${e.pack.label} pack` : undefined}
          />
          <Result
            label="Arterial cannula"
            value={e.arterial ? `${e.arterial.fr} Fr` : "Above range"}
            sub={e.arterial ? `Listed to ${fmt(e.arterial.maxFlow, 1)} L/min` : undefined}
            tone={e.arterial ? "neutral" : "alert"}
          />
          <Result
            label="Venous cannulae"
            value={e.bicaval ? `${e.bicaval.fr} Fr × 2` : "—"}
            sub={
              s.group === "adult" && e.twoStage
                ? `Bicaval, half flow each. Single two-stage: ${e.twoStage.size}`
                : "Bicaval, half of full flow through each"
            }
            className="col-span-2 lg:col-span-1"
          />
        </Grid>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-hidden="true" /> Arterial: oxygenated blood to the patient
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-700 dark:bg-blue-400" aria-hidden="true" /> Venous: drainage to the reservoir
          </span>
        </div>
        <Note tone="warn">
          Cannula capacities here are generic approximations. Confirm every size against the manufacturer's pressure-flow chart for the cannula in
          stock, and against the surgeon's preference and the vessel.
        </Note>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Arterial cannulae" icon={Cable}>
          <FlowTable rows={ARTERIAL_CANNULAE} picked={e.arterial} head={["Size", "Approximate flow"]} label={(r) => `${r.fr} Fr`} />
        </Panel>
        <Panel title="Venous cannulae, single stage" icon={Cable}>
          <FlowTable rows={VENOUS_CANNULAE} picked={e.bicaval} head={["Size", "Gravity drainage, each"]} label={(r) => `${r.fr} Fr`} />
        </Panel>
        <Panel title="Tubing pack by flow" icon={Waves}>
          <FlowTable rows={TUBING_PACKS} picked={e.pack} head={["Arterial × venous", "Full flow"]} label={(r) => `${r.arterial}" × ${r.venous}" · ${r.label}`} />
        </Panel>
        <Panel title="Oxygenator class by flow" icon={Waves}>
          <div className="divide-y rounded-md border text-sm">
            {OXYGENATOR_CLASSES.map((o) => (
              <div key={o.label} className={cn("px-3 py-2", o === e.oxygenator && "bg-accent/70")}>
                <div className={cn(o === e.oxygenator && "font-semibold")}>{o.label}</div>
                <div className="text-xs text-muted-foreground">e.g. {o.examples}</div>
              </div>
            ))}
          </div>
          <Note>Device names are examples only. Check the rated flow, prime volume and reservoir limits in the instructions for use.</Note>
        </Panel>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Techniques                                                          */
/* ------------------------------------------------------------------ */

function Checklist({ title, items }: { title: string; items: string[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  const complete = count === items.length;
  return (
    <Panel
      title={title}
      icon={ClipboardCheck}
      aside={
        <div className="flex items-center gap-2">
          <Pill tone={complete ? "ok" : "neutral"}>
            {count} of {items.length}
          </Pill>
          <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setDone(items.map(() => false))}>
            Clear
          </Button>
        </div>
      }
    >
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60">
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span className={cn(done[i] && "text-muted-foreground line-through")}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export const CpbTechniques = () => {
  const { state: s } = useCase();
  const [open, setOpen] = useState<string | null>(TECHNIQUES[3].id);
  const [mufRate, setMufRate] = useState<number | null>(15);
  const [acpRate, setAcpRate] = useState<number | null>(null);

  const w = s.weight;
  const acpDefault = s.group === "adult" ? 10 : 40;
  const acpUsed = acpRate ?? acpDefault;

  return (
    <div className="space-y-4">
      <TabIntro>Short reminders for common bypass techniques, with the weight-based figures worked out for the current patient.</TabIntro>

      <Panel title="Flows for this patient" icon={GitBranch}>
        <Grid cols={4}>
          <NumberField label="MUF blood flow" unit="mL/kg/min" value={mufRate} onChange={setMufRate} hint="Usual 10 to 20" />
          <Result label="MUF pump flow" value={w && mufRate ? fmt(w * mufRate, 0) : "—"} unit="mL/min" sub="For 10 to 20 min" tone="info" />
          <NumberField label="Cerebral perfusion" unit="mL/kg/min" value={acpRate} onChange={setAcpRate} placeholder={`${acpDefault} auto`} hint={s.group === "adult" ? "Adult 8 to 12" : "Infant 30 to 50"} />
          <Result label="Antegrade cerebral flow" value={w ? fmt(w * acpUsed, 0) : "—"} unit="mL/min" tone="info" />
        </Grid>
        {w === null ? <NeedPatient /> : null}
      </Panel>

      <Panel title="Techniques" icon={GitBranch}>
        <div className="divide-y rounded-md border">
          {TECHNIQUES.map((t) => {
            const isOpen = open === t.id;
            return (
              <div key={t.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span>
                    <span className="block text-sm font-semibold">{t.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.summary}</span>
                  </span>
                  <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
                {isOpen ? (
                  <ul className="list-disc space-y-1.5 px-3 pb-3 pl-8 text-sm">
                    {t.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Checklist title="Before bypass" items={PRE_BYPASS_CHECKLIST} />
        <Checklist title="Before weaning" items={WEANING_CHECKLIST} />
      </div>

      <Panel title="Emergency prompts" icon={Siren}>
        <div className="grid gap-3 md:grid-cols-2">
          {EMERGENCIES.map((em) => (
            <div key={em.title} className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">{em.title}</h3>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm">
                {em.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <Note tone="warn">These are memory prompts, not a protocol. Follow the unit's own emergency procedures and drills.</Note>
      </Panel>
    </div>
  );
};

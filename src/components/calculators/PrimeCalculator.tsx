import { Beaker, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt, tubingMlPerMetre, tubingVolume } from "@/lib/perfusion";
import { CIRCUIT_PRESETS, PRIME_PART_LABELS, TUBING_SIZES, type PrimeParts, type TubingSize } from "@/lib/perfusion-data";
import { cn } from "@/lib/utils";
import { Button, Formula, Grid, Note, NumberField, Panel, Pill, Result, SelectField, TabIntro } from "./shared";

const sizeOptions = TUBING_SIZES.map((size) => ({ value: size, label: `${size}"` }));

const PrimeCalculator = () => {
  const { state: s, derived: d, set, editPrime, loadPreset } = useCase();

  const partKeys = Object.keys(PRIME_PART_LABELS) as (keyof PrimeParts)[];
  const partSum = partKeys.reduce((sum, k) => sum + (d.primeParts[k] ?? 0), 0);
  const tubeSum = d.primeTubing.reduce((sum, t) => sum + tubingVolume(t.size, t.lengthCm), 0);

  return (
    <div className="space-y-4">
      <TabIntro>
        Build the prime volume from the circuit in use, or type a known total. The total feeds the haemodilution estimate and the prime additives.
      </TabIntro>

      <Panel
        title="Circuit prime volume"
        icon={Beaker}
        aside={s.primeAuto ? <Pill tone="info">Following patient size</Pill> : <Pill>Edited circuit</Pill>}
      >
        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Circuit</span>
          <div className="flex flex-wrap gap-2">
            {CIRCUIT_PRESETS.map((p) => {
              const active = d.preset.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => loadPreset(p.id)}
                  className={cn(
                    "h-10 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
            {!s.primeAuto ? (
              <Button variant="ghost" onClick={() => set({ primeAuto: true, primeOverride: null })}>
                Follow patient size
              </Button>
            ) : null}
          </div>
          {!s.primeAuto && d.suggestedPreset.id !== d.preset.id ? (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              For a flow of {fmt(d.flow, 2)} L/min the {d.suggestedPreset.label.toLowerCase()} circuit is the usual size.
            </p>
          ) : null}
        </div>

        <Grid cols={3}>
          <Result
            big
            tone="info"
            label="Total prime"
            value={fmt(d.prime, 0)}
            unit="mL"
            sub={s.primeOverride !== null ? `Typed total. Built-up figure is ${fmt(d.primeComputed, 0)} mL` : d.ebv ? `${fmt((d.prime / d.ebv) * 100, 0)}% of blood volume` : undefined}
            className="col-span-2 sm:col-span-1"
          />
          <Result label="Predicted Hct on bypass" value={fmt(d.hctCpb, 1)} unit="%" tone={d.hctCpb !== null && d.hctCpb < d.targetHct ? "warn" : "neutral"} sub={`Target ${fmt(d.targetHct)}%`} />
          <NumberField
            label="Or type a known total"
            unit="mL"
            value={s.primeOverride}
            onChange={(v) => set({ primeOverride: v })}
            placeholder="optional"
            hint="Leave empty to use the built-up figure"
          />
        </Grid>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Components · {fmt(partSum, 0)} mL</h3>
            <div className="grid grid-cols-2 gap-3">
              {partKeys.map((key) => (
                <NumberField
                  key={key}
                  label={PRIME_PART_LABELS[key]}
                  unit="mL"
                  allowNegative={key === "other"}
                  value={d.primeParts[key]}
                  onChange={(v) => editPrime((parts) => ({ parts: { ...parts, [key]: v } }))}
                />
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tubing · {fmt(tubeSum, 0)} mL</h3>
            <div className="space-y-2">
              {d.primeTubing.map((row) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_4.75rem_5.5rem_auto] items-end gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.label}</div>
                    <div className="text-[11px] tabular-nums text-muted-foreground">{fmt(tubingVolume(row.size, row.lengthCm), 0)} mL</div>
                  </div>
                  <SelectField<TubingSize>
                    label="Size"
                    value={row.size}
                    onChange={(size) => editPrime((_, tubing) => ({ tubing: tubing.map((t) => (t.id === row.id ? { ...t, size } : t)) }))}
                    options={sizeOptions}
                  />
                  <NumberField
                    label="Length"
                    unit="cm"
                    value={row.lengthCm}
                    onChange={(lengthCm) => editPrime((_, tubing) => ({ tubing: tubing.map((t) => (t.id === row.id ? { ...t, lengthCm } : t)) }))}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${row.label}`}
                    onClick={() => editPrime((_, tubing) => ({ tubing: tubing.filter((t) => t.id !== row.id) }))}
                    className="flex h-11 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              icon={Plus}
              onClick={() =>
                editPrime((_, tubing) => ({
                  tubing: [...tubing, { id: `t${Date.now()}`, label: `Extra line ${tubing.length + 1}`, size: "1/4", lengthCm: 100 }],
                }))
              }
            >
              Add tubing
            </Button>
            <Formula>
              mL per metre: {TUBING_SIZES.filter((t) => t !== "1/8").map((t) => `${t}" ${fmt(tubingMlPerMetre(t), 1)}`).join(" · ")}
            </Formula>
          </div>
        </div>

        <Note tone="warn">
          The preset volumes are generic. Replace them with the static prime printed on your oxygenator, filter and tubing pack; the app remembers
          your figures on this device.
        </Note>
      </Panel>

      <Panel title="Prime additives" icon={FlaskConical}>
        <Grid cols={3}>
          <NumberField label="Heparin in prime" unit="IU per L" value={s.primeHeparinPerL} onChange={(v) => set({ primeHeparinPerL: v })} />
          <NumberField label="Mannitol" unit="g/kg" value={s.mannitolGPerKg} onChange={(v) => set({ mannitolGPerKg: v })} hint="Usual range 0.25 to 0.5" />
          <NumberField
            label="Sodium bicarbonate 8.4%"
            unit="mL per L"
            value={s.primeBicarbMlPerL}
            onChange={(v) => set({ primeBicarbMlPerL: v })}
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Grid cols={3}>
          <Result label="Heparin" value={fmt(d.primeHeparinIU, 0)} unit="IU" sub={d.primeHeparinIU !== null ? `${fmt(d.primeHeparinIU / s.heparinVial, 2)} mL of ${fmt(s.heparinVial, 0)} IU/mL` : undefined} />
          <Result label="Mannitol 20%" value={d.mannitolG !== null ? fmt(d.mannitolG * 5, 0) : "—"} unit="mL" sub={d.mannitolG !== null ? `${fmt(d.mannitolG, 1)} g` : "Needs weight"} />
          <Result label="Sodium bicarbonate 8.4%" value={fmt(d.primeBicarbMl, 0)} unit="mL" sub={d.primeBicarbMl !== null ? `${fmt(d.primeBicarbMl, 0)} mEq` : undefined} className="col-span-2 sm:col-span-1" />
        </Grid>
        {d.rbcMl ? (
          <Result
            tone="warn"
            label="Red cells for the prime"
            value={fmt(d.rbcMl, 0)}
            unit="mL"
            sub={`To reach ${fmt(d.targetHct)}% on bypass. Details in the Hemodilution tab.`}
          />
        ) : null}
        <Note>These three defaults are placeholders for your own prime recipe. Set them once to match the BMH protocol and they stay set.</Note>
      </Panel>
    </div>
  );
};

export default PrimeCalculator;

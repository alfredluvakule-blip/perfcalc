import { useState } from "react";
import { Activity, Gauge, Wind } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { cao2, do2, flowForDo2i, fmt, svr } from "@/lib/perfusion";
import { CI_OPTIONS, DO2I, FLOW_PER_KG_BANDS } from "@/lib/perfusion-data";
import { cn } from "@/lib/utils";
import { Formula, Grid, NeedPatient, Note, NumberField, Panel, Pill, Result, Segmented, TabIntro, type Tone } from "./shared";

const FlowCalculator = () => {
  const { state: s, derived: d, set } = useCase();

  // Oxygen delivery: start from the values this case predicts, let the user overwrite them.
  const [hb, setHb] = useState<number | null>(null);
  const [sao2, setSao2] = useState<number | null>(100);
  const [pao2, setPao2] = useState<number | null>(200);
  const [pumpFlow, setPumpFlow] = useState<number | null>(null);
  const [map, setMap] = useState<number | null>(65);
  const [cvp, setCvp] = useState<number | null>(5);

  const hbUsed = hb ?? (d.hctCpb !== null ? d.hctCpb / 3 : null);
  const flowUsed = pumpFlow ?? d.flow;
  const content = cao2(hbUsed, sao2, pao2);
  const delivery = do2(flowUsed, content);
  const do2i = delivery !== null && d.bsa ? delivery / d.bsa : null;
  const flowNeeded = flowForDo2i(DO2I.target, d.bsa, content);
  const resistance = svr(map, cvp, flowUsed);

  // The published thresholds come from adults, so a child is never shown as "at target" on them.
  const adult = s.group === "adult";
  const do2Tone: Tone =
    do2i === null ? "neutral" : do2i < DO2I.critical ? "alert" : do2i < DO2I.target ? "warn" : adult ? "ok" : "info";
  const do2Label =
    do2i === null
      ? ""
      : do2i < DO2I.critical
        ? "Below the adult critical value"
        : do2i < DO2I.target
          ? "Near the adult critical range"
          : adult
            ? "At or above target"
            : "Above adult threshold: compare with your paediatric target";

  if (s.weight === null) return <NeedPatient what="weight and height" />;

  const band = FLOW_PER_KG_BANDS.find((b) => s.weight! <= b.maxKg)!;

  return (
    <div className="space-y-4">
      <TabIntro>Full pump flow for this patient, from body surface area or from weight. The figure chosen here sizes the circuit and cannulae in the other tabs.</TabIntro>

      <Panel
        title="Full flow"
        icon={Activity}
        aside={
          <Segmented
            label="Flow basis"
            value={d.basis}
            onChange={(v) => set({ flowBasis: v })}
            options={[
              { value: "ci", label: "By BSA" },
              { value: "kg", label: "By weight" },
            ]}
            className="w-56 [&>span]:sr-only"
          />
        }
      >
        <Grid cols={4}>
          <Result
            big
            tone="info"
            label="Target flow"
            value={fmt(d.flow, 2)}
            unit="L/min"
            sub={d.flow !== null ? `${fmt(d.flow * 1000, 0)} mL/min` : undefined}
            className="col-span-2"
          />
          <Result label="BSA" value={fmt(d.bsa, 2)} unit="m²" sub={s.height === null ? "Needs height" : s.bsaFormula} />
          <Result label="Blood volume" value={fmt(d.ebv, 0)} unit="mL" sub={`${fmt(d.ebvPerKg)} mL/kg`} />
        </Grid>

        {d.basis === "ci" ? (
          <>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Cardiac index (L/min/m²): tap to select</span>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {CI_OPTIONS.map((ci) => {
                  const active = Math.abs(ci - d.ci) < 0.001;
                  return (
                    <button
                      key={ci}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set({ ci })}
                      className={cn(
                        "rounded-md border px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                      )}
                    >
                      <div className="text-xs font-medium opacity-80">CI {ci.toFixed(1)}</div>
                      <div className="text-base font-semibold tabular-nums">{d.bsa ? fmt(d.bsa * ci, 2) : "—"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <Formula>
              flow = BSA × CI = {fmt(d.bsa, 2)} × {fmt(d.ci)} = {fmt(d.flowCi, 2)} L/min
            </Formula>
            <Note>
              Typical full flow at normothermia is 2.2 to 2.4 L/min/m² in adults and 2.6 to 3.0 in children. Lower indices are used with hypothermia
              according to protocol.
            </Note>
          </>
        ) : (
          <>
            <Grid cols={3}>
              <NumberField
                label="Flow per kg"
                unit="mL/kg/min"
                value={s.flowPerKg}
                onChange={(v) => set({ flowPerKg: v })}
                placeholder={`${band.mlKgMin} auto`}
                hint={`Default for ${Number.isFinite(band.maxKg) ? `up to ${band.maxKg} kg` : "over 55 kg"}`}
              />
              <Result label="By weight" value={fmt(d.flowKg, 2)} unit="L/min" />
              <Result label={`By BSA, CI ${fmt(d.ci)}`} value={fmt(d.flowCi, 2)} unit="L/min" sub="For comparison" className="col-span-2 sm:col-span-1" />
            </Grid>
            <Formula>
              flow = weight × mL/kg/min = {fmt(s.weight)} × {fmt(d.flowPerKg)} = {fmt(d.flowKg !== null ? d.flowKg * 1000 : null, 0)} mL/min
            </Formula>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Weight</th>
                    <th className="px-3 py-2 text-left font-semibold">mL/kg/min</th>
                    <th className="px-3 py-2 text-left font-semibold">This patient</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {FLOW_PER_KG_BANDS.map((b, i) => {
                    const from = i === 0 ? 0 : FLOW_PER_KG_BANDS[i - 1].maxKg;
                    const here = b === band;
                    return (
                      <tr key={b.maxKg} className={here ? "bg-accent/60 font-semibold" : undefined}>
                        <td className="px-3 py-1.5">{Number.isFinite(b.maxKg) ? `${from} to ${b.maxKg} kg` : `Over ${from} kg`}</td>
                        <td className="px-3 py-1.5">{b.mlKgMin}</td>
                        <td className="px-3 py-1.5">{here ? `${fmt((s.weight! * b.mlKgMin) / 1000, 2)} L/min` : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Oxygen delivery on bypass" icon={Wind} aside={do2i !== null ? <Pill tone={do2Tone}>{do2Label}</Pill> : null}>
        <Grid cols={4}>
          <NumberField
            label="Hb on bypass"
            unit="g/dL"
            value={hb}
            onChange={setHb}
            placeholder={hbUsed !== null ? `${fmt(hbUsed, 1)} auto` : ""}
            hint="Empty uses the predicted value"
          />
          <NumberField label="SaO₂" unit="%" value={sao2} onChange={setSao2} />
          <NumberField label="PaO₂" unit="mmHg" value={pao2} onChange={setPao2} />
          <NumberField
            label="Pump flow now"
            unit="L/min"
            value={pumpFlow}
            onChange={setPumpFlow}
            placeholder={d.flow !== null ? `${fmt(d.flow, 2)} auto` : ""}
            hint="Empty uses the target flow"
          />
        </Grid>
        <Grid cols={4}>
          <Result big tone={do2Tone} label="DO₂ index" value={fmt(do2i, 0)} unit="mL/min/m²" sub={d.bsa === null ? "Needs height for BSA" : undefined} className="col-span-2" />
          <Result label="DO₂" value={fmt(delivery, 0)} unit="mL/min" sub={`CaO₂ ${fmt(content, 1)} mL/dL`} />
          <Result label={`Flow for DO₂i ${DO2I.target}`} value={fmt(flowNeeded, 2)} unit="L/min" />
        </Grid>
        <Formula>
          CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂ · DO₂ = flow × CaO₂ × 10 · DO₂i = DO₂ ÷ BSA
        </Formula>
        <Note>
          Adult studies link a lowest DO₂i below about {DO2I.critical} to 272 mL/min/m² with kidney injury; {DO2I.target} is a common goal-directed
          target. Thresholds for children are less established and probably higher.
        </Note>
      </Panel>

      <Panel title="Vascular resistance on bypass" icon={Gauge}>
        <Grid cols={3}>
          <NumberField label="Mean arterial pressure" unit="mmHg" value={map} onChange={setMap} />
          <NumberField label="CVP" unit="mmHg" value={cvp} onChange={setCvp} />
          <Result label="SVR" value={fmt(resistance, 0)} unit="dyn·s·cm⁻⁵" sub={s.group === "adult" ? "Adult range about 800 to 1200" : undefined} className="col-span-2 sm:col-span-1" />
        </Grid>
        <Formula>SVR = (MAP − CVP) × 80 ÷ flow</Formula>
      </Panel>
    </div>
  );
};

export default FlowCalculator;

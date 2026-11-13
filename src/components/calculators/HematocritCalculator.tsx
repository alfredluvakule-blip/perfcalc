import { useState } from "react";
import { Droplets, Filter } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt, hctOnBypass, ultrafiltrationVolume } from "@/lib/perfusion";
import { Formula, Grid, NeedPatient, Note, NumberField, Panel, Pill, Result, Segmented, TabIntro, type Tone } from "./shared";

const HematocritCalculator = () => {
  const { state: s, derived: d, set } = useCase();

  const [extraFluid, setExtraFluid] = useState<number | null>(null);
  const [ufHctNow, setUfHctNow] = useState<number | null>(null);
  const [ufTarget, setUfTarget] = useState<number | null>(null);
  const [ufVolume, setUfVolume] = useState<number | null>(null);

  if (s.weight === null || s.hct === null) return <NeedPatient what="weight and haematocrit" />;

  const primeAndFluid = d.prime + (extraFluid ?? 0);
  const hctWithFluid = extraFluid ? hctOnBypass(d.ebv, s.hct, primeAndFluid) : null;
  const below = d.hctCpb !== null && d.hctCpb < d.targetHct;
  const tone: Tone = d.hctCpb === null ? "neutral" : below ? (d.hctCpb < d.targetHct - 4 ? "alert" : "warn") : "ok";

  const circulating = (d.ebv ?? 0) + d.prime + (d.rbcMl && s.rbcMode === "add" ? d.rbcMl : 0);
  const ufNow = ufHctNow ?? d.hctCpb;
  const ufGoal = ufTarget ?? (s.group === "paed" ? 40 : 30);
  const ufTotal = ufVolume ?? circulating;
  const ufRemove = ultrafiltrationVolume(ufTotal, ufNow, ufGoal);

  return (
    <div className="space-y-4">
      <TabIntro>
        Predicted haematocrit once the patient's blood mixes with the prime, and the red cells needed to stay at the target. Prime volume comes from
        the Prime Volume tab.
      </TabIntro>

      <Panel
        title="Haematocrit on bypass"
        icon={Droplets}
        aside={<Pill tone={tone}>{below ? "Below target" : "At or above target"}</Pill>}
      >
        <Grid cols={4}>
          <Result
            big
            tone={tone}
            label="Predicted Hct on bypass"
            value={fmt(d.hctCpb, 1)}
            unit="%"
            sub={d.hctCpb !== null ? `Hb about ${fmt(d.hctCpb / 3, 1)} g/dL` : undefined}
            className="col-span-2"
          />
          <Result label="Blood volume" value={fmt(d.ebv, 0)} unit="mL" sub={`${fmt(d.ebvPerKg)} mL/kg`} />
          <Result label="Prime volume" value={fmt(d.prime, 0)} unit="mL" sub={s.primeOverride !== null ? "Typed total" : `${d.preset.label} circuit`} />
        </Grid>
        <Formula>
          Hct = (EBV × Hct) ÷ (EBV + prime) = ({fmt(d.ebv, 0)} × {fmt(s.hct)}) ÷ ({fmt(d.ebv, 0)} + {fmt(d.prime, 0)}) = {fmt(d.hctCpb, 1)}%
        </Formula>

        <Grid cols={3}>
          <NumberField
            label="Target Hct on bypass"
            unit="%"
            value={s.targetHct}
            onChange={(v) => set({ targetHct: v })}
            placeholder={`${d.targetHct} auto`}
          />
          <NumberField label="Donor red cell Hct" unit="%" value={s.donorHct} onChange={(v) => set({ donorHct: v })} hint="Packed cells are usually 55 to 70%" />
          <Segmented
            label="Red cells are"
            value={s.rbcMode}
            onChange={(v) => set({ rbcMode: v })}
            options={[
              { value: "add", label: "Added" },
              { value: "replace", label: "Replacing prime" },
            ]}
            className="col-span-2 sm:col-span-1"
          />
        </Grid>

        <Grid cols={3}>
          <Result
            tone={d.rbcMl ? "warn" : "ok"}
            label="Red cells needed"
            value={d.rbcMl === null ? "—" : d.rbcMl === 0 ? "None" : fmt(d.rbcMl, 0)}
            unit={d.rbcMl ? "mL" : undefined}
            sub={d.rbcMl ? `${fmt(d.rbcMl / s.weight, 1)} mL/kg, to reach ${fmt(d.targetHct)}%` : `Predicted Hct meets ${fmt(d.targetHct)}%`}
          />
          <Result
            label="Largest clear prime"
            value={fmt(d.maxPrime, 0)}
            unit="mL"
            sub={`Keeps Hct at ${fmt(d.targetHct)}% without blood`}
          />
          <Result
            label="Prime as share of blood volume"
            value={d.ebv ? fmt((d.prime / d.ebv) * 100, 0) : "—"}
            unit="%"
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Formula>
          {s.rbcMode === "add"
            ? "red cells = (target × (EBV + prime) − EBV × Hct) ÷ (donor Hct − target)"
            : "red cells = (target × (EBV + prime) − EBV × Hct) ÷ donor Hct"}
        </Formula>
        {d.rbcMl ? (
          <Note tone="warn">
            With blood in the prime, check ionised calcium, potassium, glucose and pH of the prime before going on bypass, especially in neonates and
            infants.
          </Note>
        ) : null}

        <Grid cols={3}>
          <NumberField
            label="Other clear fluid before or on bypass"
            unit="mL"
            value={extraFluid}
            onChange={setExtraFluid}
            hint="Crystalloid cardioplegia, anaesthetic fluids"
            className="col-span-2 sm:col-span-1"
          />
          {hctWithFluid !== null ? (
            <Result label="Hct including that fluid" value={fmt(hctWithFluid, 1)} unit="%" tone={hctWithFluid < d.targetHct ? "warn" : "ok"} className="col-span-2" />
          ) : null}
        </Grid>
      </Panel>

      <Panel title="Ultrafiltration estimate (CUF or MUF)" icon={Filter}>
        <Grid cols={3}>
          <NumberField label="Hct now" unit="%" value={ufHctNow} onChange={setUfHctNow} placeholder={ufNow !== null ? `${fmt(ufNow, 1)} auto` : ""} />
          <NumberField label="Hct wanted" unit="%" value={ufTarget} onChange={setUfTarget} placeholder={`${ufGoal}`} />
          <NumberField
            label="Circulating volume"
            unit="mL"
            value={ufVolume}
            onChange={setUfVolume}
            placeholder={`${fmt(circulating, 0)} (EBV + prime)`}
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Grid cols={2}>
          <Result label="Filtrate to remove" value={fmt(ufRemove, 0)} unit="mL" sub={ufRemove ? `${fmt(ufRemove / s.weight, 0)} mL/kg` : undefined} tone="info" />
          <Result label="Volume left" value={ufRemove !== null ? fmt(ufTotal - ufRemove, 0) : "—"} unit="mL" />
        </Grid>
        <Formula>filtrate = volume × (1 − Hct now ÷ Hct wanted)</Formula>
        <Note>This assumes no red cells are lost or given while filtering. Recheck the haematocrit rather than filtering to a calculated volume.</Note>
      </Panel>
    </div>
  );
};

export default HematocritCalculator;

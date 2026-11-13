import { useState } from "react";
import { Baby, Stethoscope, Timer } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { airway, fmt, infusionDose, infusionRate, maintenanceFluid } from "@/lib/perfusion";
import { ANAESTHESIA_GROUPS, INFUSION_PRESETS } from "@/lib/perfusion-data";
import { cn } from "@/lib/utils";
import { DoseTable, Formula, Grid, NeedPatient, Note, NumberField, Panel, Pill, Result, SelectField, TabIntro } from "./shared";

const AnesthesiaDoses = () => {
  const { state: s, derived: d } = useCase();
  const [section, setSection] = useState(ANAESTHESIA_GROUPS[0].title);

  const [presetId, setPresetId] = useState(INFUSION_PRESETS[0].id);
  const preset = INFUSION_PRESETS.find((p) => p.id === presetId)!;
  const [amount, setAmount] = useState<number | null>(preset.amountMg);
  const [volume, setVolume] = useState<number | null>(preset.volumeMl);
  const [dose, setDose] = useState<number | null>(preset.low);
  const [rate, setRate] = useState<number | null>(null);

  if (s.weight === null) return <NeedPatient />;
  const w = s.weight;

  const pickPreset = (id: string) => {
    const p = INFUSION_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setAmount(p.amountMg);
    setVolume(p.volumeMl);
    setDose(p.low);
    setRate(null);
  };

  const mlPerHour = infusionRate(dose, w, amount, volume);
  const doseFromRate = infusionDose(rate, w, amount, volume);
  const conc = amount && volume ? (amount * 1000) / volume : null;
  const outOfRange = dose !== null && (dose < preset.low || dose > preset.high);

  const air = airway(d.ageYears, w);
  const maintenance = maintenanceFluid(w);
  const rows = ANAESTHESIA_GROUPS.find((g) => g.title === section)!.rows;

  return (
    <div className="space-y-4">
      <TabIntro>Weight-based anaesthesia and emergency doses for {fmt(w)} kg. Titrate to effect; reduce in the elderly, the unstable and poor ventricular function.</TabIntro>

      <Panel title="Bolus doses" icon={Stethoscope}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          {ANAESTHESIA_GROUPS.map((g) => (
            <button
              key={g.title}
              type="button"
              aria-pressed={section === g.title}
              onClick={() => setSection(g.title)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                section === g.title ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {g.title}
            </button>
          ))}
        </div>
        <DoseTable rows={rows} weight={w} group={s.group} />
      </Panel>

      <Panel title="Infusion rate" icon={Timer} aside={outOfRange ? <Pill tone="warn">Outside usual range</Pill> : null}>
        <Grid cols={4}>
          <SelectField
            label="Drug"
            value={presetId}
            onChange={pickPreset}
            options={INFUSION_PRESETS.map((p) => ({ value: p.id, label: p.drug }))}
            className="col-span-2 md:col-span-1"
          />
          <NumberField label="Drug in syringe" unit="mg" value={amount} onChange={setAmount} />
          <NumberField label="Made up to" unit="mL" value={volume} onChange={setVolume} />
          <NumberField
            label="Dose"
            unit="mcg/kg/min"
            value={dose}
            onChange={setDose}
            hint={`Usual ${preset.low} to ${preset.high}`}
            className="col-span-2 md:col-span-1"
          />
        </Grid>
        <Grid cols={3}>
          <Result big tone="info" label="Pump rate" value={fmt(mlPerHour, 2)} unit="mL/h" className="col-span-2 sm:col-span-1" />
          <Result label="Concentration" value={fmt(conc, 0)} unit="mcg/mL" />
          <Result
            label="Usual range"
            value={`${fmt(infusionRate(preset.low, w, amount, volume), 1)} to ${fmt(infusionRate(preset.high, w, amount, volume), 1)}`}
            unit="mL/h"
          />
        </Grid>
        <Formula>
          mL/h = dose × weight × 60 ÷ concentration = {fmt(dose)} × {fmt(w)} × 60 ÷ {fmt(conc, 0)}
        </Formula>
        <Grid cols={2}>
          <NumberField label="Check a running rate" unit="mL/h" value={rate} onChange={setRate} placeholder="e.g. 5" />
          <Result label="That rate delivers" value={fmt(doseFromRate, 3)} unit="mcg/kg/min" />
        </Grid>
        {preset.note ? <Note>{preset.note}</Note> : null}
        <Note tone="warn">
          The syringe mixes shown are common adult dilutions. Set the drug amount and volume to the mix actually drawn up before reading the rate.
          {s.group === "paed"
            ? ` For this child, ${fmt(0.6 * w, 1)} mg in 100 mL runs at 1 mL/h = 0.1 mcg/kg/min, and ${fmt(6 * w, 0)} mg in 100 mL at 1 mL/h = 1 mcg/kg/min.`
            : ""}
        </Note>
      </Panel>

      <Panel title="Airway and fluids" icon={Baby}>
        <Grid cols={4}>
          <Result label="Maintenance fluid" value={fmt(maintenance, 0)} unit="mL/h" sub="4-2-1 rule" />
          <Result label="Laryngeal mask" value={air.lma ? `Size ${air.lma}` : "—"} sub="By weight" />
          <Result label="Tracheal tube, cuffed" value={air.cuffed !== null ? fmt(air.cuffed, 1) : "—"} unit={air.cuffed !== null ? "mm ID" : undefined} sub={air.cuffed !== null ? `Uncuffed ${fmt(air.uncuffed, 1)}${air.infant ? ". Infant estimate" : ""}` : "Enter age (up to 14 years)"} />
          <Result label="Tube depth at lips" value={air.depthOral !== null ? fmt(air.depthOral, 1) : "—"} unit={air.depthOral !== null ? "cm" : undefined} sub={air.depthOral !== null ? (air.infant ? "3 × tube size" : "Age ÷ 2 + 12") : undefined} />
        </Grid>
        <Formula>from 1 year: cuffed tube = age ÷ 4 + 3.5 · uncuffed = age ÷ 4 + 4 · 4-2-1 = 4 mL/kg first 10 kg, 2 mL/kg next 10 kg, 1 mL/kg after</Formula>
        <Note>Have one tube size above and below ready. Adults: 7.0 to 7.5 mm for women, 8.0 to 8.5 mm for men is usual.</Note>
      </Panel>
    </div>
  );
};

export default AnesthesiaDoses;

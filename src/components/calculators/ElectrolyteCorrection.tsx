import { useState } from "react";
import { Atom, FlaskRound, TriangleAlert, Zap } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { bicarbonateDose, fmt, potassiumDeficit } from "@/lib/perfusion";
import { ELECTROLYTE } from "@/lib/perfusion-data";
import { Formula, Grid, KeyValueTable, NeedPatient, Note, NumberField, Panel, Pill, Result, TabIntro, type Tone } from "./shared";

const ElectrolyteCorrection = () => {
  const { state: s } = useCase();
  const [k, setK] = useState<number | null>(null);
  const [kTarget, setKTarget] = useState<number | null>(ELECTROLYTE.kTarget);
  const [factor, setFactor] = useState<number | null>(ELECTROLYTE.factor);
  const [be, setBe] = useState<number | null>(null);

  if (s.weight === null) return <NeedPatient />;
  const w = s.weight;
  const adult = s.group === "adult";

  const kDeficit = potassiumDeficit(k, kTarget, w, factor);
  const kTone: Tone = k === null ? "neutral" : k < 3.5 ? "warn" : k > 6 ? "alert" : k > 5.5 ? "warn" : "ok";
  const kLabel = k === null ? "" : k < 3.5 ? "Low" : k > 6 ? "High: treat" : k > 5.5 ? "High" : "In range";

  const baseDeficit = be !== null ? Math.abs(be) : null;
  const bicarb = bicarbonateDose(baseDeficit, w, factor);

  const capped = (perKg: number, max: number) => Math.min(perKg * w, max);

  return (
    <div className="space-y-4">
      <TabIntro>Corrections on and around bypass for {fmt(w)} kg. Give in divided doses and recheck the blood gas each time.</TabIntro>

      <Panel title="Potassium" icon={Zap} aside={k !== null ? <Pill tone={kTone}>{kLabel}</Pill> : null}>
        <Grid cols={3}>
          <NumberField label="Measured K⁺" unit="mmol/L" value={k} onChange={setK} placeholder="e.g. 3.2" />
          <NumberField label="Target K⁺" unit="mmol/L" value={kTarget} onChange={setKTarget} />
          <NumberField label="Distribution factor" value={factor} onChange={setFactor} hint="0.3 is the usual value" className="col-span-2 sm:col-span-1" />
        </Grid>
        <Grid cols={2}>
          <Result
            big
            tone="info"
            label="Potassium to give"
            value={fmt(kDeficit, 1)}
            unit="mmol"
            sub={kDeficit ? `${fmt(kDeficit / ELECTROLYTE.kclMmolPerMl, 1)} mL of 15% KCl (2 mmol/mL)` : k !== null && kDeficit === 0 ? "At or above target" : "Enter the measured value"}
          />
          <Result label="Suggested first dose" value={kDeficit ? fmt(kDeficit / 2, 1) : "—"} unit={kDeficit ? "mmol" : undefined} sub="Half the deficit, then recheck" />
        </Grid>
        <Formula>
          K⁺ (mmol) = (target − measured) × weight × {fmt(factor)} = ({fmt(kTarget)} − {fmt(k)}) × {fmt(w)} × {fmt(factor)}
        </Formula>
        <Note tone="warn">Concentrated potassium is a high-alert drug. On bypass add it to the venous reservoir in small portions, never as a rapid bolus to the patient.</Note>
      </Panel>

      {k !== null && k > 5.5 ? (
        <Panel title="High potassium on bypass" icon={TriangleAlert}>
          <KeyValueTable
            rows={[
              ["Calcium chloride 10%", `${fmt(capped(10, 1000), 0)} to ${fmt(capped(20, 1000), 0)} mg`],
              ["Insulin with glucose", adult ? "10 units with 25 g glucose (50 mL of 50%)" : `${fmt(0.1 * w, 1)} units with ${fmt(0.5 * w, 1)} g glucose (${fmt(5 * w, 0)} mL of 10%)`],
              ["Sodium bicarbonate 8.4%", `${fmt(w, 0)} mEq (1 mEq/kg) if acidotic`],
              ["Furosemide", adult ? "20 to 40 mg" : `${fmt(0.5 * w, 1)} to ${fmt(w, 1)} mg`],
              ["Ultrafiltration", "Zero-balance ultrafiltration with potassium-free replacement"],
            ]}
          />
          <Note>Also stop potassium sources, check for haemolysis and review the cardioplegia volume returned to the circuit.</Note>
        </Panel>
      ) : null}

      <Panel title="Metabolic acidosis: sodium bicarbonate" icon={FlaskRound}>
        <Grid cols={3}>
          <NumberField label="Base deficit" unit="mmol/L" value={be} onChange={setBe} allowNegative placeholder="e.g. 6" hint="Enter base excess as −6 or deficit as 6" />
          <Result label="Full correction" value={fmt(bicarb, 0)} unit="mEq" sub={bicarb ? `${fmt(bicarb / ELECTROLYTE.bicarbMEqPerMl, 0)} mL of 8.4%` : undefined} />
          <Result tone="info" label="Give first" value={bicarb ? fmt(bicarb / 2, 0) : "—"} unit={bicarb ? "mEq" : undefined} sub="Half, then repeat the gas" className="col-span-2 sm:col-span-1" />
        </Grid>
        <Formula>
          NaHCO₃ (mEq) = base deficit × weight × {fmt(factor)} = {fmt(baseDeficit)} × {fmt(w)} × {fmt(factor)}
        </Formula>
        <Note>Look for the cause first: low flow, low haematocrit, light anaesthesia or poor venous drainage. 8.4% is 1 mEq/mL; dilute to 4.2% for neonates.</Note>
      </Panel>

      <Panel title="Calcium, magnesium and glucose" icon={Atom}>
        <KeyValueTable
          head={["Correction", `Dose for ${fmt(w)} kg`]}
          rows={[
            ["Calcium chloride 10% (10 to 20 mg/kg)", `${fmt(capped(10, 1000), 0)} to ${fmt(capped(20, 1000), 0)} mg = ${fmt(capped(10, 1000) / ELECTROLYTE.caclMgPerMl, 1)} to ${fmt(capped(20, 1000) / ELECTROLYTE.caclMgPerMl, 1)} mL`],
            ["Calcium gluconate 10% (30 to 60 mg/kg)", `${fmt(capped(30, 3000), 0)} to ${fmt(capped(60, 3000), 0)} mg = ${fmt(capped(30, 3000) / ELECTROLYTE.caGlucMgPerMl, 1)} to ${fmt(capped(60, 3000) / ELECTROLYTE.caGlucMgPerMl, 1)} mL`],
            ["Magnesium sulfate 50% (25 to 50 mg/kg)", `${fmt(capped(25, 2000), 0)} to ${fmt(capped(50, 2000), 0)} mg = ${fmt(capped(25, 2000) / ELECTROLYTE.mgso4MgPerMl, 1)} to ${fmt(capped(50, 2000) / ELECTROLYTE.mgso4MgPerMl, 1)} mL`],
            ["Glucose 10% for hypoglycaemia (2 to 5 mL/kg)", `${fmt(2 * w, 0)} to ${fmt(Math.min(5 * w, 250), 0)} mL`],
          ]}
        />
        <Note>
          Correct ionised calcium before weaning, not during the first minutes of reperfusion. Maximums applied here: calcium chloride 1 g, calcium
          gluconate 3 g, magnesium 2 g, glucose 10% 250 mL.
        </Note>
      </Panel>
    </div>
  );
};

export default ElectrolyteCorrection;

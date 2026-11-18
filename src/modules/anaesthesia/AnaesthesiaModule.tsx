import { Baby } from "lucide-react";
import { INTRAOP, PACU, PREOP, type FormValues } from "@/lib/clinical/forms";
import { INTRAOP_VITALS, type ChartRow } from "@/lib/clinical/charts";
import ChartLog from "@/components/clinical/ChartLog";
import { airway, fmt } from "@/lib/perfusion";
import FormRunner from "@/components/clinical/FormRunner";
import { Grid, Note, NumberField, Panel, Result, Segmented } from "@/components/calculators/shared";
import { Steps } from "@/components/clinical/CalcReport";
import { useSessionState } from "@/platform/sessionState";

function AirwaySizes() {
  const [age, setAge] = useSessionState<number | null>("an-age", null);
  const [unit, setUnit] = useSessionState<"years" | "months">("an-age-unit", "years");
  const [weight, setWeight] = useSessionState<number | null>("an-weight", null);
  const years = age === null ? null : unit === "months" ? age / 12 : age;
  const a = airway(years, weight);
  return (
    <Panel title="Paediatric tube and LMA size estimate" icon={Baby}>
      <Note>These are PerfCalc TZ's existing estimates, shown here unchanged. Have a size above and below ready and confirm with the leak and chest rise.</Note>
      <Grid cols={3}>
        <NumberField label="Age" value={age} onChange={setAge} />
        <Segmented label="Age in" value={unit} onChange={setUnit} options={[{ value: "years", label: "Years" }, { value: "months", label: "Months" }]} />
        <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} className="col-span-2 sm:col-span-1" />
      </Grid>
      <Grid cols={4}>
        <Result label="Uncuffed ETT" value={fmt(a.uncuffed, 1)} unit="mm ID" />
        <Result label="Cuffed ETT" value={fmt(a.cuffed, 1)} unit="mm ID" />
        <Result label="Oral depth" value={fmt(a.depthOral, 1)} unit="cm" />
        <Result label="LMA size" value={a.lma ?? "—"} />
      </Grid>
      <Steps
        formula="1 to 14 years: uncuffed ID = age/4 + 4; cuffed ID = age/4 + 3.5; oral depth = age/2 + 12 cm. Under 1 year: 3.5 mm to 6 months, 4.0 mm after; depth = 3 × ID. LMA by weight."
        steps={years !== null ? [`Age ${fmt(years, 2)} years${a.infant ? " (under 1 year: age formula not used)" : ""}`] : []}
      />
    </Panel>
  );
}

export default function AnaesthesiaModule() {
  const [tool, setTool] = useSessionState<"preop" | "airway" | "intraop" | "pacu">("an-tool", "preop");
  const [intra, setIntra] = useSessionState<FormValues>("form-intraop", {});
  const [vitals, setVitals] = useSessionState<ChartRow[]>("chart-intraop-vitals", []);
  const [pre, setPre] = useSessionState<FormValues>("form-preop", {});
  const [pacu, setPacu] = useSessionState<FormValues>("form-pacu", {});
  return (
    <div className="space-y-4">
      <Segmented
        label="Workspace"
        value={tool}
        onChange={setTool}
        options={[
          { value: "preop", label: "Pre-op" },
          { value: "airway", label: "Airway sizes" },
          { value: "intraop", label: "Intra-op" },
          { value: "pacu", label: "Recovery" },
        ]}
      />
      {tool === "preop" ? <FormRunner def={PREOP} values={pre} onChange={setPre} /> : null}
      {tool === "airway" ? <AirwaySizes /> : null}
      {tool === "intraop" ? (
        <>
          <ChartLog def={INTRAOP_VITALS} rows={vitals} onChange={setVitals} />
          <FormRunner def={INTRAOP} values={intra} onChange={setIntra} />
        </>
      ) : null}
      {tool === "pacu" ? (
        <>
          <Note>
            Score the Modified Aldrete in <a className="font-semibold underline" href="#/scores/aldrete">Clinical scores</a> and enter the total below.
          </Note>
          <FormRunner def={PACU} values={pacu} onChange={setPacu} />
        </>
      ) : null}
      <Note>Use the Checklist library for the WHO Surgical Safety Checklist. A difficult airway checklist needs a locally approved algorithm and will be added through the hospital checklist editor.</Note>
    </div>
  );
}

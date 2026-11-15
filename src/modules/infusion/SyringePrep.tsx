import { useState } from "react";
import { FlaskConical, Printer, Tag } from "lucide-react";
import { prepareSyringe } from "@/lib/clinical/syringe";
import { calculateInfusion } from "@/lib/clinical/infusion";
import { AMOUNT_UNITS, DOSE_UNITS, compatible, parseDoseUnit, show, type AmountUnit } from "@/lib/clinical/units";
import { CONTENT } from "@/lib/clinical/content";
import { DRUG_NAME_SUGGESTIONS } from "@/lib/clinical/formulary";
import { logAudit } from "@/lib/clinical/audit";
import { Button, Grid, Note, NumberField, Panel, Result, Segmented, SelectField, TextField } from "@/components/calculators/shared";
import { Errors, SourceBox, Steps, Warnings } from "@/components/clinical/CalcReport";

function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function SyringePrep() {
  const [drug, setDrug] = useState("");
  const [ampAmount, setAmpAmount] = useState<number | null>(null);
  const [ampUnit, setAmpUnit] = useState<AmountUnit>("mg");
  const [ampVol, setAmpVol] = useState<number | null>(null);
  const [mode, setMode] = useState<"from-ampoules" | "to-concentration">("from-ampoules");
  const [ampoules, setAmpoules] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [targetUnit, setTargetUnit] = useState<AmountUnit>("mg");
  const [finalVol, setFinalVol] = useState<number | null>(null);
  const [diluent, setDiluent] = useState("");
  // Optional: rate for a prescribed dose with this syringe.
  const [doseUnit, setDoseUnit] = useState("mg/h");
  const [dose, setDose] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  // Label.
  const [patient, setPatient] = useState("");
  const [preparedAt, setPreparedAt] = useState(nowLocal);
  const [expiry, setExpiry] = useState("");
  const [preparer, setPreparer] = useState("");
  const [checker, setChecker] = useState("");

  const r = prepareSyringe({
    drug,
    ampouleAmount: ampAmount,
    ampouleUnit: ampUnit,
    ampouleVolumeMl: ampVol,
    finalVolumeMl: finalVol,
    ampoules,
    targetConcentration: target,
    targetUnit,
    mode,
  });

  const doseFamilyOk = (() => {
    try {
      return compatible(parseDoseUnit(doseUnit).amount, ampUnit);
    } catch {
      return false;
    }
  })();
  const inf =
    r.ok && dose !== null
      ? calculateInfusion({ mode: "dose-to-rate", concentration: { amount: r.totalDrug, unit: ampUnit, volumeMl: finalVol }, weightKg: weight, doseUnit, dose })
      : null;

  const print = () => {
    logAudit("label-printed", `${drug || "Unnamed drug"} ${show(r.totalDrug)} ${ampUnit} in ${show(finalVol)} mL (${show(r.finalConcentration)} ${ampUnit}/mL)`, [preparer, checker].filter(Boolean).join(" / "));
    document.body.classList.add("nap-print-label");
    const done = () => {
      document.body.classList.remove("nap-print-label");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
    // Some mobile browsers do not fire afterprint.
    setTimeout(done, 60_000);
  };

  return (
    <div className="space-y-4">
      <Panel title="Ampoule or vial in hand" icon={FlaskConical}>
        <TextField label="Drug name" value={drug} onChange={setDrug} list="nap-drugs-prep" placeholder="Type or choose" />
        <datalist id="nap-drugs-prep">
          {DRUG_NAME_SUGGESTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <Grid cols={3}>
          <NumberField label="Drug per ampoule" value={ampAmount} onChange={setAmpAmount} hint="As printed on the ampoule" />
          <SelectField label="Unit" value={ampUnit} onChange={(v) => setAmpUnit(v as AmountUnit)} options={AMOUNT_UNITS.map((u) => ({ value: u, label: u }))} />
          <NumberField label="Ampoule volume" unit="mL" value={ampVol} onChange={setAmpVol} className="col-span-2 sm:col-span-1" />
        </Grid>
        <Segmented
          label="Work out"
          value={mode}
          onChange={setMode}
          options={[
            { value: "from-ampoules", label: "From ampoules used" },
            { value: "to-concentration", label: "For a concentration" },
          ]}
        />
        <Grid cols={3}>
          {mode === "from-ampoules" ? (
            <NumberField label="Number of ampoules" value={ampoules} onChange={setAmpoules} />
          ) : (
            <>
              <NumberField label="Final concentration wanted" unit="per mL" value={target} onChange={setTarget} />
              <SelectField label="Unit" value={targetUnit} onChange={(v) => setTargetUnit(v as AmountUnit)} options={AMOUNT_UNITS.map((u) => ({ value: u, label: `${u}/mL` }))} />
            </>
          )}
          <NumberField label="Final syringe volume" unit="mL" value={finalVol} onChange={setFinalVol} className={mode === "from-ampoules" ? "" : "col-span-2 sm:col-span-1"} />
        </Grid>
        <TextField label="Diluent (from the local injectable medicines guide)" value={diluent} onChange={setDiluent} placeholder="e.g. as per protocol" />
        <Errors items={r.errors} />
        {r.ok ? (
          <>
            <Grid cols={4}>
              <Result big tone="info" label="Final concentration" value={show(r.finalConcentration)} unit={`${ampUnit}/mL`} className="col-span-2" />
              <Result label="Total drug" value={show(r.totalDrug)} unit={ampUnit} />
              <Result label="Ampoules" value={show(r.ampoulesUsed)} />
              <Result label="Drug volume to draw" value={show(r.drugVolumeMl)} unit="mL" className="col-span-2" />
              <Result label="Diluent to add" value={show(r.diluentMl)} unit="mL" className="col-span-2" />
            </Grid>
            <Warnings items={r.warnings.map((text) => ({ severity: "caution" as const, text }))} />
            <Steps formula="final concentration = total drug ÷ final volume; diluent = final volume − drug volume" steps={r.steps} />
          </>
        ) : null}
      </Panel>

      {r.ok ? (
        <Panel title="Rate for a prescribed dose (optional)" icon={FlaskConical}>
          <Grid cols={3}>
            <SelectField label="Dose unit" value={doseUnit} onChange={setDoseUnit} options={DOSE_UNITS.map((u) => ({ value: u, label: u }))} />
            <NumberField label="Prescribed dose" unit={doseUnit} value={dose} onChange={setDose} />
            <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} className="col-span-2 sm:col-span-1" />
          </Grid>
          {!doseFamilyOk ? <Note tone="warn">The ampoule is in {ampUnit}; choose a dose unit that measures the same thing.</Note> : null}
          {inf ? <Errors items={inf.errors} /> : null}
          {inf?.ok ? (
            <>
              <Grid cols={2}>
                <Result big tone="info" label="Pump rate" value={show(inf.rateMlH)} unit="mL/h" />
                <Result label="Dose delivered per hour" value={show(inf.amountPerHour)} unit={`${ampUnit}/h`} />
              </Grid>
              <Steps steps={inf.steps} />
              <Note>For confirmation and an independent double check, use the Infusion calculator tab with this concentration.</Note>
            </>
          ) : null}
        </Panel>
      ) : null}

      {r.ok ? (
        <Panel title="Syringe label" icon={Tag} aside={<Button icon={Printer} variant="primary" onClick={print}>Print label</Button>}>
          <Grid cols={2}>
            <TextField label="Patient name or ID (printed only, never saved)" value={patient} onChange={setPatient} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="nap-prep-at">
                Prepared at
              </label>
              <input id="nap-prep-at" type="datetime-local" value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <TextField label="Expiry (from local policy)" value={expiry} onChange={setExpiry} placeholder="date and time, or hours after preparation" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Prepared by" value={preparer} onChange={setPreparer} />
              <TextField label="Checked by" value={checker} onChange={setChecker} />
            </div>
          </Grid>
          <div className="nap-label mx-auto w-full max-w-sm rounded-md border-2 border-foreground bg-white p-3 font-sans text-black">
            <div className="text-xl font-bold leading-tight">{drug || "DRUG NAME"}</div>
            <div className="mt-1 text-lg font-semibold">
              {show(r.totalDrug)} {ampUnit} in {show(finalVol)} mL
            </div>
            <div className="text-lg font-bold">
              = {show(r.finalConcentration)} {ampUnit}/mL
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 text-[13px] leading-snug">
              {diluent ? (
                <>
                  <dt className="font-semibold">Diluent</dt>
                  <dd>{diluent}</dd>
                </>
              ) : null}
              {patient ? (
                <>
                  <dt className="font-semibold">Patient</dt>
                  <dd>{patient}</dd>
                </>
              ) : null}
              <dt className="font-semibold">Prepared</dt>
              <dd>{preparedAt ? new Date(preparedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}</dd>
              <dt className="font-semibold">Expires</dt>
              <dd>{expiry || "—"}</dd>
              <dt className="font-semibold">By / check</dt>
              <dd>
                {preparer || "—"} / {checker || "—"}
              </dd>
            </dl>
          </div>
        </Panel>
      ) : null}

      <SourceBox meta={CONTENT.syringe} />
    </div>
  );
}

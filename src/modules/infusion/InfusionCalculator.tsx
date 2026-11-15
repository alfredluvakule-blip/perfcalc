import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Gauge, ShieldCheck, Syringe, XCircle } from "lucide-react";
import { calculateInfusion, type DoseLimits } from "@/lib/clinical/infusion";
import { AMOUNT_UNITS, DOSE_UNITS, isPositive, parseDoseUnit, show, type AmountUnit } from "@/lib/clinical/units";
import { DRUG_NAME_SUGGESTIONS, loadFormulary, type FormularyEntry, type Population } from "@/lib/clinical/formulary";
import { CONTENT } from "@/lib/clinical/content";
import { logAudit } from "@/lib/clinical/audit";
import { Button, Grid, Note, NumberField, Panel, Pill, Result, Segmented, SelectField, TextField } from "@/components/calculators/shared";
import { Errors, InputsTable, SourceBox, Steps, Warnings } from "@/components/clinical/CalcReport";

const PUMP_KEY = "nap-pump-limits";

function readPump(): { min: number | null; max: number | null } {
  try {
    const v = JSON.parse(window.localStorage.getItem(PUMP_KEY) ?? "null");
    if (v && typeof v === "object") return { min: v.min ?? null, max: v.max ?? null };
  } catch {
    /* ignore */
  }
  return { min: null, max: null };
}

const POPULATIONS: { value: Population; label: string }[] = [
  { value: "adult", label: "Adult" },
  { value: "paediatric", label: "Child" },
  { value: "neonatal", label: "Neonate" },
];

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border border-input px-3 py-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
      <span>{children}</span>
    </label>
  );
}

export default function InfusionCalculator() {
  const [formulary] = useState<FormularyEntry[]>(loadFormulary);
  const [entryId, setEntryId] = useState("");
  const [population, setPopulation] = useState<Population>("adult");
  const [drug, setDrug] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>("mg");
  const [volume, setVolume] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [mode, setMode] = useState<"dose-to-rate" | "rate-to-dose">("dose-to-rate");
  const [doseUnit, setDoseUnit] = useState("mcg/kg/min");
  const [dose, setDose] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lim, setLim] = useState<{ softMin: number | null; softMax: number | null; hardMin: number | null; hardMax: number | null }>({ softMin: null, softMax: null, hardMin: null, hardMax: null });
  const [pump, setPump] = useState(readPump);
  const [weightOk, setWeightOk] = useState(false);
  const [concOk, setConcOk] = useState(false);
  const [preparer, setPreparer] = useState("");
  const [checker, setChecker] = useState("");
  const [checkerRate, setCheckerRate] = useState<number | null>(null);
  const [logged, setLogged] = useState<string | null>(null);

  const entry = formulary.find((e) => e.id === entryId) ?? null;
  const entriesForPop = formulary.filter((e) => e.population === population || e.population === "any");
  const perKg = useMemo(() => {
    try {
      return parseDoseUnit(doseUnit).perKg;
    } catch {
      return false;
    }
  }, [doseUnit]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PUMP_KEY, JSON.stringify(pump));
    } catch {
      /* ignore */
    }
  }, [pump]);

  // Any change to weight or concentration needs fresh confirmation.
  useEffect(() => setWeightOk(false), [weight]);
  useEffect(() => setConcOk(false), [amount, amountUnit, volume]);

  const pickEntry = (id: string) => {
    setEntryId(id);
    const e = formulary.find((x) => x.id === id);
    if (!e) return;
    setDrug(e.drug);
    setDoseUnit(e.doseUnit);
    if (e.concentrations.length === 1) {
      const c = e.concentrations[0];
      setAmount(c.amount);
      setAmountUnit(c.unit);
      setVolume(c.volumeMl);
    }
  };

  const limits: DoseLimits | null = entry
    ? { unit: entry.doseUnit, softMin: entry.softMin, softMax: entry.softMax, hardMin: entry.hardMin, hardMax: entry.hardMax }
    : Object.values(lim).some((v) => v !== null)
      ? { unit: doseUnit, ...lim }
      : null;

  const r = calculateInfusion({
    mode,
    concentration: { amount, unit: amountUnit, volumeMl: volume },
    weightKg: weight,
    doseUnit,
    dose,
    rateMlH: rate,
    durationH: duration,
    remainingMl: remaining,
    limits,
    pump: { minRateMlH: pump.min, maxRateMlH: pump.max },
  });

  const confirmed = concOk && (!perKg || weightOk);
  const showResult = r.ok && confirmed;
  const resultRate = r.rateMlH;
  const match = isPositive(checkerRate) && resultRate !== null ? Math.abs(checkerRate - resultRate) <= Math.max(0.05, resultRate * 0.01) : null;

  const routeWarning = entry?.route === "central-only" ? { severity: "caution" as const, text: `Hospital formulary: give ${entry.drug} by central line only. ${entry.routeNote ?? ""}`.trim() } : null;
  const warnings = [...(routeWarning ? [routeWarning] : []), ...r.warnings];

  const summary = () =>
    `${drug || "Unnamed drug"}: ${show(amount)} ${amountUnit} in ${show(volume)} mL (${show(r.concentrationPerMl)} ${amountUnit}/mL); ` +
    `${perKg ? `${show(weight)} kg; ` : ""}${show(r.dose)} ${doseUnit} = ${show(r.rateMlH)} mL/h`;

  const record = () => {
    const by = [preparer, checker].filter(Boolean).join(" / ");
    logAudit(match === null ? "calculation-confirmed" : "double-check", `${summary()}${match === null ? "" : match ? " · independent check matched" : ` · CHECK MISMATCH (checker ${show(checkerRate)} mL/h)`}`, by);
    setLogged(new Date().toLocaleTimeString("en-GB"));
  };

  const unitFamilyOptions = DOSE_UNITS.map((u) => ({ value: u, label: u }));

  return (
    <div className="space-y-4">
      <Panel title="Drug and syringe" icon={Syringe} aside={<Pill tone="warn">Concentration is never pre-filled</Pill>}>
        <Segmented label="Patient group" value={population} onChange={(v) => { setPopulation(v); setEntryId(""); }} options={POPULATIONS} />
        {entriesForPop.length ? (
          <SelectField
            label="From the hospital formulary (optional)"
            value={entryId}
            onChange={pickEntry}
            options={[{ value: "", label: "Not from the formulary: enter everything" }, ...entriesForPop.map((e) => ({ value: e.id, label: `${e.drug} (${e.doseUnit})` }))]}
          />
        ) : (
          <Note>No approved formulary entries on this device for this group. Enter the drug and concentration from the prescription and the syringe in hand. Approved entries can be added under Hospital formulary.</Note>
        )}
        {entry && entry.concentrations.length > 1 ? (
          <SelectField
            label="Approved concentration"
            value=""
            onChange={(v) => {
              const c = entry.concentrations[Number(v)];
              if (c) {
                setAmount(c.amount);
                setAmountUnit(c.unit);
                setVolume(c.volumeMl);
              }
            }}
            options={[{ value: "", label: "Choose one" }, ...entry.concentrations.map((c, i) => ({ value: String(i), label: c.label ?? `${show(c.amount)} ${c.unit} in ${show(c.volumeMl)} mL` }))]}
          />
        ) : null}
        <div>
          <TextField label="Drug name" value={drug} onChange={setDrug} placeholder="Type or choose" list="nap-drugs" />
          <datalist id="nap-drugs">
            {DRUG_NAME_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <Grid cols={3}>
          <NumberField label="Drug in syringe" value={amount} onChange={setAmount} />
          <SelectField label="Unit" value={amountUnit} onChange={(v) => setAmountUnit(v as AmountUnit)} options={AMOUNT_UNITS.map((u) => ({ value: u, label: u }))} />
          <NumberField label="Total volume" unit="mL" value={volume} onChange={setVolume} className="col-span-2 sm:col-span-1" />
        </Grid>
        {r.concentrationPerMl !== null ? (
          <Result tone="info" label="Concentration" value={show(r.concentrationPerMl)} unit={`${amountUnit}/mL`} sub={`${show(amount)} ${amountUnit} in ${show(volume)} mL`} />
        ) : null}
      </Panel>

      <Panel title="Dose and rate" icon={Gauge}>
        <Segmented
          label="Calculate"
          value={mode}
          onChange={setMode}
          options={[
            { value: "dose-to-rate", label: "Dose → mL/h" },
            { value: "rate-to-dose", label: "mL/h → dose" },
          ]}
        />
        <Grid cols={3}>
          <SelectField label="Dose unit" value={doseUnit} onChange={setDoseUnit} options={unitFamilyOptions} />
          {mode === "dose-to-rate" ? (
            <NumberField label="Prescribed dose" unit={doseUnit} value={dose} onChange={setDose} />
          ) : (
            <NumberField label="Pump rate" unit="mL/h" value={rate} onChange={setRate} />
          )}
          <NumberField
            label={perKg ? "Weight (required)" : "Weight"}
            unit="kg"
            value={weight}
            onChange={setWeight}
            hint={perKg ? "Weight-based dose" : "Not weight-based"}
            className="col-span-2 sm:col-span-1"
          />
        </Grid>
        <Grid cols={2}>
          <NumberField label="Planned duration" unit="h" value={duration} onChange={setDuration} placeholder="optional" />
          <NumberField label="Volume left in syringe" unit="mL" value={remaining} onChange={setRemaining} placeholder={volume ? `${volume} (full)` : "optional"} />
        </Grid>

        {!entry ? (
          <details className="rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Dose limits for this calculation (optional, from the prescription or protocol)</summary>
            <div className="space-y-3 border-t p-3">
              <Grid cols={4}>
                <NumberField label="Usual min" unit={doseUnit} value={lim.softMin} onChange={(v) => setLim({ ...lim, softMin: v })} />
                <NumberField label="Usual max" unit={doseUnit} value={lim.softMax} onChange={(v) => setLim({ ...lim, softMax: v })} />
                <NumberField label="Hard min" unit={doseUnit} value={lim.hardMin} onChange={(v) => setLim({ ...lim, hardMin: v })} />
                <NumberField label="Hard max" unit={doseUnit} value={lim.hardMax} onChange={(v) => setLim({ ...lim, hardMax: v })} />
              </Grid>
              <p className="text-xs text-muted-foreground">No limits are built in. Leave blank if the protocol gives none.</p>
            </div>
          </details>
        ) : (
          <Note>
            Limits and route rule from the formulary entry for {entry.drug} ({entry.source}
            {entry.approvedBy ? `, approved by ${entry.approvedBy}${entry.approvedOn ? ` on ${entry.approvedOn}` : ""}` : ", not marked as approved"}).
          </Note>
        )}
        <details className="rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Pump range (saved on this device)</summary>
          <div className="border-t p-3">
            <Grid cols={2}>
              <NumberField label="Lowest rate" unit="mL/h" value={pump.min} onChange={(v) => setPump({ ...pump, min: v })} />
              <NumberField label="Highest rate" unit="mL/h" value={pump.max} onChange={(v) => setPump({ ...pump, max: v })} />
            </Grid>
          </div>
        </details>

        <Errors items={r.errors} />

        {r.ok ? (
          <div className="space-y-2">
            {perKg ? (
              <Checkbox checked={weightOk} onChange={setWeightOk}>
                I have confirmed the weight of <strong>{show(weight)} kg</strong> is this patient's current weight.
              </Checkbox>
            ) : null}
            <Checkbox checked={concOk} onChange={setConcOk}>
              I have confirmed the syringe contains <strong>{show(amount)} {amountUnit} in {show(volume)} mL</strong> ({show(r.concentrationPerMl)} {amountUnit}/mL).
            </Checkbox>
          </div>
        ) : null}
      </Panel>

      {r.ok && !confirmed ? <Note tone="warn">Confirm the {perKg ? "weight and " : ""}concentration above to see the result.</Note> : null}

      {showResult ? (
        <Panel title="Result" icon={ShieldCheck} aside={r.blocked ? <Pill tone="alert">Outside hard limit</Pill> : <Pill tone="warn">Verify before use</Pill>}>
          <Grid cols={2}>
            {mode === "dose-to-rate" ? (
              <Result big tone={r.blocked ? "alert" : "info"} label="Pump rate" value={show(r.rateMlH)} unit="mL/h" sub={`for ${show(r.dose)} ${doseUnit}`} />
            ) : (
              <Result big tone={r.blocked ? "alert" : "info"} label="Dose delivered" value={show(r.dose)} unit={doseUnit} sub={`at ${show(r.rateMlH)} mL/h`} />
            )}
            <Result label="Drug per hour" value={show(r.amountPerHour)} unit={`${amountUnit}/h`} />
            <Result label="Syringe empty in" value={show(r.hoursToEmpty)} unit="h" sub={r.hoursToEmpty !== null ? `about ${new Date(Date.now() + r.hoursToEmpty * 3_600_000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} if started now` : undefined} />
            {r.totalFluidMl !== null ? (
              <Result label={`Over ${show(duration)} h`} value={`${show(r.totalFluidMl)} mL`} sub={`${show(r.totalDrug)} ${amountUnit} of drug; ${show(r.remainingAfterMl)} mL left`} tone={r.remainingAfterMl !== null && r.remainingAfterMl < 0 ? "warn" : "neutral"} />
            ) : null}
          </Grid>
          <Warnings items={warnings} />
          {r.equivalents.length ? (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">The same dose in other units</h3>
              <div className="flex flex-wrap gap-1.5">
                {r.equivalents.map((e) => (
                  <span key={e.unit} className="rounded border bg-muted/50 px-2 py-1 font-mono text-xs tabular-nums">
                    {show(e.value)} {e.unit}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <InputsTable
            rows={[
              ["Drug", drug || "—"],
              ["Patient group", POPULATIONS.find((p) => p.value === population)!.label],
              ["Drug in syringe", `${show(amount)} ${amountUnit}`],
              ["Volume", `${show(volume)} mL`],
              ["Weight", perKg ? `${show(weight)} kg` : "not used"],
              [mode === "dose-to-rate" ? "Dose" : "Rate", mode === "dose-to-rate" ? `${show(dose)} ${doseUnit}` : `${show(rate)} mL/h`],
            ]}
          />
          <Steps formula={r.formula} steps={r.steps} />
        </Panel>
      ) : null}

      {showResult ? (
        <Panel title="Independent double check" icon={CheckCircle2}>
          <p className="text-sm text-muted-foreground">
            A second clinician works out the rate on their own, without looking at the result above, and enters it here.
          </p>
          <Grid cols={3}>
            <TextField label="Prepared by (initials)" value={preparer} onChange={setPreparer} />
            <TextField label="Checked by (initials)" value={checker} onChange={setChecker} />
            <NumberField label="Checker's rate" unit="mL/h" value={checkerRate} onChange={setCheckerRate} className="col-span-2 sm:col-span-1" />
          </Grid>
          {match === true ? (
            <Note tone="ok">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> The two calculations agree.
              </span>
            </Note>
          ) : match === false ? (
            <Note tone="alert">
              <span className="flex items-center gap-1.5 font-semibold">
                <XCircle className="h-4 w-4" aria-hidden="true" /> The calculations do not agree ({show(checkerRate)} vs {show(resultRate)} mL/h). Do not start: recheck together.
              </span>
            </Note>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={record}>
              Record in the audit log
            </Button>
            {logged ? <span className="text-xs text-muted-foreground">Recorded at {logged}</span> : null}
          </div>
        </Panel>
      ) : null}

      <SourceBox meta={CONTENT.infusion} />
    </div>
  );
}

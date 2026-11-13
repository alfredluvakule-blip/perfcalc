import { ChevronDown, ChevronUp, RotateCcw, UserRound } from "lucide-react";
import { useCase } from "@/context/CaseContext";
import { fmt } from "@/lib/perfusion";
import { cn } from "@/lib/utils";
import { Button, NumberField, Pill, Segmented, SelectField } from "./shared";

/** One-line summary that stays on screen. Tapping it opens the patient editor. */
export function PatientSummary({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { state: s, derived: d } = useCase();
  const chips: [string, string][] = [
    ["Wt", s.weight !== null ? `${fmt(s.weight)} kg` : "—"],
    ["Ht", s.height !== null ? `${fmt(s.height)} cm` : "—"],
    ["BSA", d.bsa !== null ? `${fmt(d.bsa, 2)} m²` : "—"],
    ["EBV", d.ebv !== null ? `${fmt(d.ebv, 0)} mL` : "—"],
    ["Hct", s.hct !== null ? `${fmt(s.hct)}%` : "—"],
    ["Flow", d.flow !== null ? `${fmt(d.flow, 2)} L/min` : "—"],
  ];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-card px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="shrink-0 text-xs font-semibold">{s.group === "adult" ? "Adult" : "Paediatric"}</span>
      {/* On a phone the figures drop to their own line under the label. */}
      <span className="order-last flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-0.5 sm:order-none sm:flex-1 sm:basis-0">
        {chips.map(([k, v]) => (
          <span key={k} className="shrink-0 whitespace-nowrap text-xs tabular-nums">
            <span className="text-muted-foreground">{k} </span>
            <span className="font-semibold">{v}</span>
          </span>
        ))}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {s.example ? <Pill tone="warn">Example</Pill> : null}
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>{open ? "Hide" : "Edit patient"}</span>
          {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </span>
      </span>
    </button>
  );
}

/** The patient is entered here once; every tab reads from it. */
export function PatientEditor({ className }: { className?: string }) {
  const { state: s, derived: d, setPatient, setGroup, set, loadExample, clearPatient } = useCase();

  const mismatch =
    s.weight !== null && ((s.group === "adult" && s.weight < 30) || (s.group === "paed" && s.weight > 50))
      ? s.group === "adult"
        ? "Weight is under 30 kg. Switch to Paediatric for weight-based flow and paediatric targets."
        : "Weight is over 50 kg. Switch to Adult if this patient should use adult targets."
      : null;

  return (
    <section className={cn("rounded-lg border bg-card p-4 shadow-sm", className)} aria-label="Patient details">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Segmented
          label="Patient"
          value={s.group}
          onChange={setGroup}
          options={[
            { value: "adult", label: "Adult" },
            { value: "paed", label: "Paediatric" },
          ]}
          className="col-span-2"
        />
        <NumberField label="Weight" unit="kg" value={s.weight} onChange={(v) => setPatient({ weight: v })} />
        <NumberField label="Height" unit="cm" value={s.height} onChange={(v) => setPatient({ height: v })} />
        <div className="flex items-start gap-1.5">
          <NumberField label="Age" value={s.age} onChange={(v) => setPatient({ age: v })} className="flex-1" />
          <SelectField
            label="Unit"
            value={s.ageUnit}
            onChange={(v) => setPatient({ ageUnit: v })}
            options={[
              { value: "years", label: "yr" },
              { value: "months", label: "mo" },
            ]}
            className="w-[4.25rem]"
          />
        </div>
        <Segmented
          label="Sex"
          value={s.sex}
          onChange={(v) => setPatient({ sex: v })}
          options={[
            { value: "M", label: "M" },
            { value: "F", label: "F" },
          ]}
        />
        <NumberField
          label="Haematocrit"
          unit="%"
          value={s.hct}
          onChange={(v) => setPatient({ hct: v })}
          hint={s.hct !== null ? `Hb about ${fmt(s.hct / 3, 1)} g/dL` : "Hb × 3"}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <SelectField
          label="BSA formula"
          value={s.bsaFormula}
          onChange={(v) => set({ bsaFormula: v })}
          options={[
            { value: "mosteller", label: "Mosteller" },
            { value: "dubois", label: "DuBois" },
            { value: "haycock", label: "Haycock (infants)" },
          ]}
          className="col-span-2"
        />
        <NumberField
          label="Blood volume"
          unit="mL/kg"
          value={s.ebvPerKg}
          onChange={(v) => set({ ebvPerKg: v })}
          placeholder={d.ebvPerKg !== null ? `${d.ebvPerKg} auto` : "auto"}
          hint="Leave empty for the usual value by weight"
          className="col-span-2 md:col-span-1 lg:col-span-2"
        />
        <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-4 lg:col-span-3 lg:justify-end">
          <Button variant="ghost" onClick={() => loadExample("adult")}>
            Adult example
          </Button>
          <Button variant="ghost" onClick={() => loadExample("paed")}>
            Paediatric example
          </Button>
          <Button icon={RotateCcw} onClick={clearPatient}>
            New patient
          </Button>
        </div>
      </div>

      {mismatch ? <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">{mismatch}</p> : null}
      {s.example ? (
        <p className="mt-3 text-xs text-muted-foreground">
          These are example values. Type the real patient's details, or press New patient to clear them. Only these numbers are kept on this
          device; no names are stored.
        </p>
      ) : null}
    </section>
  );
}
